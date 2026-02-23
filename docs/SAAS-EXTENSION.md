# FitNova AI — SaaS extension outline

This document outlines how to extend the MVP for multi-tenant SaaS (M5 and beyond). No implementation is required for MVP.

## Tenant isolation

- Introduce a `tenants` table (e.g. `tenant_id` UUID, `name`, `plan`, `created_at`).
- Add `tenant_id` to `user_profile` (or keep a single-tenant MVP and add `tenant_id` only when scaling).
- RLS: extend policies to filter by `tenant_id` where applicable (e.g. `tenant_id = (SELECT tenant_id FROM user_profile WHERE user_id = auth.uid())`).
- Optional: subdomain or path per tenant (e.g. `acme.fitnova.ai` or `/t/acme`).

## Admin roles and admin UI blueprint

- Add `role` to `user_profile` or `auth.users` raw_user_meta: `user` (default), `admin`.
- Admin-only routes or UI: check `role === 'admin'` server-side; hide admin nav for non-admins.
- **Admin UI blueprint:** Dedicated layout or route (e.g. `/admin`) with: list of users or tenants, plan assignment, usage summary, and audit log viewer. Reuse existing design system (Concept 1) and restrict access by role.
- Audit: log admin actions (e.g. user edits, plan changes) in an `audit_log` table or external logger.

## Billing and plans

- Define plans (e.g. free, pro, team) and store `plan` on `user_profile` or a `subscriptions` table.
- Integrate a billing provider (Stripe, Paddle, etc.): webhooks to update `plan` and usage.
- Usage metrics: track API calls, storage, or active users per tenant for metering.

## Summary

- **Tenant isolation:** `tenants` + `tenant_id` on key tables; RLS by tenant.
- **Admin:** Role field; admin-only UI and routes; audit log.
- **Billing:** Plan field; Stripe (or other) webhooks; usage metrics.

Implement when moving from single-user/MVP to multi-tenant SaaS.
