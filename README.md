# Tienda — retail management tool

Multi-tenant retail operations for small Mexican retailers: buying, selling,
catalog, providers, waste and reports, over an append-only inventory ledger.

**Stack:** PostgreSQL via Supabase, React Native (Expo) client. MXN and IVA;
LFPDPPP rather than GDPR; CFDI out of scope.

**Status:** database layer. The schema foundation is applied and verified; the
client does not exist yet. See [`docs/PLAN.md`](docs/PLAN.md) for the current step.

## Where things are

| Path | What |
|------|------|
| [`docs/PLAN.md`](docs/PLAN.md) | Build plan and current position |
| [`docs/adr/ADR-035`](docs/adr/ADR-035-target-architecture-postgres-react-native.md) | The architecture. Authoritative — where anything disagrees, this wins |
| [`supabase/`](supabase/) | Migrations, schema conventions, verification status |
| [`.github/workflows/db.yml`](.github/workflows/db.yml) | Applies every migration from scratch on any PR touching `supabase/**` |
| [`archive/power-platform/`](archive/power-platform/README.md) | Superseded Canvas/Dataverse era — history only |

## Running the database locally

```bash
brew install orbstack supabase/tap/supabase   # open OrbStack once to finish setup
supabase start
supabase db reset                              # applies migrations from scratch
```

`supabase start -x realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`
brings up only what a migration reset needs.

## The rule this project is organised around

**Every schema claim must be traceable to a migration that CI has applied.**

The previous incarnation of this project — a Power Apps Canvas App on Dataverse —
accumulated accepted architecture decisions describing tables that were never
created and columns that were never added. One of seven modules shipped, and a
review found it violating four of its own ADRs. That gap between recorded decisions
and deployed reality is the failure this repo is structured to prevent
(ADR-035 §1, §9).

A merged file is not evidence. A green CI run against a real Postgres is.
