@AGENTS.md
You are assisting with development of a production-capable SaaS platform for construction document workflows.

Core stack:

- Next.js App Router

- TypeScript

- Supabase

- PostgreSQL

- Tailwind CSS

- shadcn/ui

- React Hook Form

- Zod

- Vercel deployment

Architecture requirements:

- Mobile-first responsive design

- Multi-tenant ready architecture

- Role-based access control (driver, supervisor, finance, admin)

- Feature-based folder structure

- Clean separation between UI, business logic, and database logic

- Reusable service layer

- Server/client separation where appropriate

Coding standards:

- TypeScript only

- Prefer functional React components

- Use async/await consistently

- Use Zod for validation

- Avoid duplicated business logic

- Avoid hardcoded values

- Prefer composable components

- Use clear naming conventions

- Keep components small and reusable

Authentication:

- Supabase Auth

- Drivers use mobile-oriented authentication flows

- Supervisors/finance/admin use email flows

- Enforce authorization with Supabase RLS policies

Database:

- PostgreSQL via Supabase

- Multi-tenant aware schema design

- Use UUIDs

- Include created_at and updated_at fields

- Normalize relational data appropriately

Frontend:

- Use shadcn/ui components

- Use Tailwind utilities

- Prioritize mobile UX for drivers

- Build production-quality responsive layouts

Project goals:

- Fast operational workflows

- OCR-assisted document processing

- Delivery Order and invoice reconciliation

- Auditability and traceability

- Offline-capable mobile workflows in future phases

When generating code:

- Prefer production-ready patterns

- Explain architectural decisions when relevant

- Keep implementations modular and scalable

- Avoid unnecessary complexity