// ============================================================================
// C12.1 — ICONS PLUS THE SPANISH WORD. Plan task 5a-ii.
//
// ⚠️⚠️ THIS FILE EXISTS BECAUSE C12.1 WOULD OTHERWISE BE THE ONE DELIVERABLE OF
// 5a-ii THAT NOTHING CAN SEE. ADR-035 §2.11 refuses suites over navigation, and
// it is right to — but the consequence, written as JSX, is that deleting a tab
// label ships green. So the tabs are a TABLE (`src/navigation/tabs.ts`) and
// this asserts over its values. No component is mounted here. Nothing is
// rendered. There is not an assertion about the tab bar's appearance in this
// file, and there must not be.
//
// ⚠️ WHAT IT STILL CANNOT SEE, said plainly rather than left to be discovered:
// that `(tabs)/_layout.tsx` actually PASSES the label to the bar. A person
// holding the phone is the check for that, and `5a-iv` is when it happens. What
// this closes is the half that fails silently — a tab with no word, a word in
// English, a glyph name that renders as a blank square.
// ============================================================================

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { TABS } from '../src/navigation/tabs';
import { ES } from '../src/strings';

// ⚠️ THE SHIPPED GLYPH MAP, RESOLVED THROUGH THE PACKAGE. This is the same file
// the icon component reads at runtime, so a name that is not in it is a blank
// square on the device. Resolved rather than path-joined so that a dependency
// bump which moves it fails HERE, loudly, naming the path — instead of leaving
// a test that quietly checks nothing.
const require_ = createRequire(import.meta.url);
const GLYPHS = JSON.parse(
  readFileSync(
    require_.resolve(
      '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json',
    ),
    'utf8',
  ),
) as Record<string, number>;

/** Every Spanish word the tab bar is allowed to show, from the one strings file. */
const VOCABULARY = new Set<string>(Object.values(ES.tabs));

describe('C12.1 — the shell has tabs, and the checks below are not vacuous', () => {
  it('carries the four tabs 5a-ii placed', () => {
    // ⚠️ RULE 4. An empty TABS array passes every `for` below having asserted
    // nothing — the shape of misleading green this repository has hit five
    // times. Pinned at four rather than "> 0" because adding a fifth is a
    // decision (which role sees it?), not a tidy-up, and it should stop here.
    expect(TABS).toHaveLength(4);
    expect(TABS.map((t) => t.route)).toEqual(['index', 'vender', 'comprar', 'desperdicio']);
  });

  it('found the shipped glyph map, so the icon checks mean something', () => {
    expect(Object.keys(GLYPHS).length, 'the MaterialCommunityIcons map is empty').toBeGreaterThan(
      1000,
    );
  });
});

describe('C12.1 — never an icon without its word', () => {
  for (const tab of TABS) {
    it(`${tab.route} has a Spanish word from the strings file`, () => {
      expect(tab.label, `${tab.route} has no label — C12.1 forbids an icon alone`).toBeTruthy();
      expect(tab.label.trim()).toBe(tab.label);
      // ⚠️ NOT just "non-empty" — the word has to be one of the four in
      // `src/strings.ts`. This does NOT prove it was READ from there: a literal
      // `'Vender'` typed into the table is the same string at runtime, and
      // falsification F9 confirmed this assertion stays green on one. The
      // source-text check further down is what closes that half.
      expect(
        VOCABULARY.has(tab.label),
        `"${tab.label}" is not one of the words in ES.tabs`,
      ).toBe(true);
    });

    it(`${tab.route} has an icon that exists in the shipped font`, () => {
      // A typo here is not a crash and not a red anything: it is a blank square
      // on the bar, which is C12.1 broken in exactly the way C12.1 forbids.
      expect(GLYPHS[tab.icon], `"${tab.icon}" is not a MaterialCommunityIcons glyph`).toBeTypeOf(
        'number',
      );
    });
  }

  it('names the modules in the domain vocabulary, not in English', () => {
    // ⚠️ PINNED LITERALLY, AND THE REASON IS IN CLAUDE.md: "Spanish module names
    // are the domain language, not a translation layer." Checking only that a
    // label comes from `ES.tabs` would pass an anglicised strings file — the
    // set would still agree with itself. An English build of this app would
    // still have a `Vender` screen, so these four words are load-bearing.
    expect(TABS.map((t) => t.label)).toEqual(['Inicio', 'Vender', 'Comprar', 'Desperdicio']);
  });

  it('gives every tab a distinct word and a distinct icon', () => {
    // Two tabs that look the same are two tabs a hurrying shopkeeper picks
    // between by position, which is the failure C12.1's words exist to prevent.
    expect(new Set(TABS.map((t) => t.label)).size).toBe(TABS.length);
    expect(new Set(TABS.map((t) => t.icon)).size).toBe(TABS.length);
  });

  it('reads its labels from the strings file rather than repeating them', () => {
    // ⚠️ THIS ONE READS SOURCE TEXT, AND IT IS HERE BECAUSE FALSIFICATION F9
    // SHOWED THE VALUE CHECK ABOVE CANNOT SEE THE DEFECT. `label: 'Vender'` and
    // `label: ES.tabs.vender` are the same string once the module has loaded,
    // so no assertion over TABS can tell them apart — and the one that matters
    // to §2.11 ("hardcoded Spanish, centralised in ONE file") is exactly that
    // difference. A second copy drifts silently; the first one always looks
    // harmless. Same shape as docs/checks/5a-split-coverage.sh, which reads
    // Markdown for the same reason: some claims are about the text.
    const source = readFileSync(
      fileURLToPath(new URL('../src/navigation/tabs.ts', import.meta.url)),
      'utf8',
    );
    const literals = source
      .split('\n')
      .filter((line) => /^\s*label:\s*['"`]/.test(line));
    expect(
      literals,
      'a tab label is typed in place instead of coming from ES.tabs (§2.11: one strings file)',
    ).toEqual([]);
    // The guard on the guard: if the shape of the file ever changes so that no
    // line reads `label: ...` at all, the check above passes vacuously.
    expect(
      source.split('\n').filter((line) => /^\s*label:\s*ES\.tabs\./.test(line)),
      'no `label: ES.tabs.…` lines found — this check is reading the wrong file',
    ).toHaveLength(TABS.length);
  });

  it('records why each glyph was chosen, next to the choice', () => {
    for (const tab of TABS) {
      expect(tab.why.length, `${tab.route} has no reasoning attached`).toBeGreaterThan(20);
    }
  });
});
