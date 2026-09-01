// ============================================================================
// THE PAIRED-ARITHMETIC SUITE — ADR-035 §2.10, row six. Plan task 3.6a.
//
// "packages/money/cases.json — ONE DATA FILE, read by both the pgTAP suite and
// Vitest, asserting equality to the centavo. Not two copies of the same
// expectations."
//
// ⚠️ THIS IS HALF OF THAT SENTENCE, AND THE PLAN SAYS SO. As of 3.6a this file
// is the FIRST reader; `supabase/pgtap/07_money_and_units.sql` still carries
// the hand-written fork the expectations were lifted from, by id. Moving 07
// onto this same file is task 3.6b, and until it lands the drift window is
// narrowed, not closed. A green here is not yet the §2.10 claim.
//
// ⚠️ THE ORDER OF THE BLOCKS BELOW IS DELIBERATE. M8 and B6 come first because
// they are the only two cases in the table that can fail for the reason this
// package exists (07 falsification S23: pointed at JavaScript's rounding, M8
// and B6 are the ONLY two of twenty that go red). A reader who stops after the
// first screen has read the part that matters.
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseCaseTable } from '../src/cases.js';
import {
  SCALE,
  divRoundHalfUpAwayFromZero,
  documentNetAtDocument,
  documentNetPerLine,
  formatDecimal,
  lineAnchorCentavos,
  netFromGross,
  packRoundTrips,
  packUnitPrice,
  parseDecimal,
  priceLine,
} from '../src/money.js';

const CASES_JSON = fileURLToPath(new URL('../cases.json', import.meta.url));
const raw = readFileSync(CASES_JSON, 'utf8');
const table = parseCaseTable(raw);

const byId = new Map(table.lines.map((line) => [line.id, line]));
const pesos = (centavos: number) => formatDecimal(centavos, SCALE.money);

// ---------------------------------------------------------------------------
// 1. THE DISCRIMINATORS — the two cases JavaScript gets wrong
// ---------------------------------------------------------------------------
describe('the discriminators — the only cases that can catch Math.round', () => {
  it('names them in cases.json, and both are present', () => {
    expect(table.discriminators.length).toBeGreaterThan(0);
    for (const id of table.discriminators) {
      expect(byId.get(id), `cases.json names ${id} as a discriminator but has no such line`)
        .toBeDefined();
    }
  });

  it('every named discriminator is a NEGATIVE line whose anchor lands on a half centavo', () => {
    for (const id of table.discriminators) {
      const line = byId.get(id)!;
      expect(line.qty * line.unitPrice, `${id} must be negative to discriminate anything`)
        .toBeLessThan(0);
      // scale 6 × scale 3 = scale 9; a half centavo is 5_000_000 at that scale.
      const remainder = Math.abs(line.unitPrice * line.qty) % 10_000_000;
      expect(remainder, `${id}'s anchor is not a tie, so it discriminates nothing`)
        .toBe(5_000_000);
    }
  });

  it('rounds them AWAY FROM ZERO, where Math.round rounds toward +infinity', () => {
    for (const id of table.discriminators) {
      const line = byId.get(id)!;
      const ours = lineAnchorCentavos(line.unitPrice, line.qty);
      const javascripts = Math.round((line.unitPrice * line.qty) / 10_000_000);
      expect(ours).toBe(javascripts - 1);
      expect(ours).toBeLessThan(javascripts);
    }
  });

  // The JavaScript-side twin of 07 falsification S23: pointed at the language's
  // own rounding, exactly the named discriminators go wrong and nothing else.
  it('a naive JavaScript implementation gets exactly these cases wrong, and no others', () => {
    const naive = (kind: string, unitPrice: string, qty: string, rate: string) => {
      const up = Number(unitPrice);
      const q = Number(qty);
      const r = Number(rate);
      const anchor = Math.round(up * q * 100) / 100;
      const gross = kind === 'sell' ? anchor : Math.round(anchor * (1 + r) * 100) / 100;
      const net = kind === 'sell' ? Math.round((anchor / (1 + r)) * 100) / 100 : anchor;
      return { gross, net };
    };
    interface RawLine {
      id: string;
      kind: string;
      unit_price: string;
      qty: string;
      rate: string;
      expect: { gross: string; net: string };
    }
    const source = JSON.parse(raw) as { lines: RawLine[] };
    const wrong: string[] = [];
    for (const row of source.lines) {
      const got = naive(row.kind, row.unit_price, row.qty, row.rate);
      if (got.gross !== Number(row.expect.gross) || got.net !== Number(row.expect.net)) {
        wrong.push(row.id);
      }
    }
    expect(wrong.sort()).toEqual([...table.discriminators].sort());
  });

  it('M8 mirrors M4 to the centavo, so a void leaves nothing behind', () => {
    const m4 = byId.get('M4');
    const m8 = byId.get('M8');
    if (!m4 || !m8) throw new Error('M4 and M8 are the sell-side void pair and must both exist');
    const priced4 = priceLine(m4.kind, m4.unitPrice, m4.qty, m4.rate);
    const priced8 = priceLine(m8.kind, m8.unitPrice, m8.qty, m8.rate);
    expect(priced8.gross).toBe(-priced4.gross);
    expect(priced8.net).toBe(-priced4.net);
    expect(priced8.tax).toBe(-priced4.tax);
  });

  it('B6 mirrors B5 to the centavo — the buy side of the same claim', () => {
    const b5 = byId.get('B5');
    const b6 = byId.get('B6');
    if (!b5 || !b6) throw new Error('B5 and B6 are the buy-side void pair and must both exist');
    const priced5 = priceLine(b5.kind, b5.unitPrice, b5.qty, b5.rate);
    const priced6 = priceLine(b6.kind, b6.unitPrice, b6.qty, b6.rate);
    expect(priced6.gross).toBe(-priced5.gross);
    expect(priced6.net).toBe(-priced5.net);
    expect(priced6.tax).toBe(-priced5.tax);
  });
});

// ---------------------------------------------------------------------------
// 2. RULE 6 — half-up, away from zero — as arithmetic, without the table
// ---------------------------------------------------------------------------
describe('§2.5 rule 6 — half-up, away from zero', () => {
  const ties: [number, number, number][] = [
    // n, d, expected  — every one of these is exactly n/d = k + 1/2
    [5, 2, 3],
    [-5, 2, -3],
    [7, 2, 4],
    [-7, 2, -4],
    [365, 10, 37],
    [-365, 10, -37],
    [6465, 10, 647],
    [-6465, 10, -647],
  ];
  for (const [n, d, want] of ties) {
    it(`${n}/${d} rounds to ${want}`, () => {
      expect(divRoundHalfUpAwayFromZero(n, d)).toBe(want);
    });
  }

  it('disagrees with Math.round on every negative tie, and agrees on every positive one', () => {
    for (const [n, d, want] of ties) {
      const ours = divRoundHalfUpAwayFromZero(n, d);
      const javascripts = Math.round(n / d);
      expect(ours).toBe(want);
      if (n < 0) expect(ours).not.toBe(javascripts);
      else expect(ours).toBe(javascripts);
    }
  });

  it('disagrees with the float round Postgres would do on a float8 column', () => {
    // round(2.5::float8) = 2 and round(646.5::float8) = 646 — banker's. This is
    // 07 F3/F4 from the JavaScript side, and it is why rule 1 is the
    // PRECONDITION for rule 6 rather than hygiene.
    const bankers = (x: number) => {
      const floor = Math.floor(x);
      const frac = x - floor;
      if (frac !== 0.5) return Math.round(x);
      return floor % 2 === 0 ? floor : floor + 1;
    };
    expect(divRoundHalfUpAwayFromZero(5, 2)).toBe(3);
    expect(bankers(2.5)).toBe(2);
    expect(divRoundHalfUpAwayFromZero(12930, 20)).toBe(647);
    expect(bankers(646.5)).toBe(646);
  });

  it('refuses a non-positive divisor rather than inventing a sign rule for it', () => {
    expect(() => divRoundHalfUpAwayFromZero(1, 0)).toThrow(RangeError);
    expect(() => divRoundHalfUpAwayFromZero(1, -2)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// 3. RULE 1 — no floating point anywhere in the money path
// ---------------------------------------------------------------------------
describe('§2.5 rule 1 — the money path never holds a float', () => {
  it('every numeric field in cases.json is a decimal STRING, not a JSON number', () => {
    const root = JSON.parse(raw) as Record<string, unknown>;
    const numeric = {
      lines: ['unit_price', 'qty', 'rate'],
      documents: ['line_gross', 'rate'],
      packs: ['pack_size', 'case_net'],
    } as const;
    let checked = 0;
    for (const [block, fields] of Object.entries(numeric)) {
      for (const row of root[block] as Record<string, unknown>[]) {
        for (const key of fields) {
          expect(typeof row[key], `${block}[${row.id}].${key} must be a string`).toBe('string');
          checked += 1;
        }
        for (const [key, value] of Object.entries(row.expect as Record<string, unknown>)) {
          if (typeof value === 'boolean') continue;
          expect(typeof value, `${block}[${row.id}].expect.${key} must be a string`).toBe('string');
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('the reader refuses a JSON number where a decimal belongs', () => {
    const broken = raw.replace('"unit_price": "11.600000"', '"unit_price": 11.6');
    expect(broken).not.toBe(raw); // the replacement really happened
    expect(() => parseCaseTable(broken)).toThrow(TypeError);
  });

  it('parseDecimal and formatDecimal round-trip a decimal string exactly', () => {
    expect(parseDecimal('0.073000', SCALE.unitPrice)).toBe(73000);
    expect(parseDecimal('-5.000', SCALE.quantity)).toBe(-5000);
    expect(formatDecimal(-37, SCALE.money)).toBe('-0.37');
    expect(formatDecimal(parseDecimal('0.025860', SCALE.unitPrice), SCALE.unitPrice))
      .toBe('0.025860');
  });

  // ⚠️ THE MEASUREMENT THAT SAYS WHAT `cases.json` CANNOT DO. Rule 1 has real
  // teeth — but not one of them bites on this table, and a green here would
  // otherwise read as though it did.
  it('breaks in doubles at a shop-sized magnitude the case table does not reach', () => {
    // 250 g at $0.26 the kilo. The exact product is 6.5 centavos; the double is
    // 6.499999999999999, so half-up sends the two answers a centavo apart.
    const exact = lineAnchorCentavos(parseDecimal('0.000260', SCALE.unitPrice),
                                     parseDecimal('250.000', SCALE.quantity));
    const inDoubles = Math.round(0.00026 * 250 * 100);
    expect(exact).toBe(7);
    expect(inDoubles).toBe(6);
    expect(0.00026 * 250 * 100).not.toBe(6.5);
  });

  it('but every boundary IN the table is a tie a double happens to hold exactly', () => {
    // Which is why no case here can go red for a float, and why this is a
    // finding rather than a gap someone forgot. Named candidates for 3.6b are
    // in docs/PLAN.md.
    expect(0.073 * 5 * 100).toBe(36.5);
    expect(0.02586 * 250 * 100).toBe(646.5);
  });

  it('refuses a value carrying more decimals than its column holds', () => {
    expect(() => parseDecimal('0.0730001', SCALE.unitPrice)).toThrow(RangeError);
    expect(() => parseDecimal('1e3', SCALE.money)).toThrow(RangeError);
    // @ts-expect-error — the runtime guard is the point of this assertion
    expect(() => parseDecimal(0.073, SCALE.unitPrice)).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// 4. THE LINE CASES — every one, to the centavo
// ---------------------------------------------------------------------------
describe('the line cases — §2.5 rules 2, 3 and 4', () => {
  for (const line of table.lines) {
    describe(`${line.id} — ${line.label}`, () => {
      const got = priceLine(line.kind, line.unitPrice, line.qty, line.rate);

      it(`gross is ${pesos(line.expect.gross)}`, () => {
        expect(pesos(got.gross)).toBe(pesos(line.expect.gross));
      });
      it(`net is ${pesos(line.expect.net)}`, () => {
        expect(pesos(got.net)).toBe(pesos(line.expect.net));
      });
      it(`tax is ${pesos(line.expect.tax)}`, () => {
        expect(pesos(got.tax)).toBe(pesos(line.expect.tax));
      });
      it('rule 4 — net + tax = gross, exactly', () => {
        expect(got.net + got.tax).toBe(got.gross);
        expect(line.expect.net + line.expect.tax).toBe(line.expect.gross);
      });
    });
  }

  it('covers both sides of the ledger — a table of only sales proves half the rule', () => {
    const kinds = new Set(table.lines.map((line) => line.kind));
    expect(kinds.has('sell')).toBe(true);
    expect(kinds.has('buy')).toBe(true);
  });

  it('carries a zero-rated line on each side — rate 0 is the other applied rate', () => {
    for (const kind of ['sell', 'buy'] as const) {
      expect(table.lines.some((line) => line.kind === kind && line.rate === 0)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. THE DOCUMENT CASES — §2.5 rule 5
// ---------------------------------------------------------------------------
describe('the document cases — §2.5 rule 5, the sum of the ROUNDED lines', () => {
  for (const doc of table.documents) {
    describe(`${doc.id} — ${doc.label}`, () => {
      // The document cases give the line GROSS directly — they are about the
      // split and the sum, not about `unit_price × qty`, which the M/B block
      // already measures. Each line is that gross, split by rule 3's sale row.
      const lines = Array.from({ length: doc.nLines }, () => {
        const net = netFromGross(doc.lineGross, doc.rate);
        return { gross: doc.lineGross, net, tax: doc.lineGross - net };
      });
      const perLine = documentNetPerLine(lines);
      const perDocument = documentNetAtDocument(doc.nLines * doc.lineGross, doc.rate);

      it(`by line the net is ${pesos(doc.expect.perLine)}`, () => {
        expect(pesos(perLine)).toBe(pesos(doc.expect.perLine));
      });
      it(`split at the document it would be ${pesos(doc.expect.perDocument)}`, () => {
        expect(pesos(perDocument)).toBe(pesos(doc.expect.perDocument));
      });
      it(`the two ${doc.expect.agree ? 'agree' : 'DISAGREE'}`, () => {
        expect(perLine === perDocument).toBe(doc.expect.agree);
      });
    });
  }

  it('carries both a disagreeing document and a control that agrees', () => {
    // Without the control, "per-line and per-document disagree" is also
    // satisfied by a rule that always disagrees — a different defect wearing
    // the same green.
    expect(table.documents.some((doc) => doc.expect.agree)).toBe(true);
    expect(table.documents.some((doc) => !doc.expect.agree)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. THE PACK CASES — §2.10's second sentence
// ---------------------------------------------------------------------------
describe('the pack cases — a case of 24 at $12.00 is $0.50 the can', () => {
  for (const pack of table.packs) {
    describe(`${pack.id} — ${pack.label}`, () => {
      it(`the per-unit price is ${formatDecimal(pack.expect.perUnit, SCALE.unitPrice)}`, () => {
        expect(formatDecimal(packUnitPrice(pack.caseNet, pack.packSize), SCALE.unitPrice)).toBe(
          formatDecimal(pack.expect.perUnit, SCALE.unitPrice),
        );
      });
      it(`it ${pack.expect.roundTrips ? 'multiplies back' : 'does NOT multiply back'}`, () => {
        expect(packRoundTrips(pack.caseNet, pack.packSize)).toBe(pack.expect.roundTrips);
      });
    });
  }

  it('carries a pack that does not divide evenly — P1 alone proves nothing', () => {
    expect(table.packs.some((pack) => !pack.expect.roundTrips)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. ANTI-VACUITY — the counter every loop in this repo carries
// ---------------------------------------------------------------------------
describe('the table itself', () => {
  it('is not empty in any block', () => {
    expect(table.lines.length).toBeGreaterThan(0);
    expect(table.documents.length).toBeGreaterThan(0);
    expect(table.packs.length).toBeGreaterThan(0);
  });

  it('carries the twenty-one cases 07 worked out, and every id is unique', () => {
    const total = table.lines.length + table.documents.length + table.packs.length;
    expect(total).toBe(21);
    const ids = [...table.lines, ...table.documents, ...table.packs].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('still carries every id 07 named, so 3.6b can lift them by name', () => {
    const expected = [
      'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9',
      'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
      'D1', 'D2', 'D3',
      'P1', 'P2', 'P3',
    ];
    const present = new Set(
      [...table.lines, ...table.documents, ...table.packs].map((row) => row.id),
    );
    for (const id of expected) {
      expect(present.has(id), `case ${id} is in 07 but not in cases.json`).toBe(true);
    }
  });
});
