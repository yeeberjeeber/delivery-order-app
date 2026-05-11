-- =============================================================================
-- D.O. Tracker — Row-Level Security Policies
-- Run AFTER schema.sql in the Supabase Dashboard → SQL Editor
-- =============================================================================

-- Helper: get the current user's role from profiles without causing recursion
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ─── PROFILES ─────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Users can read their own profile; supervisors/finance/admin can read all
create policy "profiles: own or privileged read"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.current_user_role() in ('supervisor', 'finance', 'admin')
  );

-- Users can update their own profile only
create policy "profiles: own update"
  on public.profiles for update
  using (id = auth.uid());

-- Only admin can insert profiles (normal users go via the trigger)
create policy "profiles: admin insert"
  on public.profiles for insert
  with check (public.current_user_role() = 'admin');

-- Only admin can deactivate / delete
create policy "profiles: admin delete"
  on public.profiles for delete
  using (public.current_user_role() = 'admin');

-- ─── VEHICLES ─────────────────────────────────────────────────────────────────

alter table public.vehicles enable row level security;

create policy "vehicles: all authenticated read"
  on public.vehicles for select
  using (auth.uid() is not null);

create policy "vehicles: admin write"
  on public.vehicles for insert
  with check (public.current_user_role() = 'admin');

create policy "vehicles: admin update"
  on public.vehicles for update
  using (public.current_user_role() = 'admin');

create policy "vehicles: admin delete"
  on public.vehicles for delete
  using (public.current_user_role() = 'admin');

-- ─── SUPPLIERS ────────────────────────────────────────────────────────────────

alter table public.suppliers enable row level security;

create policy "suppliers: all authenticated read"
  on public.suppliers for select
  using (auth.uid() is not null);

create policy "suppliers: admin write"
  on public.suppliers for insert
  with check (public.current_user_role() = 'admin');

create policy "suppliers: admin update"
  on public.suppliers for update
  using (public.current_user_role() = 'admin');

create policy "suppliers: admin delete"
  on public.suppliers for delete
  using (public.current_user_role() = 'admin');

-- ─── SUPPLIER MATERIAL PRICES ─────────────────────────────────────────────────

alter table public.supplier_material_prices enable row level security;

create policy "supplier_material_prices: all authenticated read"
  on public.supplier_material_prices for select
  using (auth.uid() is not null);

create policy "supplier_material_prices: admin write"
  on public.supplier_material_prices for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────

alter table public.projects enable row level security;

create policy "projects: all authenticated read"
  on public.projects for select
  using (auth.uid() is not null);

create policy "projects: admin write"
  on public.projects for insert
  with check (public.current_user_role() = 'admin');

create policy "projects: admin update"
  on public.projects for update
  using (public.current_user_role() = 'admin');

create policy "projects: admin delete"
  on public.projects for delete
  using (public.current_user_role() = 'admin');

-- ─── DRIVER VEHICLE ASSIGNMENTS ───────────────────────────────────────────────

alter table public.driver_vehicle_assignments enable row level security;

-- Drivers see their own assignments; privileged roles see all
create policy "dva: driver sees own, privileged sees all"
  on public.driver_vehicle_assignments for select
  using (
    driver_id = auth.uid()
    or public.current_user_role() in ('supervisor', 'finance', 'admin')
  );

create policy "dva: admin write"
  on public.driver_vehicle_assignments for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ─── DELIVERY ORDERS ──────────────────────────────────────────────────────────

alter table public.delivery_orders enable row level security;

-- Drivers see only their own DOs; supervisors/finance/admin see all
create policy "delivery_orders: driver sees own"
  on public.delivery_orders for select
  using (
    driver_id = auth.uid()
    or public.current_user_role() in ('supervisor', 'finance', 'admin')
  );

-- Drivers can submit (insert) new DOs
create policy "delivery_orders: driver insert"
  on public.delivery_orders for insert
  with check (
    driver_id = auth.uid()
    and public.current_user_role() = 'driver'
  );

-- Drivers can update their own pending DOs; supervisors can update any
create policy "delivery_orders: driver update own pending"
  on public.delivery_orders for update
  using (
    (driver_id = auth.uid() and status = 'pending')
    or public.current_user_role() in ('supervisor', 'admin')
  );

-- Only admin can hard-delete (normal flow uses status changes)
create policy "delivery_orders: admin delete"
  on public.delivery_orders for delete
  using (public.current_user_role() = 'admin');

-- ─── DELIVERY ORDER FLAGS ─────────────────────────────────────────────────────

alter table public.delivery_order_flags enable row level security;

create policy "flags: supervisor+ read"
  on public.delivery_order_flags for select
  using (public.current_user_role() in ('supervisor', 'finance', 'admin'));

create policy "flags: supervisor insert"
  on public.delivery_order_flags for insert
  with check (
    flagged_by = auth.uid()
    and public.current_user_role() in ('supervisor', 'admin')
  );

-- Flags are immutable once created (admin only for corrections)
create policy "flags: admin delete"
  on public.delivery_order_flags for delete
  using (public.current_user_role() = 'admin');

-- ─── SUPPLIER INVOICES ────────────────────────────────────────────────────────

alter table public.supplier_invoices enable row level security;

create policy "invoices: finance+ read"
  on public.supplier_invoices for select
  using (public.current_user_role() in ('finance', 'admin'));

create policy "invoices: finance insert"
  on public.supplier_invoices for insert
  with check (
    uploaded_by = auth.uid()
    and public.current_user_role() in ('finance', 'admin')
  );

create policy "invoices: finance update"
  on public.supplier_invoices for update
  using (public.current_user_role() in ('finance', 'admin'));

create policy "invoices: admin delete"
  on public.supplier_invoices for delete
  using (public.current_user_role() = 'admin');

-- ─── INVOICE LINE ITEMS ───────────────────────────────────────────────────────

alter table public.invoice_line_items enable row level security;

create policy "line_items: finance+ read"
  on public.invoice_line_items for select
  using (public.current_user_role() in ('finance', 'admin'));

create policy "line_items: finance write"
  on public.invoice_line_items for all
  using (public.current_user_role() in ('finance', 'admin'))
  with check (public.current_user_role() in ('finance', 'admin'));

-- ─── AUDIT LOG ────────────────────────────────────────────────────────────────

alter table public.audit_log enable row level security;

-- Only finance and admin can query the audit log
create policy "audit_log: finance+ read"
  on public.audit_log for select
  using (public.current_user_role() in ('finance', 'admin'));

-- Any authenticated user can write audit entries (inserts only; updates/deletes
-- are blocked at the trigger level, not RLS)
create policy "audit_log: authenticated insert"
  on public.audit_log for insert
  with check (auth.uid() is not null);
