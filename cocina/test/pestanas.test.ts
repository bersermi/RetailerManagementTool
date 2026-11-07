import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ayudaUrl, whatsappUrl } from '@/auth/support';
import { EN_USO, PESTANAS, pestanaDe } from '@/navigation/pestanas';
import { ES } from '@/strings';
import { LLEGADA, NOTA, retrasoDe } from '@/theme/movimiento';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// WERA COCINA'S SHELL. Plan task `10.5-v-c-i`, the owner's rulings of 2026-11-05 and
// his directions of 2026-11-06 (the family-shell page): the tab bar *Hoy · Apartados ·
// Clientes · Mi cocina*, *Mi cocina*'s rows, Nunito titles, Wera Cocina's green for
// actions, one staggered entrance per screen and the toast on Reanimated, transform and
// opacity only (ADR-035 §2.11). Its twin is Itacate's (`itacate/test/pestanas.test.ts`).
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it pins values and reads source as text — the
// order, the words, the glyphs, the colour, the font's bytes, the motion's numbers and
// which keys an animated style may touch. That the bar draws, a title wears Nunito or
// a card rises is the phone's to show (§2.11); the session's emulator run and the
// owner's look are its evidence.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'cocina/src');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const bytes = (path: string) => createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex');

function sources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}
const files = sources().map((path) => ({ name: path.slice(SRC.length + 1), text: readFileSync(path, 'utf8') }));

// The shipped glyph map, resolved through the package as Wera's tab test does
// (`app/test/tabs.test.ts`): a name not in it is a blank square on the bar.
const GLYPHS = JSON.parse(
  readFileSync(
    createRequire(import.meta.url).resolve(
      '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json',
    ),
    'utf8',
  ),
) as Record<string, number>;

describe('the tab bar — Hoy · Apartados · Clientes · Mi cocina (the ruling of 2026-11-05)', () => {
  it('four tabs at most, in the ruled order, each with its word', () => {
    expect(PESTANAS.map((p) => p.label)).toEqual(['Hoy', 'Apartados', 'Clientes', 'Mi cocina']);
    expect(PESTANAS.length).toBeLessThanOrEqual(4);
  });

  it('the two ends never move, and only they are drawn until reserving and the stamp card ship', () => {
    expect(PESTANAS[0].ruta).toBe('index');
    expect(PESTANAS[PESTANAS.length - 1].ruta).toBe('mi-cocina');
    expect(EN_USO.map((p) => p.label)).toEqual(['Hoy', 'Mi cocina']);
    expect(PESTANAS.filter((p) => p.llega !== null).map((p) => [p.label, p.llega])).toEqual([
      ['Apartados', '10.5b'],
      ['Clientes', '10.9'],
    ]);
    expect(pestanaDe('mi-cocina')?.label).toBe('Mi cocina');
    expect(pestanaDe('apartados')).toBeNull();
  });

  it('every glyph is in the icon set the bar draws with', () => {
    expect(Object.keys(GLYPHS).length).toBeGreaterThan(1000);
    for (const pestana of PESTANAS) expect(GLYPHS[pestana.icono], pestana.icono).toBeTypeOf('number');
  });

  it('the tabs folder holds exactly the tabs in use — no route appears as a tab by accident', () => {
    const tabs = readdirSync(join(SRC, 'app/(cocina)/(tabs)')).filter((name) => name !== '_layout.tsx');
    expect(tabs.sort()).toEqual(EN_USO.map((p) => `${p.ruta}.tsx`).sort());
  });

  it('Tus ofertas is a room pushed over the tabs, not a tab', () => {
    expect(readdirSync(join(SRC, 'app/(cocina)'))).toContain('ofertas.tsx');
    expect(pestanaDe('ofertas')).toBeNull();
  });

  it('Wera’s JavaScript tabs, not the phone’s native ones, with the bar drawn from the data', () => {
    const layout = code('app/(cocina)/(tabs)/_layout.tsx');
    expect(layout).toMatch(/import \{ Tabs \} from 'expo-router\/js-tabs';/);
    expect(layout).not.toMatch(/native-tabs|NativeTabs/);
    expect(layout).toMatch(/EN_USO\.map\(/);
    expect(layout).toMatch(/tabBar=\{\(props\) => <Pestanas \{\.\.\.props\} \/>\}/);
    const bar = code('ui/Pestanas.tsx');
    // The press is told to the tab first, as react-navigation's own bar does.
    expect(bar).toMatch(/navigation\.emit\(\{ type: 'tabPress', target: route\.key, canPreventDefault: true \}\)/);
    expect(bar).toMatch(/if \(!enUso && !evento\.defaultPrevented\) navigation\.navigate/);
    // Never the colour alone: the tab in use also wears the pill and a heavier word.
    // ⚠️ The bar's white, never `transparent`: Android squared every pill after the first switch.
    expect(bar).toMatch(/backgroundColor: enUso \? PALETTE\.accionSuave : PALETTE\.superficie/);
    expect(bar).toMatch(/fontWeight: enUso \? '700' : '600'/);
    expect(bar).toMatch(/accessibilityState=\{\{ selected: enUso \}\}/);
    expect(bar).toMatch(/paddingBottom: insets\.bottom/);
  });
});

describe('Wera Cocina’s green for actions (ruled 2026-11-02, with its icon)', () => {
  it('is the ground of its Android icon, one value — and never Itacate’s blue', () => {
    const app = JSON.parse(readFileSync(join(ROOT, 'cocina/app.json'), 'utf8')).expo;
    expect(PALETTE.accion).toBe('#1C6B4B');
    expect(app.android.adaptiveIcon.backgroundColor).toBe(PALETTE.accion);
    for (const file of files) expect(file.text, file.name).not.toMatch(/#24476B/i);
  });
});

describe('Nunito titles — Wera’s file, byte for byte (the ruling of 2026-11-05)', () => {
  it('the font and its licence are Wera’s files', () => {
    expect(bytes('cocina/src/marca/letras/Nunito-ExtraBold.ttf')).toBe(bytes('app/src/marca/letras/Nunito-ExtraBold.ttf'));
    expect(bytes('cocina/src/marca/letras/OFL-Nunito.txt')).toBe(bytes('app/src/marca/letras/OFL-Nunito.txt'));
  });

  it('`@/theme/letra` is Wera’s code, comments aside', () => {
    const fold = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    expect(fold(read('theme/letra.ts'))).toBe(fold(readFileSync(join(ROOT, 'app/src/theme/letra.ts'), 'utf8')));
  });

  it('loaded before any screen draws, and a failed load never holds the app', () => {
    const root = code('app/_layout.tsx');
    expect(root).toMatch(/const \[fontsReady, fontError\] = useFonts\(FUENTES\);/);
    expect(root).toMatch(/if \(!fontsReady && fontError === null\) return null;/);
  });

  it('every title wears it — the band, and her kitchen’s name on her page’s head — with no weight beside it', () => {
    expect(code('ui/Banda.tsx')).toMatch(/accessibilityRole="header" style=\{\{ fontSize: SIZE\.titleSize, \.\.\.TITULO, color: PALETTE\.tinta \}\}/);
    expect(code('ui/Portada.tsx')).toMatch(/style=\{\{ fontSize: SIZE\.bodySize \+ 1, \.\.\.TITULO, color: PALETTE\.tinta \}\}>\s*\{nombre\}/);
    for (const file of files) {
      expect(file.text, file.name).not.toMatch(/\.\.\.TITULO[^}]*fontWeight|fontWeight[^}]*\.\.\.TITULO/);
    }
  });

  it('and Itacate’s copy of her page’s head wears it too, with the dish’s page (`10.5-v-b`’s decision (d))', () => {
    const itacate = (path: string) => readFileSync(join(ROOT, 'itacate/src', path), 'utf8');
    expect(itacate('ui/PaginaDeCocina.tsx')).toMatch(/accessibilityRole="header" style=\{\{ fontSize: SIZE\.titleSize - 2, \.\.\.TITULO, color: PALETTE\.tinta \}\}/);
    expect(itacate('ui/PaginaDePlatillo.tsx')).toMatch(
      /accessibilityRole="header" style=\{\{ flexShrink: 1, fontSize: SIZE\.titleSize, \.\.\.TITULO, color: PALETTE\.tinta \}\}/,
    );
  });
});

describe('one staggered entrance per screen, and the toast — transform and opacity only (ADR-035 §2.11)', () => {
  it('fades in and rises 8 px, 40 ms apart, Itacate’s numbers, and the far blocks are simply there', () => {
    const itacate = readFileSync(join(ROOT, 'itacate/src/theme/movimiento.ts'), 'utf8');
    expect(itacate).toMatch(/distancia: 8,[\s\S]*?duracion: 240,[\s\S]*?entreUno: 40,[\s\S]*?ultimo: 6,/);
    expect(LLEGADA).toEqual({ distancia: 8, duracion: 240, entreUno: 40, ultimo: 6 });
    expect(retrasoDe(0)).toBe(0);
    expect(retrasoDe(1)).toBe(40);
    expect(retrasoDe(LLEGADA.ultimo)).toBe(LLEGADA.ultimo * 40);
    expect(retrasoDe(LLEGADA.ultimo + 1)).toBeNull();
    expect(retrasoDe(-3)).toBe(0);
  });

  it('`@/ui/Llega` is Itacate’s part, comments aside', () => {
    const fold = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
    expect(fold(read('ui/Llega.tsx'))).toBe(fold(readFileSync(join(ROOT, 'itacate/src/ui/Llega.tsx'), 'utf8')));
  });

  it('Reanimated is drawn by the two motion parts alone, and their styles touch opacity and transform only', () => {
    const animators = files.filter((f) => /from 'react-native-reanimated'/.test(f.text)).map((f) => f.name);
    expect(animators.sort()).toEqual(['ui/Llega.tsx', 'ui/Nota.tsx']);
    const estilos = animators.flatMap((name) => [...code(name).matchAll(/useAnimatedStyle\(\(\) => \(\{([\s\S]*?)\}\)\)/g)].map((m) => m[1]));
    expect(estilos.length).toBe(2);
    for (const estilo of estilos) {
      const claves = [...estilo.matchAll(/(?:^|[{,]\s*)([a-zA-Z]+):/g)].map((m) => m[1]).filter((k) => k !== 'translateY');
      expect(claves.every((clave) => clave === 'opacity' || clave === 'transform'), estilo).toBe(true);
    }
    // And nothing else animates: no core `Animated`, no layout animation.
    for (const file of files) {
      expect(file.text, file.name).not.toMatch(/\bAnimated\.(timing|spring|Value)\b|LayoutAnimation|entering=|exiting=/);
    }
  });

  it('started once, from an effect, and a phone set to reduce motion shows everything at once', () => {
    for (const path of ['ui/Llega.tsx', 'ui/Nota.tsx']) {
      const text = code(path);
      expect(text, path).toMatch(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/);
      expect(text, path).toMatch(/reduceMotion: ReduceMotion\.System/);
    }
  });

  it('every screen of the shell arrives — the two tabs and Tus ofertas', () => {
    for (const path of ['app/(cocina)/(tabs)/index.tsx', 'app/(cocina)/(tabs)/mi-cocina.tsx', 'app/(cocina)/ofertas.tsx']) {
      expect(code(path), path).toMatch(/<Llega i=\{0\}/);
    }
  });
});

describe('the toast — over every route, above the tab bar, Deshacer for 8 seconds', () => {
  it('at the root, inside the session and the queries, around the stack', () => {
    const root = code('app/_layout.tsx');
    const order = ['<AuthProvider>', '<QueryProvider>', '<NotaProvider>', '<Stack', '</NotaProvider>'].map((s) => root.indexOf(s));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('above the bar and the phone’s bottom inset, and heard by a screen reader', () => {
    const nota = code('ui/Nota.tsx');
    expect(nota).toMatch(/bottom: insets\.bottom \+ SOBRE_LA_BARRA/);
    expect(nota).toMatch(/accessibilityLiveRegion="polite"/);
    expect(code('lib/NotaProvider.tsx')).toMatch(/AccessibilityInfo\.announceForAccessibility\(texto\)/);
  });

  it('leaves on its own — 8 seconds with Deshacer — but never while it is undoing', () => {
    const provider = code('lib/NotaProvider.tsx');
    expect(provider).toMatch(/if \(nota === null \|\| deshaciendo\) return undefined;/);
    expect(provider).toMatch(/nota\.deshacer === null \? NOTA\.solo : NOTA\.conDeshacer/);
    expect(NOTA.conDeshacer).toBe(8_000);
  });
});

describe('*Mi cocina* — what she sets once, in the page’s order', () => {
  const screen = code('app/(cocina)/(tabs)/mi-cocina.tsx');

  it('her page’s head, its checklist, where she hands food over, her trade, help, her account', () => {
    const order = ['<Portada', '<Pendientes', 'ES.cocina.donde', 'ES.miCocina.giro', 'ES.miCocina.ayuda', '<Salidas'].map((s) => screen.indexOf(s));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('the second door stays: a trade or an address that is missing says so, in red, with its door', () => {
    expect(screen).toMatch(/detalle=\{missingGiro \? ES\.cocina\.sinGiro : trade\}\s*falta=\{missingGiro\}/);
    expect(screen).toMatch(/variante=\{missingAddress \? 'principal' : 'suave'\}/);
  });

  it('help by WhatsApp only on a build with the owner’s number, a chat naming this app and her address', () => {
    expect(screen).toMatch(/const numero = SUPPORT_WHATSAPP;/);
    expect(screen).toMatch(/\{numero !== null && \(/);
    expect(screen).toMatch(/Linking\.openURL\(ayudaUrl\(numero, session\?\.user\.email\)\)/);
    expect(ayudaUrl('525500000000', 'lupe@correo.mx')).toBe(
      whatsappUrl('525500000000', 'Hola, necesito ayuda con Wera Cocina. Mi correo es lupe@correo.mx'),
    );
    expect(ayudaUrl('525500000000', '  ')).toBe(whatsappUrl('525500000000', 'Hola, necesito ayuda con Wera Cocina.'));
    expect(ES.miCocina.whatsapp).toBe('Escríbenos por WhatsApp');
  });

  it('and the aviso, which every link of this app opens', () => {
    expect(screen).toMatch(/WebBrowser\.openBrowserAsync\(AVISO_URL\)/);
  });
});
