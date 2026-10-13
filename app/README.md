# `@tienda/app` — the Expo client

**`app/**` is the juniors' side of the seam** (ADR-035 §2.10):
screens, components, navigation. The money path is deliberately *not* here — it lives
in `@tienda/money`, owned by the schema owner, for the reason that section gives.

**Read [`docs/CONVENTIONS.md`](../docs/CONVENTIONS.md) before adding a file here.**
Its rules — most of them read by `app.yml` on every pull request — say where a file
goes, how it imports, where the words live, why no number on a screen is a
literal. It describes this directory as it is, not as it should be.

**The screens are built.** Each was specified in the plan's step 5 and traced to the
question in the 2026-09-07 interview that produced it; that step is closed and its
record is in `docs/plan/archive/steps-4.6-to-7.md`. What the app does today is in
`docs/HANDBOOK.md`. `src/scaffolding/Pendiente.tsx` is a leftover of the first shell:
nothing imports it, and the next task that touches `app/` may delete it.

| | |
|---|---|
| Typecheck | `npm run typecheck --workspace @tienda/app` |
| Test | `npm run test --workspace @tienda/app` |
| Run it | `npm run ios` / `npm run android` from `app/` |
| CI | `.github/workflows/app.yml`, on a `paths:` filter naming `app/**` |

⚠️ **Tests here are narrow by rule, not by neglect** (ADR-035 §2.10/§2.11, amended
2026-09-07). A unit test belongs here where it pins a **value** a customer sees or the
ledger stores — the money formatter, unit conversion, the outbox state machine. It does
not belong over rendering, navigation or layout. `vitest.config.ts` collects `test/**`
only, so that boundary is structural rather than remembered.

⚠️ **Platforms are `ios` and `android`** (C1.1 — the pilot is an iPhone 11, an iPhone 15,
an Oppo and a Samsung, on their owners' own devices). Web is not a target and its config
was removed rather than left to rot.
