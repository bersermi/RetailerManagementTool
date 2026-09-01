# `packages/money`

The TypeScript half of the money path, and the case table both suites read.

ADR-035 §2.6: *"The number shown to the customer is computed on the device,
always, and never waits for the network."* That is a deliberate concession
against principle 1 — unit conversion, tax split and line total exist twice,
once in PL/pgSQL and once here. **The concession is bounded by making drift a
test failure**, and `cases.json` is how.

| Path | What it is |
|------|-----------|
| `cases.json` | The case table. ADR-035 §2.10's *"one data file, read by both the pgTAP suite and Vitest"* |
| `src/money.ts` | The arithmetic. Runs on the device; no `node:` imports, no filesystem |
| `src/cases.ts` | The reader for `cases.json`. Takes text, validates every field |
| `test/cases.test.ts` | The Vitest suite |

Owned by the schema owner, not by `app/**` (ADR-035 §2.10, team shape). It is
not UI, it decides what a customer is charged, and it is half of the only
duplicated logic in the system.

## The two things JavaScript gets wrong here

**`Math.round` is half-up toward +∞. §2.5 rule 6 is half-up away from zero.**
They agree on every positive number, so the only cases that can catch the
difference are negative lines whose `unit_price × qty` lands on a half centavo.
There are exactly two — **M8** and **B6** — and `cases.json` names them under
`discriminators`. Delete either and the suite turns red rather than quietly
losing its teeth.

**IEEE754 loses ties.** `0.00026 × 250 × 100` is `6.499999999999999`, so 250 g
at $0.26 the kilo is 6 centavos in doubles and 7 in exact arithmetic. Nothing
here uses a fraction: every value is an integer in its column's own scale, and
every rounding is one integer division.

⚠️ **But no case in `cases.json` can fail for a float.** The four boundaries it
carries — 0.365, 6.465 and their reversals — are ties a double happens to hold
exactly. Rule 1 is defended by `07` F5 over the schema, by the integers in
`money.ts`, and by one direct measurement in the suite. It is *not* defended by
the case table, and the suite says so out loud.

## Scales

Every value is an integer in the scale of the column that stores it.

| Value | Unit | Column | Example |
|-------|------|--------|---------|
| money | centavos | `numeric(12,2)` | `$11.60` → `1160` |
| unit price | micro-pesos per base | `numeric(14,6)` | `$0.073000` → `73000` |
| quantity | thousandths of a base unit | `numeric(14,3)` | `250.000 g` → `250000` |
| tax rate | basis points | `numeric(5,4)` | `0.1600` → `1600` |

**Every number in `cases.json` is a decimal string, not a JSON number**, because
a JSON number is a double — a bare `0.073` there would put a float in the money
path at parse time, before any code ran.

## Running it

```sh
npm ci
npm run test --workspace @tienda/money
npm run typecheck --workspace @tienda/money
```

CI is [`.github/workflows/money.yml`](../../.github/workflows/money.yml), on Node
22 and 24. Per ADR-035 §9 the local pass is not the bar — the green CI run is.
