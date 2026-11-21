// ============================================================================
// THE INKS ON THE GROUNDS, MEASURED — Step 11, row 11.1 (2026-11-21).
//
// Reads `paleta.json` beside it — direction A · Mostrador's colour roles for
// the three apps — and measures, app by app, every ink on every ground, every
// filled button's words on its fill, and white on each of the six kitchen
// colours. The ratio is WCAG 2.1's, the same nine lines as
// `app/test/palette.test.ts`, so a number here is the number that test will
// assert once 11.6 and 11.7 copy these values into the apps.
//
// It exits 1 if any text pair is under 4.5:1. The graphic pairs (a 1-point line,
// the sheet's edge on the counter, a star) are printed and not asserted: they
// carry no words, and the apps' rule is that no state is told by colour alone.
//
// No workflow runs it (brand/ is read by none). Run:
//   node brand/mostrador/contraste.mjs          the matrix, then the verdict
//   node brand/mostrador/contraste.mjs --json   the same numbers as JSON
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FLOOR = 4.5;
const here = fileURLToPath(new URL('./paleta.json', import.meta.url));
const { apps, cocinas, medir } = JSON.parse(readFileSync(here, 'utf8'));

function luminance(hex) {
  const channel = (pair) => {
    const v = parseInt(pair, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const h = hex.slice(1);
  return 0.2126 * channel(h.slice(0, 2)) + 0.7152 * channel(h.slice(2, 4)) + 0.0722 * channel(h.slice(4, 6));
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const result = { floor: FLOOR, apps: {}, failures: [] };

for (const [app, roles] of Object.entries(apps)) {
  const plan = medir[app];
  const value = (role) => {
    const v = roles[role];
    if (!/^#[0-9A-F]{6}$/.test(v ?? '')) throw new Error(`${app}.${role} is not a six-digit upper-case hex: ${v}`);
    return v;
  };
  const matrix = plan.tintas.map((ink) => plan.fondos.map((ground) => contrast(value(ink), value(ground))));
  const fills = plan.rellenos.map(([ink, fill]) => ({ ink, fill, ratio: contrast(value(ink), value(fill)) }));
  const kitchens = Object.entries(cocinas).map(([name, hex]) => ({
    name,
    ratio: contrast(value(medir.sobreCocinas), hex),
  }));
  const graphics = plan.graficos.map(([mark, ground]) => ({ mark, ground, ratio: contrast(value(mark), value(ground)) }));

  plan.tintas.forEach((ink, i) =>
    plan.fondos.forEach((ground, j) => {
      if (matrix[i][j] < FLOOR) result.failures.push(`${app}: ${ink} on ${ground} ${matrix[i][j].toFixed(3)}`);
    }),
  );
  for (const f of fills) if (f.ratio < FLOOR) result.failures.push(`${app}: ${f.ink} on ${f.fill} ${f.ratio.toFixed(3)}`);
  for (const k of kitchens) if (k.ratio < FLOOR) result.failures.push(`${app}: ${medir.sobreCocinas} on ${k.name} ${k.ratio.toFixed(3)}`);

  const worst = Math.min(...matrix.flat(), ...fills.map((f) => f.ratio), ...kitchens.map((k) => k.ratio));
  result.apps[app] = { tintas: plan.tintas, fondos: plan.fondos, matrix, fills, kitchens, graphics, worst };
}

if (process.argv.includes('--json')) {
  const round = (x) => Math.round(x * 100) / 100;
  console.log(
    JSON.stringify(result, (k, v) => (typeof v === 'number' && k !== 'floor' ? round(v) : v), 2),
  );
} else {
  for (const [app, r] of Object.entries(result.apps)) {
    console.log(`\n== ${app} — every ink on every ground`);
    console.log(''.padEnd(14) + r.fondos.map((g) => g.slice(0, 11).padStart(12)).join(''));
    r.tintas.forEach((ink, i) => console.log(ink.padEnd(14) + r.matrix[i].map((x) => x.toFixed(2).padStart(12)).join('')));
    console.log('  filled: ' + r.fills.map((f) => `${f.ink} on ${f.fill} ${f.ratio.toFixed(2)}`).join(' · '));
    console.log('  on the kitchens\' colours: ' + r.kitchens.map((k) => `${k.name} ${k.ratio.toFixed(2)}`).join(' · '));
    console.log('  graphics, not asserted: ' + r.graphics.map((g) => `${g.mark} on ${g.ground} ${g.ratio.toFixed(2)}`).join(' · '));
    console.log(`  worst text pair: ${r.worst.toFixed(2)}`);
  }
  if (result.failures.length) {
    console.log(`\n${result.failures.length} text pair(s) under ${FLOOR}:1:\n  ` + result.failures.join('\n  '));
  } else {
    console.log(`\nevery text pair in the three apps clears ${FLOOR}:1`);
  }
}
process.exit(result.failures.length ? 1 : 0);
