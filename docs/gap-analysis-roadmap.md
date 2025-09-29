# RistoManager Pro – Gap Analysis & Implementation Roadmap

## 1. Current State Snapshot
- **Architecture:** Single-page React (Vite, TypeScript) with a global context fetching data from an in-memory mock `apiService`. No backend, auth, or persistence.
- **Data Model:** Reservations, tables, waitlist entries, menu items, sales, customers, and KPIs typed in `types.ts`. Relationships are implicit; no tenant/outlet separation beyond `locationId` strings.
- **Modules Delivered:**
  - `Dashboard`: timeline of today reservations, waitlist control, quick KPIs, table status summary.
  - `Reservations`: CRUD for bookings (local state), filters by status/date, status updates, add modal.
  - `TableManagement`: drag/resizable tables, multi-select, context menu, assign reservations, seat walk-ins.
  - `Analytics`: day KPIs, sales trend (mock), menu engineering quadrants.
  - `CRM`: derived customer profiles (visits/spend) from mock reservations + sales.
  - `Settings`: edit outlet name/capacity/open-close (per mock location).
  - `Notifications`: transient toast queue from context operations.
- **Operational Gaps Observed:**
  - Static mock data (no API, no persistence, no auth) limits real workflows.
  - No notion of deposits, experiences, pacing, policies, or automated comms.
  - Analytics confined to same-day metrics with mock sales; no OLAP or multi-outlet aggregates.
  - Settings limited to a single outlet-level form; no tenant/global configuration.
  - No API catalog, webhook, or integration touchpoints; no DevOps/testing scaffolding.

## 2. Gap Analysis vs Target Platform
| Area | Target Capabilities | Current Coverage | Key Gaps / Work Needed |
| --- | --- | --- | --- |
| **Platform & Data** | Multi-tenant backend (Postgres + OLAP), CDC to analytics, modular services | Front-end only mock context | Build backend services, real DB schema, event bus, data pipelines |
| **Authentication & RBAC** | SSO/OIDC, MFA, role matrices | None | Identity service, session mgmt, RBAC enforcement |
| **Reservations & Waitlist** | Auto-seating, pacing engine, policy-driven statuses, ETA accuracy | Manual timeline, simple seat-from-waitlist | Implement availability engine, pacing, seat planner, waitlist ETA calc, SLA metrics |
| **Booking Channels** | Public widget, Google/Instagram connectors, channel tagging | No public widget, only internal UI | Expose booking widget SDK, channel routing, connector adapters |
| **Payments & Policies** | Deposits/holds/prepaid with PSD2, penalty engine | No payments | Integrate PSPs, policy matrix, capture/refund flows, audit |
| **Experiences & Inventory** | Ticketed events, variable pricing, gift cards | None | Experience catalog, inventory mgmt, checkout flows |
| **CRM & Marketing** | Unified guest profile, segmentation, journeys, consent mgmt | Basic history + totals | Build customer service, consents, automations, messaging providers |
| **Analytics & Marginality** | RevPASH, occupancy, menu engineering, contribution margins, exports, API | Limited daily KPIs, mock sales chart | Define OLAP model, KPI layer, reporting jobs, exports |
| **Integrations** | POS, accounting, messaging, payment, webhooks | None | Integration hub, contract tests, sync jobs, webhook delivery |
| **Settings & Admin** | Tenant/outlet/service policies, pacing, deposits, templates, localization | Capacity/open-close only | Full settings hierarchy, policy editors, localization, templates |
| **Security & Compliance** | GDPR tooling, retention, audit logs, DPIA, SCA | None | Data governance workflows, audit trail service, privacy tooling |
| **DevOps & Quality** | CI/CD, lint/test, observability, infra as code | No scripts/tests | Establish CI, testing strategy, monitoring, SLO instrumentation |

## 3. Implementation Roadmap
### Phase 0 – Foundations (Infrastructure & Data)
- Stand up backend (NestJS/Node) with PostgreSQL, Redis, and message bus scaffolding.
- Implement tenant/outlet schemas, reservation core tables, audit/event logging.
- Expose auth (OIDC + MFA) and RBAC skeleton; seed roles.
- Deliver REST/GraphQL baseline for reservations, waitlist, tables, customers.
- Introduce CI (lint/typecheck/unit), containerisation, environments, and basic monitoring.

### Phase 1 – Core Operations
- Build availability + auto-seating engine with pacing + policy evaluation.
- Ship booking widget SDK, internal UI wiring to real API, and channel tagging.
- Add waitlist ETA service, seat-from-waitlist flows, reminders.
- Implement payments service (Stripe/Adyen) with deposits/holds/prepaid, penalty rules, audit trail.
- Extend settings for policies (cancellations, deposits, pacing) at outlet/service level.

### Phase 2 – Revenue & Guest Excellence
- Launch experiences/ticketing module (inventory, variable pricing, gift cards).
- Expand CRM with unified guest profile, segmentation, consents, tags, VIP logic.
- Integrate messaging providers (WhatsApp, SMS, email) and automation journeys.
- Deliver analytics pipeline (CDC -> ClickHouse/BigQuery, dbt models) with RevPASH, channel mix, menu engineering, exports, API access.
- Provide POS integration adapters (Lightspeed/Toast) and accounting exports.

### Phase 3 – Advanced Intelligence & Ecosystem
- Add forecasting (demand, staffing) and no-show risk scoring (ML service).
- Complete webhook platform and public developer portal.
- Implement data retention tooling, privacy self-service (export/delete), DPIA compliance.
- Introduce loyalty, vouchers, and partner marketplace connectors.
- Mature SRE posture: SLO dashboards, chaos testing, DR drills, multi-region failover.

## 4. Immediate Next Actions
1. Approve foundational backend architecture (services, data model, infra stack).
2. Define detailed backlog for Phase 0 (stories, acceptance criteria, dependencies).
3. Align on payment providers and messaging partners for Phase 1.
4. Draft API contract (OpenAPI + webhook spec) for reservations/waitlist/payments.
5. Set up CI pipeline (lint, typecheck, build) to guard refactors while transitioning from mocks.

## 5. Technical Considerations & Open Questions
- Data migration: need plan to move from mocks to persistent seed data per outlet.
- Multi-brand support: confirm UI theming/white-label requirements for widget.
- Regulatory scope: clarify jurisdictions (EU only?) to size PSD2/GDPR effort.
- Integration priorities: rank POS/accounting providers for early adapters.
- Messaging compliance: verify WhatsApp template approval flow and opt-in capture.
