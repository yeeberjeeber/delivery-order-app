-- =============================================================================
-- D.O. Tracker — Full Database Schema
-- Run this in the Supabase Dashboard → SQL Editor
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- Auto-update updated_at on any table that has the column
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- Extends auth.users with role and display info.
-- Created automatically via a trigger when a user signs up.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('driver', 'supervisor', 'finance', 'admin')),
  full_name   text not null default '',
  phone       text,
  email       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'driver'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.phone,
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── VEHICLES ─────────────────────────────────────────────────────────────────

create table public.vehicles (
  id            uuid primary key default uuid_generate_v4(),
  plate_number  text not null unique,
  vehicle_type  text,
  status        text not null default 'active' check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ─── SUPPLIERS ────────────────────────────────────────────────────────────────

create table public.suppliers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- Unit prices per supplier per material type
create table public.supplier_material_prices (
  id            uuid primary key default uuid_generate_v4(),
  supplier_id   uuid not null references public.suppliers(id) on delete cascade,
  material_type text not null check (material_type in ('TON', 'TIN', 'DRUM')),
  unit_price    numeric(10,2),
  unique (supplier_id, material_type)
);

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────

create table public.projects (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  name        text not null,
  manager     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ─── DRIVER ↔ VEHICLE ASSIGNMENTS ────────────────────────────────────────────

create table public.driver_vehicle_assignments (
  id          uuid primary key default uuid_generate_v4(),
  driver_id   uuid not null references public.profiles(id) on delete cascade,
  vehicle_id  uuid not null references public.vehicles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (driver_id, vehicle_id)
);

create index on public.driver_vehicle_assignments (driver_id);

-- ─── DELIVERY ORDERS ──────────────────────────────────────────────────────────

create table public.delivery_orders (
  id                       uuid primary key default uuid_generate_v4(),
  do_number                text not null,
  vehicle_id               uuid not null references public.vehicles(id),
  driver_id                uuid not null references public.profiles(id),
  supplier_id              uuid not null references public.suppliers(id),
  project_id               uuid references public.projects(id),
  supervisor_id            uuid references public.profiles(id),
  material_type            text not null check (material_type in ('TON', 'TIN', 'DRUM')),
  quantity                 numeric(10,3) not null,
  unit_price               numeric(10,2),
  -- amount is auto-computed; null when unit_price is null
  amount                   numeric(10,2) generated always as (
                             case when unit_price is not null then quantity * unit_price end
                           ) stored,
  location                 text,
  remarks                  text,
  photo_url                text,
  photo_public_id          text,     -- Cloudinary public ID for deletion/transforms
  gps_lat                  numeric(10,7),
  gps_lng                  numeric(10,7),
  status                   text not null default 'pending'
                             check (status in ('pending', 'verified', 'flagged')),
  submitted_at             timestamptz not null default now(),
  verified_at              timestamptz,
  verified_by              uuid references public.profiles(id),
  is_duplicate_override    boolean not null default false,
  duplicate_override_reason text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger delivery_orders_updated_at
  before update on public.delivery_orders
  for each row execute function public.set_updated_at();

create index on public.delivery_orders (driver_id);
create index on public.delivery_orders (status);
create index on public.delivery_orders (submitted_at desc);
create index on public.delivery_orders (supplier_id);
create index on public.delivery_orders (do_number);

-- ─── DELIVERY ORDER FLAGS ─────────────────────────────────────────────────────

create table public.delivery_order_flags (
  id                 uuid primary key default uuid_generate_v4(),
  delivery_order_id  uuid not null references public.delivery_orders(id) on delete cascade,
  flagged_by         uuid not null references public.profiles(id),
  reason             text not null check (reason in (
                       'missing_info', 'wrong_vehicle', 'duplicate',
                       'quantity_mismatch', 'other'
                     )),
  notes              text,
  created_at         timestamptz not null default now()
);

create index on public.delivery_order_flags (delivery_order_id);

-- ─── SUPPLIER INVOICES ────────────────────────────────────────────────────────

create table public.supplier_invoices (
  id              uuid primary key default uuid_generate_v4(),
  supplier_id     uuid not null references public.suppliers(id),
  invoice_number  text,
  invoice_date    date,
  invoice_month   date,   -- stored as first day of the month (e.g. 2026-03-01)
  pdf_url         text,
  pdf_public_id   text,
  total_amount    numeric(10,2),
  status          text not null default 'processing'
                    check (status in ('processing', 'matched', 'discrepancy')),
  uploaded_by     uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger supplier_invoices_updated_at
  before update on public.supplier_invoices
  for each row execute function public.set_updated_at();

-- ─── INVOICE LINE ITEMS ───────────────────────────────────────────────────────

create table public.invoice_line_items (
  id                  uuid primary key default uuid_generate_v4(),
  invoice_id          uuid not null references public.supplier_invoices(id) on delete cascade,
  do_number           text not null,
  quantity            numeric(10,3),
  unit_price          numeric(10,2),
  amount              numeric(10,2),
  matched_do_id       uuid references public.delivery_orders(id),
  match_status        text not null default 'unmatched'
                        check (match_status in ('matched', 'unmatched', 'qty_mismatch', 'price_mismatch')),
  discrepancy_notes   text
);

create index on public.invoice_line_items (invoice_id);
create index on public.invoice_line_items (matched_do_id);

-- ─── AUDIT LOG (immutable) ────────────────────────────────────────────────────

create table public.audit_log (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.profiles(id),
  action       text not null,   -- 'upload', 'verify', 'flag', 'export', 'login', ...
  entity_type  text,             -- 'delivery_order', 'invoice', 'profile', ...
  entity_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

-- Prevent any updates or deletes on audit_log
create or replace function public.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log records are immutable';
end;
$$;

create trigger audit_log_no_update
  before update on public.audit_log
  for each row execute function public.audit_log_immutable();

create trigger audit_log_no_delete
  before delete on public.audit_log
  for each row execute function public.audit_log_immutable();

create index on public.audit_log (user_id);
create index on public.audit_log (entity_id);
create index on public.audit_log (created_at desc);
