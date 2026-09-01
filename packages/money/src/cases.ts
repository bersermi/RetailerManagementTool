// ============================================================================
// The reader for `cases.json` — ADR-035 §2.10's "one data file".
//
// It takes TEXT, not a filesystem path and not an `import` of the JSON. Two
// reasons, and the second is the one that matters:
//
//   1. This package runs on a phone. Nothing in `src/` may reach for `node:fs`.
//   2. A file this suite cannot parse must fail LOUDLY. `import cases from
//      './cases.json'` would hand back whatever shape the file happens to have
//      and let a renamed field arrive as `undefined`, which compares unequal to
//      nothing and passes as "0 === 0" often enough to be dangerous. Every
//      field below is checked on the way in, and a missing one throws.
//
// ⚠️ IT REFUSES A JSON NUMBER WHERE A DECIMAL BELONGS. That is the whole point
// of the strings in that file: a JSON number is an IEEE754 double, so `0.073`
// would already be wrong by the time any code here saw it (§2.5 rule 1).
// ============================================================================

import { SCALE, parseDecimal } from './money.js';
import type { Kind } from './money.js';

export interface LineCase {
  id: string;
  kind: Kind;
  label: string;
  unitPrice: number; // scale 6 — gross per base on a sale, NET on a purchase
  qty: number; // scale 3
  rate: number; // scale 4, basis points
  expect: { gross: number; net: number; tax: number }; // centavos
}

export interface DocumentCase {
  id: string;
  label: string;
  nLines: number;
  lineGross: number; // centavos
  rate: number;
  expect: { perLine: number; perDocument: number; agree: boolean };
}

export interface PackCase {
  id: string;
  label: string;
  packSize: number; // scale 3
  caseNet: number; // centavos
  expect: { perUnit: number; roundTrips: boolean };
}

export interface CaseTable {
  version: number;
  source: string;
  /** Ids that alone can tell half-up-away-from-zero from `Math.round`. */
  discriminators: string[];
  lines: LineCase[];
  documents: DocumentCase[];
  packs: PackCase[];
}

function field(row: Record<string, unknown>, key: string, where: string): unknown {
  if (!(key in row)) throw new Error(`${where}: missing field "${key}"`);
  return row[key];
}

function decimal(row: Record<string, unknown>, key: string, scale: number, where: string): number {
  const raw = field(row, key, where);
  if (typeof raw !== 'string') {
    throw new TypeError(
      `${where}.${key} is a JSON ${typeof raw}, and every number in cases.json ` +
        `must be a decimal STRING — a JSON number is a double, and §2.5 rule 1 ` +
        `puts no floating point anywhere in the money path.`,
    );
  }
  return parseDecimal(raw, scale);
}

function bool(row: Record<string, unknown>, key: string, where: string): boolean {
  const raw = field(row, key, where);
  if (typeof raw !== 'boolean') throw new TypeError(`${where}.${key} must be a boolean`);
  return raw;
}

function rows(value: unknown, where: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${where} must be a non-empty array — an empty case table asserts nothing`);
  }
  return value as Record<string, unknown>[];
}

export function parseCaseTable(text: string): CaseTable {
  const root = JSON.parse(text) as Record<string, unknown>;

  const lines = rows(root.lines, 'lines').map((row): LineCase => {
    const id = String(field(row, 'id', 'lines'));
    const where = `lines[${id}]`;
    const kind = field(row, 'kind', where);
    if (kind !== 'sell' && kind !== 'buy') throw new Error(`${where}.kind must be sell or buy`);
    const expect = field(row, 'expect', where) as Record<string, unknown>;
    return {
      id,
      kind,
      label: String(field(row, 'label', where)),
      unitPrice: decimal(row, 'unit_price', SCALE.unitPrice, where),
      qty: decimal(row, 'qty', SCALE.quantity, where),
      rate: decimal(row, 'rate', SCALE.rate, where),
      expect: {
        gross: decimal(expect, 'gross', SCALE.money, `${where}.expect`),
        net: decimal(expect, 'net', SCALE.money, `${where}.expect`),
        tax: decimal(expect, 'tax', SCALE.money, `${where}.expect`),
      },
    };
  });

  const documents = rows(root.documents, 'documents').map((row): DocumentCase => {
    const id = String(field(row, 'id', 'documents'));
    const where = `documents[${id}]`;
    const nLines = field(row, 'n_lines', where);
    if (!Number.isSafeInteger(nLines) || (nLines as number) < 1) {
      throw new Error(`${where}.n_lines must be a positive integer`);
    }
    const expect = field(row, 'expect', where) as Record<string, unknown>;
    return {
      id,
      label: String(field(row, 'label', where)),
      nLines: nLines as number,
      lineGross: decimal(row, 'line_gross', SCALE.money, where),
      rate: decimal(row, 'rate', SCALE.rate, where),
      expect: {
        perLine: decimal(expect, 'per_line', SCALE.money, `${where}.expect`),
        perDocument: decimal(expect, 'per_document', SCALE.money, `${where}.expect`),
        agree: bool(expect, 'agree', `${where}.expect`),
      },
    };
  });

  const packs = rows(root.packs, 'packs').map((row): PackCase => {
    const id = String(field(row, 'id', 'packs'));
    const where = `packs[${id}]`;
    const expect = field(row, 'expect', where) as Record<string, unknown>;
    return {
      id,
      label: String(field(row, 'label', where)),
      packSize: decimal(row, 'pack_size', SCALE.quantity, where),
      caseNet: decimal(row, 'case_net', SCALE.money, where),
      expect: {
        perUnit: decimal(expect, 'per_unit', SCALE.unitPrice, `${where}.expect`),
        roundTrips: bool(expect, 'round_trips', `${where}.expect`),
      },
    };
  });

  const disc = (root.discriminators as Record<string, unknown> | undefined)?.away_from_zero;
  if (!Array.isArray(disc) || disc.length === 0) {
    throw new Error(
      'cases.json must name its away_from_zero discriminators. They are the only ' +
        'cases that can catch Math.round, and a table that has quietly lost them ' +
        'looks exactly like one that never had them.',
    );
  }

  const ids = new Set<string>();
  for (const row of [...lines, ...documents, ...packs]) {
    if (ids.has(row.id)) throw new Error(`duplicate case id "${row.id}"`);
    ids.add(row.id);
  }

  return {
    version: Number(field(root, 'version', 'root')),
    source: String(field(root, 'source', 'root')),
    discriminators: disc.map(String),
    lines,
    documents,
    packs,
  };
}
