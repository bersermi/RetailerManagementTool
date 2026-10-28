# Tienda — retail management tool

Multi-tenant retail operations for small Mexican retailers: buying, selling,
catalog, providers, waste and reports, over an append-only inventory ledger.

**Stack:** PostgreSQL via Supabase, React Native (Expo) client. MXN and IVA;
LFPDPPP rather than GDPR; CFDI out of scope.

**Status:** an alpha. The app is named **Wera**; it runs on the owner's phones
against a hosted database, and every screen reads and writes real data. What it
does today is in [`docs/HANDBOOK.md`](docs/HANDBOOK.md), *What the app does today*.
See [`docs/PLAN.md`](docs/PLAN.md) for which piece is next; this file deliberately
does not name it, because a second copy of that claim is how it goes stale.

## Where things are

| Path | What |
|------|------|
| [`docs/PLAN.md`](docs/PLAN.md) | Build plan and current position |
| [`docs/adr/ADR-035`](docs/adr/ADR-035-target-architecture-postgres-react-native.md) | The architecture. Authoritative — where anything disagrees, this wins |
| [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) | How code in `app/` is written. Read before adding a file to the client |
| [`supabase/`](supabase/) | Migrations, schema conventions, verification status; and the one Edge Function, `functions/apple-revoke` |
| [`docs/HANDBOOK.md`](docs/HANDBOOK.md) | The file the owner reads: what the app does, what is on the phones, how to ship a fix |
| [`app/`](app/README.md) | The Expo client, `@tienda/app` |
| [`cocina/`](cocina/CLAUDE.md), [`itacate/`](itacate/CLAUDE.md) | The two sibling apps of the ecosystem (plan Step 10): Wera Cocina for fondas, `@tienda/cocina`, and Itacate for neighbours, `@tienda/itacate` — skeletons since `10.2a` |
| [`packages/money/`](packages/money/) | `@tienda/money`: the MXN and IVA arithmetic the app and the database are both held to |
| [`docs/runbooks/`](docs/runbooks/) | What the owner runs by hand: shipping a fix, the usage read, a password reset, a deletion |
| [`site/`](site/README.md) | The pages at tu-wera.com: the privacy notice, account deletion, support |
| [`store/`](store/README.md) | What is pasted into Google Play and the App Store |
| [`brand/`](brand/) | The mark |
| [`.github/workflows/db.yml`](.github/workflows/db.yml) | Applies every migration from scratch on any PR touching `supabase/**` |
| [`.github/workflows/app.yml`](.github/workflows/app.yml) | Typecheck, suite and conventions gate on any PR touching `app/**` |
| [`.github/workflows/cocina-itacate.yml`](.github/workflows/cocina-itacate.yml) | Typecheck and suite of each sibling app on any PR touching `cocina/**` or `itacate/**` |
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
