import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import {
  INICIO_BLOCKS,
  INICIO_DOORS,
  doorsOfShape,
  isOpen,
  type InicioBlock,
} from '@/navigation/inicio';
import { bannerMinHeight, bannerRoom, bannerTop } from '@/offline/deadLetters';
import { ES } from '@/strings';
import { DENSITIES, DENSITY_MODES } from '@/theme/density';

// ============================================================================
// §2.8's HOME ROW, AS FAR AS A MACHINE CAN READ IT. Plan task `5d-iv-b`.
//
// ⚠️⚠️ THIS FILE EXISTS BECAUSE THE ONE PROHIBITION §2.8 KEPT IS OTHERWISE
// INVISIBLE. *State comes first* — the takings above anything tappable — is an
// ORDER, and ADR-035 §2.11 refuses suites over layout, so written as a sequence
// of JSX children it is a deliverable that ships green when somebody moves the
// cards above the figure. `src/navigation/inicio.ts` makes it a table; this
// reads the table. Exactly the trade `tabs.ts` and `app/test/tabs.test.ts` made
// for C12.1, and the one `5a-ii`'s falsification F14 paid for.
//
// ⚠️ NO COMPONENT IS MOUNTED HERE AND NOTHING IS RENDERED (`R2`). What this
// cannot see is that `index.tsx` renders `INICIO_BLOCKS` in order rather than
// four children typed out by hand — it uses a `.map`, which is a person's check
// at review and a phone's afterwards (`R9`). What this closes is the half that
// fails silently.
//
// ⚠️⚠️ AND THE BANNER'S ROOM IS IN HERE RATHER THAN IN THE DEAD-LETTER FILE,
// BECAUSE THE CLAIM IS ABOUT TWO MODULES AGREEING. `DeadLetterBanner` is
// absolutely positioned over Inicio (ruling of 2026-09-22, *"Home Only"*); if
// the room Inicio reserves were ever less than the strip the banner occupies,
// the thing hidden would be the takings figure — the number this whole screen
// exists to show.
// ============================================================================

const require_ = createRequire(import.meta.url);
const GLYPHS = JSON.parse(
  readFileSync(
    require_.resolve(
      '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json',
    ),
    'utf8',
  ),
) as Record<string, number>;

/** Every word Inicio is allowed to put on a door, from the one strings file. */
const VOCABULARY = new Set<string>([
  ...Object.values(ES.tabs),
  ES.catalog.title,
  ES.providers.title,
]);

describe('§2.8 — state comes first, and the checks below are not vacuous', () => {
  it('carries the four bands the amended Home row describes', () => {
    // ⚠️ RULE 4. An empty array passes every `for` below having asserted
    // nothing — the misleading green this repository has hit five times.
    expect(INICIO_BLOCKS).toEqual(['estado', 'tarjetas', 'filas', 'cierre']);
  });

  // ⚠️⚠️ THE ASSERTION THIS FILE IS FOR. §2.8's Home row was amended on
  // 2026-09-17 to allow the cards and kept this half word for word: the takings
  // sit ABOVE ANYTHING TAPPABLE. `estado` is the only band with nothing
  // pressable in it, so the claim is that it comes first and that the claim is
  // not vacuous — there is something tappable after it.
  it('puts the state band above every tappable band', () => {
    expect(INICIO_BLOCKS[0]).toBe('estado');
    const tappable: readonly InicioBlock[] = ['tarjetas', 'filas', 'cierre'];
    for (const band of tappable) {
      expect(INICIO_BLOCKS.indexOf(band)).toBeGreaterThan(INICIO_BLOCKS.indexOf('estado'));
    }
  });

  it('names the state band exactly once, so "first" means something', () => {
    expect(INICIO_BLOCKS.filter((b) => b === 'estado')).toHaveLength(1);
    expect(new Set(INICIO_BLOCKS).size).toBe(INICIO_BLOCKS.length);
  });

  // The bell and Ajustes are LAST — §2.8 places them after the doors, and the
  // row's own words are *"placed at last rather than floating in the middle of
  // a placeholder"*.
  it('puts the bell and Ajustes after both kinds of door', () => {
    expect(INICIO_BLOCKS[INICIO_BLOCKS.length - 1]).toBe('cierre');
  });

  it('found the shipped glyph map, so the icon checks mean something', () => {
    expect(Object.keys(GLYPHS).length, 'the MaterialCommunityIcons map is empty').toBeGreaterThan(
      1000,
    );
  });
});

describe('§2.8 — the five doors, three as cards and two as rows', () => {
  it('carries five doors and no more', () => {
    // Pinned rather than "> 0": a sixth door is a decision about what Inicio is
    // for, not a tidy-up, and it should stop here.
    expect(INICIO_DOORS).toHaveLength(5);
    expect(INICIO_DOORS.map((d) => d.key)).toEqual([
      'vender',
      'comprar',
      'desperdicio',
      'productos',
      'proveedores',
    ]);
  });

  it('draws the three work modules as cards, in §2.8s order', () => {
    expect(doorsOfShape('tarjeta').map((d) => d.key)).toEqual([
      'vender',
      'comprar',
      'desperdicio',
    ]);
  });

  it('draws Productos and Proveedores as rows, in §2.8s order', () => {
    expect(doorsOfShape('fila').map((d) => d.key)).toEqual(['productos', 'proveedores']);
  });

  it('accounts for every door in one shape or the other', () => {
    expect(doorsOfShape('tarjeta').length + doorsOfShape('fila').length).toBe(INICIO_DOORS.length);
  });

  it('gives every door a distinct key', () => {
    expect(new Set(INICIO_DOORS.map((d) => d.key)).size).toBe(INICIO_DOORS.length);
  });
});

describe('C12.1 — never an icon without its word, and never a word we invented', () => {
  for (const door of INICIO_DOORS) {
    it(`${door.key} carries a Spanish word from the strings file`, () => {
      expect(door.label, `${door.key} has no label — C12.1 forbids an icon alone`).toBeTruthy();
      expect(door.label.trim()).toBe(door.label);
      // ⚠️ NOT just "non-empty". Inicio is a SECOND door onto rooms that
      // already have names, so the word has to be one the room already answers
      // to — a card reading one word above a tab reading another is this
      // repository's stale-duplicate defect in its cheapest form. ⚠️ This does
      // NOT prove it was READ from `ES`: a literal `'Vender'` is the same
      // string at runtime, and the source-text check below is what closes that.
      expect(
        VOCABULARY.has(door.label),
        `"${door.label}" is not a word any room in this app answers to`,
      ).toBe(true);
    });

    it(`${door.key} has an icon that exists in the shipped font`, () => {
      // A typo here is not a crash and not a red anything: it is a blank square
      // beside a word, which is C12.1 broken in the way C12.1 forbids.
      expect(GLYPHS, `"${door.icon}" is not in MaterialCommunityIcons`).toHaveProperty(door.icon);
    });

    it(`${door.key} says why it is here and why that glyph`, () => {
      expect(door.why.length, `${door.key} has no reasoning beside it`).toBeGreaterThan(40);
    });
  }

  // ⚠️ THE HALF THE VOCABULARY CHECK CANNOT SEE, closed the way `tabs.test.ts`
  // closes it: read the source and assert the labels are EXPRESSIONS. A literal
  // typed into the table passes every assertion above.
  it('reads its labels from src/strings.ts rather than spelling them again', () => {
    const source = readFileSync(
      new URL('../src/navigation/inicio.ts', import.meta.url),
      'utf8',
    );
    for (const door of INICIO_DOORS) {
      expect(
        source,
        `${door.key}'s label is typed in place — it must come from ES`,
      ).not.toContain(`label: '${door.label}'`);
    }
    expect(source).toContain('label: ES.');
  });
});

describe('a door with no room is drawn dead rather than drawn live', () => {
  // ⚠️⚠️ PROVEEDORES IS THE ONE. §2.8 puts the row on Inicio and `6b` builds
  // the screen; `5d-iii`'s ruling is that it is drawn because a shopkeeper
  // should see what is coming and drawn PLAINLY dead because a control that
  // looks live and refuses silently is worse than one that is obviously not
  // built.
  it('has exactly one door with no route, and it is Proveedores', () => {
    const shut = INICIO_DOORS.filter((door) => !isOpen(door));
    expect(shut.map((d) => d.key)).toEqual(['proveedores']);
  });

  it('agrees with itself about which doors are open', () => {
    for (const door of INICIO_DOORS) {
      expect(isOpen(door)).toBe(door.route !== null);
    }
  });

  // The sentence under a dead door is what keeps it from looking broken — the
  // shape `ES.approvals.notYet` had at `5b-iii-d-1` and `ES.family.notYet` at
  // `5d-iii`, and it is deleted by the task that makes the door work.
  //
  // ⚠️⚠️ `ES.family.notYet` IS NOW GONE, WHICH IS THIS ASSERTION'S OWN ARGUMENT
  // ARRIVING. It used to read `expect(ES.home.notYet).not.toBe(ES.family.notYet)`
  // — two dead-door sentences, kept distinct so one screen's wording could not be
  // pasted onto another's. `5g-iii` made `Costos` work and DELETED the family's
  // copy, exactly as the comment above predicted, so the pair is down to one.
  // ⚠️ **The surviving half is the one that matters and it is kept**: Proveedores
  // is still an unbuilt door on Inicio (`6b`), so `ES.home.notYet` is still load
  // -bearing. The day `6b` ships, this whole assertion goes with it.
  it('has a sentence to put under a dead door', () => {
    expect(ES.home.notYet.length).toBeGreaterThan(0);
    // ⚠️ AND IT IS NOT THE PLACEHOLDER EITHER, which is the substance of the
    // original comparison: a door that is not built yet says something about
    // WHEN, and an unbuilt SCREEN says something about itself.
    expect(ES.home.notYet).not.toBe(ES.placeholder.pending);
  });
});

describe('the room at the top, and the banner it is for', () => {
  for (const mode of DENSITY_MODES) {
    const scale = DENSITIES[mode];

    // ⚠️⚠️ THE COLLISION THIS EXISTS TO STOP. The banner is absolutely
    // positioned over Inicio and takes no taps, so a room smaller than the
    // strip would not break anything — it would quietly HIDE the takings
    // figure, which is the one number the screen is for.
    it(`${mode}: the room clears where the banner's pill ends`, () => {
      const inset = 47;
      expect(bannerRoom(scale, inset)).toBeGreaterThanOrEqual(
        bannerTop(scale, inset) + bannerMinHeight(scale),
      );
    });

    it(`${mode}: the room leaves the device's own inset alone`, () => {
      const inset = 47;
      expect(bannerRoom(scale, inset) - bannerRoom(scale, 0)).toBe(inset);
    });

    it(`${mode}: the pill clears the tap-target floor (R6)`, () => {
      expect(bannerMinHeight(scale)).toBe(scale.tapTarget);
    });
  }

  // ⚠️ C3.18's promise, at the top of the one screen that reserves space for
  // something it cannot see: elder mode's room is LARGER, not merely different.
  // A room that did not grow would put a bigger banner over a bigger figure.
  it('reserves more room in Letra grande than in Normal', () => {
    expect(bannerRoom(DENSITIES.elder, 0)).toBeGreaterThan(bannerRoom(DENSITIES.normal, 0));
  });
});
