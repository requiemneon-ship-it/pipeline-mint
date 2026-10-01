# PipelineMint

[![CI](https://github.com/requiemneon-ship-it/pipeline-mint/actions/workflows/ci.yml/badge.svg)](https://github.com/requiemneon-ship-it/pipeline-mint/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![License](https://img.shields.io/badge/license-MIT-green)

**EN** — A lead-pipeline dashboard for small sales teams: leads are scored, grouped by stage and summarized into a daily "focus" brief. Built with Next.js (App Router) and strict TypeScript.
**RU** — Дашборд воронки продаж для небольших команд: лиды оцениваются скорингом, раскладываются по стадиям, а система формирует ежедневную сводку «на чём сфокусироваться».

> Portfolio project. Milestone 1 runs on in-memory seed data; persistence, auth and integrations are on the roadmap and are **not** implemented yet.

## What works today

| Area | Status |
| --- | --- |
| Landing page + responsive dashboard (KPI cards, kanban by stage) | Implemented |
| Lead scoring (0–100: deal size, source, stage) | Implemented, unit-tested |
| Rule-based "sales brief" (deterministic, no LLM calls) | Implemented, unit-tested |
| `GET/POST /api/leads` with input validation | Implemented (POST is non-persistent) |
| OpenAPI 3.1 contract (`docs/openapi.yaml`) | Documented |
| PostgreSQL / Supabase schema with tenant-scoped RLS (`supabase/migrations`) | Draft, not yet executed against a database |
| GitHub Actions CI: typecheck, tests, build | Configured |

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000  (dashboard at /dashboard)
npm test           # unit tests (node:test)
npm run typecheck
npm run build
```

## API

```bash
curl http://localhost:3000/api/leads

curl -X POST http://localhost:3000/api/leads \
  -H 'content-type: application/json' \
  -d '{"name":"Alex Morgan","company":"Northstar","value":7500,"source":"Website"}'
# 201 -> {"data":{"id":"l_…","stage":"new","score":…,"nextAction":"Qualify the lead within 24h",…}}
```

Invalid input returns `400` with a list of all validation errors.

## Project structure

```
src/lib/leads.ts            domain logic: scoring, validation, stats, brief (pure, no framework imports)
src/app/api/leads/route.ts  REST handler
src/app/dashboard/page.tsx  dashboard UI (server component)
tests/leads.test.mjs        unit tests for the domain layer
supabase/migrations/        draft multi-tenant schema + RLS policies
docs/                       architecture, data model, OpenAPI
```

Domain logic is kept free of framework code so it can be tested without a browser or server and reused when a real database is added.

## Roadmap

1. Persistence & identity — apply the Supabase schema, auth, RBAC.
2. Lead capture — public form, signed webhooks, Telegram connector.
3. AI layer — LLM adapter behind the existing `salesBrief` signature, queue-backed enrichment.
4. Hardening — audit log, rate limiting, idempotency keys, E2E tests, deployment.

## Notes on how this was built

I use AI assistants as part of my workflow. The architecture decisions, scope and verification (tests, type checks, production build, manual API checks) are mine to explain and extend — see `docs/architecture.md`.

## License

MIT
