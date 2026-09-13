# `@tienda/app` — the Expo client

The fourth workspace. **`app/**` is the juniors' side of the seam** (ADR-035 §2.10):
screens, components, navigation. The money path is deliberately *not* here — it lives
in `@tienda/money`, owned by the schema owner, for the reason that section gives.

**Read [`docs/CONVENTIONS.md`](../docs/CONVENTIONS.md) before adding a file here.**
Nine rules, seven of them read by `app.yml` on every pull request — where a file
goes, how it imports, where the words live, why no number on a screen is a
literal. It describes this directory as it is, not as it should be.

**Read `docs/PLAN.md` step 5 before adding anything.** Every screen in this app is
specified there and traced to the question in the 2026-09-07 interview that produced
it. ⚠️ **None of them has been built yet.** What `src/app/` holds today is the shell
`5a-i`–`5a-iii` shipped — the sign-in screen, the tab bar, and three placeholder
routes that exist so the shell is a real shell. `src/scaffolding/Pendiente.tsx` is
what stands behind them, and the task that builds each screen deletes it.

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
