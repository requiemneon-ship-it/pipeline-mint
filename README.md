# PipelineMint

**AI lead operations SaaS** built as a production-style portfolio project, not a tutorial CRUD.

PipelineMint centralizes incoming leads, qualification, pipeline stages, follow-up actions and AI-assisted sales context in one workspace.

## Current demo

Milestone 1 includes:
- Product landing page.
- Responsive sales dashboard.
- Demo KPI cards and AI sales brief.
- Multi-stage lead pipeline.
- `/api/leads` GET/POST demo endpoint.
- Seed data representing international + RU clients.
- Unit-test baseline and GitHub Actions CI.
- Architecture roadmap for PostgreSQL/Supabase, RBAC, AI and integrations.
- Initial PostgreSQL/Supabase migration with tenant-scoped RLS policies.
- OpenAPI 3.1 contract and documented data model.

## Product roadmap

1. **Foundation** — current demo shell and API contract.
2. **Persistence & identity** — PostgreSQL/Supabase, organizations, RLS, auth and RBAC.
3. **Automation & AI** — summaries, scoring, suggested replies, follow-up tasks and queues.
4. **Integrations** — public capture form, signed webhooks, Telegram connector and outbound events.
5. **Production hardening** — audit logs, rate limits, idempotency, secrets handling, E2E tests and deployment.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and use `/dashboard` for the product demo.

## API demo

```bash
curl http://localhost:3000/api/leads

curl -X POST http://localhost:3000/api/leads \
  -H 'content-type: application/json' \
  -d '{"name":"Alex Morgan","company":"Northstar","value":7500}'
```

The POST endpoint is intentionally non-persistent in milestone 1.

## Security

- No provider keys are committed.
- `.env.example` contains placeholders only.
- AI calls will be server-side only.
- Multi-tenant persistence will use organization-scoped RLS.

## Status

`v0.1.0` — portfolio-ready visual foundation, demo API, seed data and CI scaffold.
