import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PALETTE, SIZE } from '@/theme/palette';
import { VECINOS } from '@/strings';
import { ES as ITACATE } from '../../itacate/src/strings';
import { PALETTE as PALETA_DE_ITACATE, SIZE as TAMANOS_DE_ITACATE } from '../../itacate/src/theme/palette';

// ============================================================================
// *ASÍ LA VEN* AND *VER COMO LA VEN* ARE ITACATE'S TWO PAGES — HELD TO ITACATE'S FILES.
// Plan task `10.5-v-c-ii`: *"Itacate's dish page and kitchen page, one and the same
// screen, inside Wera Cocina"*. Each app's `@/` is its own `src/`, so Wera Cocina copies
// what draws them into `src/vecinos/`, and this file holds every copy to the TWIN'S FILE
// in `itacate/src/` — never to a second spelling written here (Itacate's
// `test/gemelos.test.ts` holds its copies of Wera Cocina's the same way):
//   - A WHOLE FILE: its code below the imports, comments and spacing folded, is
//     Itacate's; and it imports the same names — only from where differs;
//   - PART OF A FILE (the door's types, the list's rules, one of Google's): block for
//     block, each block found by the line that starts it;
//   - THE WORDS: `VECINOS` is Itacate's `ES.pagina` and `ES.platillo` whole, and the
//     card's words those pages use, value for value;
//   - THE PALETTE: Wera Cocina's is Itacate's in every value but the action's colour —
//     Wera Cocina never wears Itacate's blue (`test/pestanas.test.ts`), so *Cómo llegar ›*
//     is drawn in her green. That is the one difference a fonda can see.
// A fix to one page is a fix to both, in one PR — or this file is red.
// ⚠️ WHAT THIS CANNOT SEE: that the copies draw (ADR-035 §2.11). The session's emulator
// run and the owner's look are their evidence.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const itacate = (path: string) => readFileSync(join(ROOT, 'itacate/src', path), 'utf8');
const cocina = (path: string) => readFileSync(join(ROOT, 'cocina/src', path), 'utf8');

/** Comments and spacing folded. ⚠️ A `//` comment follows a space or starts a line — never `https://`. */
const fold = (code: string) =>
  code
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
    .replace(/\s+/g, ' ')
    .trim();

/** Every `import … from '…';`, one line or several. */
const IMPORT = /^import\s[\s\S]*?\sfrom\s'[^']+';$/gm;
const sinImports = (text: string) => text.replace(IMPORT, '');

/** The names a file imports — `VECINOS as ES` is `ES`, the name its code uses. */
function nombres(text: string): string[] {
  const out: string[] = [];
  for (const statement of text.match(IMPORT) ?? []) {
    const llaves = /\{([^}]*)\}/.exec(statement);
    if (llaves !== null) {
      for (const part of llaves[1].split(',')) {
        const name = part.replace(/\btype\b/g, '').trim();
        if (name === '') continue;
        out.push(name.includes(' as ') ? name.split(' as ')[1].trim() : name);
      }
    }
    const solo = /^import\s+(?:type\s+)?([A-Za-z_$][\w$]*)\s*(?:,|\sfrom)/.exec(statement);
    if (solo !== null) out.push(solo[1]);
    const todo = /\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(statement);
    if (todo !== null) out.push(todo[1]);
  }
  return out.sort();
}

/** A block — from the line that starts it to its closing line at the margin — folded. */
function bloque(text: string, inicio: string): string {
  const lines = text.split('\n');
  const first = lines.findIndex((line) => line.startsWith(inicio));
  if (first < 0) throw new Error(`no line starts with: ${inicio}`);
  const taken = [lines[first]];
  if (lines[first].trimEnd().endsWith(';')) return fold(taken.join('\n'));
  for (let i = first + 1; i < lines.length; i += 1) {
    taken.push(lines[i]);
    if (/^[}\])]/.test(lines[i])) break;
  }
  return fold(taken.join('\n'));
}

/** Wera Cocina's copy (in `src/vecinos/`) → Itacate's file (in `itacate/src/`). */
const ENTERAS: Readonly<Record<string, string>> = {
  'vecinos/paginas.ts': 'lib/paginas.ts',
  'vecinos/ui/Atras.tsx': 'ui/Atras.tsx',
  'vecinos/ui/Circulo.tsx': 'ui/Circulo.tsx',
  'vecinos/ui/Enlace.tsx': 'ui/Enlace.tsx',
  'vecinos/ui/FilaCocina.tsx': 'ui/FilaCocina.tsx',
  'vecinos/ui/PaginaVacia.tsx': 'ui/PaginaVacia.tsx',
  'vecinos/ui/Precio.tsx': 'ui/Precio.tsx',
  'vecinos/ui/RenglonPlatillo.tsx': 'ui/RenglonPlatillo.tsx',
  // `10.5-v-d`: the list's card, at the foot of *Tu oferta de hoy*.
  'vecinos/ui/TarjetaPlatillo.tsx': 'ui/TarjetaPlatillo.tsx',
  'vecinos/ui/PaginaDeCocina.tsx': 'ui/PaginaDeCocina.tsx',
  'vecinos/ui/PaginaDePlatillo.tsx': 'ui/PaginaDePlatillo.tsx',
};

/** Copies of part of a file: the blocks each holds. */
const EN_PARTE: Readonly<Record<string, { readonly de: string; readonly bloques: readonly string[] }>> = {
  'vecinos/cocinas.ts': {
    de: 'api/cocinas.ts',
    bloques: [
      'export const POINT_SOURCES =',
      'export type PointSource =',
      'export interface Punto {',
      'export interface Point extends Punto {',
      'export interface Address {',
      'export interface Dish {',
      'export interface Offer {',
      'export interface Repeat {',
      'export interface Summary {',
      'export interface Kitchen {',
    ],
  },
  'vecinos/lista.ts': {
    de: 'lib/lista.ts',
    bloques: [
      'export function vigentes(',
      'export function quedanTexto(',
      'export function ahorroDe(',
      'export function precioTexto(',
      'export function ventanaTexto(',
      'export const PATRON_MINIMO =',
      'export function diasTexto(',
      'export function diasAtras(',
      'export function publicoTexto(',
      'export function patronDe(',
    ],
  },
  'vecinos/google.ts': { de: 'lib/google.ts', bloques: ['export function preguntaDeSuDireccion('] },
};

/** The one part that is not a copy: it hands a path to Wera Cocina's own photo part. */
const ADAPTADA = 'vecinos/ui/Foto.tsx';

describe('every file of Itacate’s two pages in Wera Cocina is accounted for', () => {
  it('`src/vecinos/` holds the copies below and the photo’s adapter — nothing else', () => {
    const dir = join(ROOT, 'cocina/src/vecinos');
    const walk = (at: string): string[] =>
      readdirSync(at).flatMap((name) => {
        const path = join(at, name);
        return statSync(path).isDirectory() ? walk(path) : [path.slice(join(ROOT, 'cocina/src').length + 1)];
      });
    expect(walk(dir).sort()).toEqual([...Object.keys(ENTERAS), ...Object.keys(EN_PARTE), ADAPTADA].sort());
  });

  it('and each copy names its twin in its header', () => {
    for (const [ours, theirs] of Object.entries(ENTERAS)) expect(cocina(ours), ours).toContain(`itacate/src/${theirs}`);
    for (const [ours, { de }] of Object.entries(EN_PARTE)) expect(cocina(ours), ours).toContain(`itacate/src/${de}`);
  });
});

describe('a whole file — its code is Itacate’s, below its imports', () => {
  for (const [ours, theirs] of Object.entries(ENTERAS)) {
    it(`${ours} is itacate/src/${theirs}`, () => {
      expect(fold(sinImports(cocina(ours)))).toBe(fold(sinImports(itacate(theirs))));
    });
    it(`${ours} imports the names itacate/src/${theirs} imports`, () => {
      expect(nombres(cocina(ours))).toEqual(nombres(itacate(theirs)));
    });
  }

  it('the trap the fold could hide: a copy whose code changed is red', () => {
    const theirs = itacate('ui/PaginaDeCocina.tsx');
    const broken = theirs.replace('const CIRCULO = 60;', 'const CIRCULO = 64;');
    expect(broken).not.toBe(theirs);
    expect(fold(sinImports(broken))).not.toBe(fold(sinImports(cocina('vecinos/ui/PaginaDeCocina.tsx'))));
  });

  it('and the copies read nothing of their own — no hook, no call, no location — as Itacate’s never do', () => {
    for (const ours of [...Object.keys(ENTERAS), ...Object.keys(EN_PARTE)]) {
      expect(cocina(ours), ours).not.toMatch(/from '@\/api\/(hooks|calls)'|@\/lib\/supabase'|expo-location/);
    }
  });

  it('their words are Itacate’s, imported under Itacate’s name — never Wera Cocina’s `ES`', () => {
    for (const ours of Object.keys(ENTERAS)) {
      const text = cocina(ours);
      if (!/\bES\./.test(text)) continue;
      expect(text, ours).toMatch(/import \{ VECINOS as ES \} from '@\/strings';/);
    }
  });
});

describe('part of a file — block for block', () => {
  for (const [ours, { de, bloques }] of Object.entries(EN_PARTE)) {
    for (const inicio of bloques) {
      it(`${ours}: ${inicio}`, () => {
        expect(bloque(cocina(ours), inicio)).toBe(bloque(itacate(de), inicio));
      });
    }
  }
});

describe('the words — Itacate’s, value for value', () => {
  /** A section compared key by key: a string as it is, a function by its code and by what it says. */
  function igual(ours: Record<string, unknown>, theirs: Record<string, unknown>, where: string) {
    for (const [key, value] of Object.entries(ours)) {
      expect(theirs, `${where}.${key}`).toHaveProperty(key);
      const twin = theirs[key];
      if (typeof value === 'function') {
        expect(typeof twin, `${where}.${key}`).toBe('function');
        expect(fold(String(value)), `${where}.${key}`).toBe(fold(String(twin)));
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        igual(value as Record<string, unknown>, twin as Record<string, unknown>, `${where}.${key}`);
      } else {
        expect(value, `${where}.${key}`).toEqual(twin);
      }
    }
  }

  it('her page’s and a dish’s sections are Itacate’s, whole', () => {
    expect(Object.keys(VECINOS.pagina).sort()).toEqual(Object.keys(ITACATE.pagina).sort());
    expect(Object.keys(VECINOS.platillo).sort()).toEqual(Object.keys(ITACATE.platillo).sort());
    igual(VECINOS.pagina, ITACATE.pagina, 'pagina');
    igual(VECINOS.platillo, ITACATE.platillo, 'platillo');
  });

  it('the card’s words the two pages use are Itacate’s', () => {
    igual(VECINOS.cerca, ITACATE.cerca, 'cerca');
  });

  it('and they say the same things', () => {
    expect(VECINOS.pagina.veces(3)).toBe(ITACATE.pagina.veces(3));
    expect(VECINOS.pagina.vecesYPrecio('3 veces', '$65')).toBe('3 veces · normalmente a $65');
    expect(VECINOS.cerca.los(['lunes', 'jueves'])).toBe(ITACATE.cerca.los(['lunes', 'jueves']));
    expect(VECINOS.cerca.suele('entre semana', VECINOS.cerca.hacia(17))).toBe('Suele tener ofertas entre semana, hacia las 17:00');
  });

  it('every word the copies draw is in `VECINOS` — a key they use that Itacate has and this lacks is red', () => {
    const used = new Set<string>();
    for (const ours of [...Object.keys(ENTERAS), ...Object.keys(EN_PARTE)]) {
      for (const m of cocina(ours).matchAll(/\bES\.(cerca|pagina|platillo)\.(\w+)/g)) used.add(`${m[1]}.${m[2]}`);
    }
    expect(used.size).toBeGreaterThan(10);
    for (const key of used) {
      const [section, name] = key.split('.') as ['cerca' | 'pagina' | 'platillo', string];
      expect(VECINOS[section], key).toHaveProperty(name);
    }
  });
});

describe('the palette — Itacate’s in every value but the action’s colour', () => {
  it('every colour the copies can draw is Itacate’s, but `accion` and `accionSuave`', () => {
    for (const [key, value] of Object.entries(PALETA_DE_ITACATE)) {
      expect(PALETTE, key).toHaveProperty(key);
      if (key === 'accion' || key === 'accionSuave') continue;
      expect((PALETTE as Record<string, string>)[key], key).toBe(value);
    }
  });

  it('which is Wera Cocina’s green — *Cómo llegar ›* and a wheel, the only two places the copies use it', () => {
    expect(PALETTE.accion).toBe('#1C6B4B');
    const users = [...Object.keys(ENTERAS)].filter((ours) => /PALETTE\.accion\b/.test(cocina(ours)));
    expect(users.sort()).toEqual(['vecinos/ui/Enlace.tsx', 'vecinos/ui/PaginaVacia.tsx']);
  });

  it('and the sizes are Itacate’s, one for one', () => {
    expect(SIZE).toEqual(TAMANOS_DE_ITACATE);
  });
});

describe('the photo — not a copy, and why', () => {
  const adaptada = cocina(ADAPTADA);

  it('keeps Itacate’s signature, so the copied pages call it as Itacate’s do', () => {
    expect(adaptada).toMatch(/export function Foto\(\{ path, cocinaId, size = 'chica' \}: \{ path: string \| null; cocinaId: string; size\?: PhotoSize \}\)/);
    expect(itacate('ui/Foto.tsx')).toMatch(/export function Foto\(\{ path, cocinaId, size = 'chica' \}: \{ path: string \| null; cocinaId: string; size\?: PhotoSize \}\)/);
  });

  it('draws only a picture in her own folder, as Itacate’s hook asks — through Wera Cocina’s own part', () => {
    expect(adaptada).toMatch(/if \(path === null \|\| !isPicturePath\(path, cocinaId\)\) return null;/);
    expect(adaptada).toMatch(/<SuFoto foto=\{recien\.get\(path\) \?\? guardada\(path\)\} size=\{size\} \/>/);
    expect(adaptada).toMatch(/import \{ Foto as SuFoto \} from '@\/ui\/Foto';/);
  });

  it('`10.5-v-d`: and a photo just taken on the form, before it is sent, from the phone’s own file', () => {
    expect(adaptada).toMatch(/export const RecienTomadas = createContext<ReadonlyMap<string, Slot>>\(new Map\(\)\);/);
    // Asked before the folder check, so a hook is never skipped.
    expect(adaptada.indexOf('useContext(RecienTomadas)')).toBeLessThan(adaptada.indexOf('if (path === null'));
  });
});

describe('where the two previews open, and how they differ from Itacate’s pages', () => {
  const asi = cocina('app/(cocina)/asi-la-ven/[oferta]/[linea].tsx');
  const como = cocina('app/(cocina)/como-la-ven.tsx');

  it('each draws the copy, under the dark bar, with no way back over the picture and nothing that opens', () => {
    expect(asi).toMatch(/<BarraVista texto=\{ES\.vista\.platillo\}/);
    expect(asi).toMatch(/<PaginaDePlatillo[\s\S]*?distancia=\{null\}[\s\S]*?onCocina=\{\(\) => \{\}\}[\s\S]*?atras=\{false\}/);
    expect(como).toMatch(/<BarraVista texto=\{ES\.vista\.pagina\}/);
    expect(como).toMatch(/<PaginaDeCocina[\s\S]*?distancia=\{null\}[\s\S]*?onPlatillo=\{\(\) => \{\}\}[\s\S]*?atras=\{false\}/);
    for (const screen of [asi, como]) expect(screen).toMatch(/<SafeAreaInsetsContext\.Provider value=\{\{ \.\.\.insets, top: 0 \}\}>/);
  });

  it('fed from her own rows — never the door', () => {
    for (const screen of [asi, como]) {
      expect(screen).toMatch(/cocinaComoLaVen\(\{ kitchen, place: place\.data, page: page\.data, listings: listings\.data, now: ahora \}\)/);
      expect(screen).not.toMatch(/on_offer_now|useCocinas/);
    }
    expect(como).toMatch(/!seVeEnItacate\(listings\.data, ahora\) && \(/);
  });

  it('*Así la ven* on each of today’s offers; *Ver como la ven* beside *Editar tu página*', () => {
    expect(cocina('ui/OfertaDeHoy.tsx')).toMatch(/accessibilityLabel=\{ES\.vista\.asiLaVen\}\s*onPress=\{onAsiLaVen\}/);
    const ofertas = cocina('app/(cocina)/ofertas.tsx');
    expect(ofertas).toMatch(/if \(listing\.lines\.length === 1\) \{\s*router\.push\(\{ pathname: '\/asi-la-ven\/\[oferta\]\/\[linea\]', params: \{ oferta: listing\.id, linea: '1' \} \}\);\s*\} else \{\s*router\.push\('\/como-la-ven'\);/);
    expect(cocina('app/(cocina)/(tabs)/mi-cocina.tsx')).toMatch(/label=\{ES\.vista\.verComoLaVen\} onPress=\{\(\) => router\.push\('\/como-la-ven'\)\}/);
  });
});
