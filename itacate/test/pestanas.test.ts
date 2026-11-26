import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { whatsappUrl } from '@/auth/support';
import { EN_USO, PESTANAS, pestanaDe } from '@/navigation/pestanas';
import { ayudaUrl, cuentaDe, esDeApple, formasDe } from '@/lib/tu';
import { ES } from '@/strings';
import { HOJA, LLEGADA, razonDeAmortiguamiento, retrasoDe } from '@/theme/movimiento';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// ITACATE'S SHELL. Plan task `10.5-v-b`, the owner's rulings of 2026-11-05 (the
// family-shell page): the tab bar — *Cerca · Mis cocinas · Tú* since `10.9d-ii` (G39) — *Tú*'s rows,
// Archivo titles (Nunito until `11.7-i`), Itacate's blue for actions, one staggered entrance per screen on
// Reanimated, transform and opacity only (ADR-035 §2.11).
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it pins values and reads source as text — the
// order, the words, the glyphs, the colour, the font's bytes, the motion's numbers and
// which keys an animated style may touch. That the bar draws, a title wears Archivo or
// a card rises is the phone's to show (§2.11); the session's emulator run and the
// owner's look are its evidence.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'itacate/src');
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

describe('the tab bar — Cerca · Mis cocinas · Tú (the ruling of 2026-11-05, re-ruled G39 on 2026-11-17)', () => {
  it('three tabs, in the ruled order, each with its word — four at most', () => {
    expect(PESTANAS.map((p) => p.label)).toEqual(['Cerca', 'Mis cocinas', 'Tú']);
    expect(PESTANAS.length).toBeLessThanOrEqual(4);
  });

  it('the two ends never move; Apartados is no tab since `10.9d-ii`, and Mis cocinas is drawn', () => {
    expect(PESTANAS[0].ruta).toBe('index');
    expect(PESTANAS[PESTANAS.length - 1].ruta).toBe('tu');
    expect(EN_USO.map((p) => p.label)).toEqual(['Cerca', 'Mis cocinas', 'Tú']);
    expect(PESTANAS.filter((p) => p.llega !== null)).toEqual([]);
    expect(pestanaDe('tu')?.label).toBe('Tú');
    expect(pestanaDe('mis-cocinas')?.label).toBe('Mis cocinas');
    expect(pestanaDe('apartados')).toBeNull();
  });

  it('a dot on Mis cocinas while a reservation is pinned — drawn by the bar, from `hayPunto`', () => {
    const bar = code('ui/Pestanas.tsx');
    expect(bar).toMatch(/const punto = hayPunto\(apartados\.data, ahora\);/);
    expect(bar).toMatch(/\{punto && pestana\.ruta === CON_PUNTO && \(/);
    expect(bar).toMatch(/const CON_PUNTO = 'mis-cocinas';/);
  });

  it('every glyph is in the icon set the bar draws with', () => {
    expect(Object.keys(GLYPHS).length).toBeGreaterThan(1000);
    for (const pestana of PESTANAS) expect(GLYPHS[pestana.icono], pestana.icono).toBeTypeOf('number');
  });

  it('the tabs folder holds exactly the tabs in use — no route appears as a tab by accident', () => {
    const tabs = readdirSync(join(SRC, 'app/(vecino)/(tabs)')).filter((name) => name !== '_layout.tsx');
    expect(tabs.sort()).toEqual(EN_USO.map((p) => `${p.ruta}.tsx`).sort());
  });

  it('Wera’s JavaScript tabs, not the phone’s native ones, with the bar drawn from the data', () => {
    const layout = code('app/(vecino)/(tabs)/_layout.tsx');
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

describe('Itacate’s blue for actions (the ruling of 2026-11-05)', () => {
  it('is the ground of its Android icon, one value', () => {
    const app = JSON.parse(readFileSync(join(ROOT, 'itacate/app.json'), 'utf8')).expo;
    expect(PALETTE.accion).toBe('#24476B');
    expect(app.android.adaptiveIcon.backgroundColor).toBe(PALETTE.accion);
    expect(PALETTE.accionSuave).toBe('#E3EAF2');
  });

  it('and no screen draws Wera’s green any more', () => {
    for (const file of files) expect(file.text, file.name).not.toMatch(/#1C6B4B/i);
  });
});

// ⚠️ `11.7-i` (2026-11-26): DIRECTION A'S FACE, AND WERA'S AGAIN. Wera moved to Archivo at `11.6`; between that
// row and this one the two siblings' Nunito was held to each other. Now both carry Wera's two Archivo files, its
// licence, its `@/theme/letra` and its `@/marca/fuentes`, and are held to them as they were to its Nunito.
describe('Archivo titles, headings and the big number — Wera’s files and code (`11.7-i`, his yes at `11.5-ii`)', () => {
  it('the two cuts and their licence are Wera’s files, byte for byte — and Nunito is gone', () => {
    for (const file of ['ArchivoSemiExpanded-ExtraBold.ttf', 'ArchivoCondensed-Bold.ttf', 'OFL-Archivo.txt']) {
      expect(bytes(`itacate/src/marca/letras/${file}`), file).toBe(bytes(`app/src/marca/letras/${file}`));
    }
    expect(readdirSync(join(SRC, 'marca/letras')).sort()).toEqual(readdirSync(join(ROOT, 'app/src/marca/letras')).sort());
    for (const file of files) expect(file.text, file.name).not.toMatch(/Nunito-ExtraBold\.ttf/);
  });

  it('`@/theme/letra` and `@/marca/fuentes` are Wera’s code, comments aside', () => {
    const fold = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    expect(fold(read('theme/letra.ts'))).toBe(fold(readFileSync(join(ROOT, 'app/src/theme/letra.ts'), 'utf8')));
    expect(fold(read('marca/fuentes.ts'))).toBe(fold(readFileSync(join(ROOT, 'app/src/marca/fuentes.ts'), 'utf8')));
    // And a heading's first letter the way Wera capitalises one that arrives built.
    expect(fold(read('format/oracion.ts'))).toBe(fold(readFileSync(join(ROOT, 'app/src/format/oracion.ts'), 'utf8')));
  });

  it('loaded before any screen draws, and a failed load never holds the app', () => {
    const root = code('app/_layout.tsx');
    expect(root).toMatch(/import \{ FUENTES \} from '@\/marca\/fuentes';/);
    expect(root).toMatch(/const \[fontsReady, fontError\] = useFonts\(FUENTES\);/);
    expect(root).toMatch(/if \(!fontsReady && fontError === null\) return null;/);
  });

  it('a title at the title’s size says its line — `letraTitulo(SIZE)`, never the size alone beside the face', () => {
    // ⚠️ Archivo's line box is not Nunito's: a title at `titleSize` with no line moves its header.
    for (const file of files) expect(file.text, file.name).not.toMatch(/fontSize: SIZE\.titleSize, \.\.\.TITULO/);
  });

  it('the spaced capitals are headings — no `uppercase` anywhere, the words written in sentence case in `@/strings`', () => {
    for (const file of files) expect(file.text, file.name).not.toMatch(/textTransform: 'uppercase'/);
  });

  it('every title wears it — the band, a tab’s head, a sheet’s name and, since `10.5-v-c-i`, the two pages’ — with no weight beside it', () => {
    for (const path of ['ui/Banda.tsx', 'ui/Cabeza.tsx', 'ui/Hoja.tsx', 'ui/PaginaDeCocina.tsx', 'ui/PaginaDePlatillo.tsx']) {
      expect(code(path), path).toMatch(/\.\.\.TITULO|\.\.\.letraTitulo\(SIZE\)/);
    }
    for (const file of files) {
      expect(file.text, file.name).not.toMatch(/\.\.\.(TITULO|letra[A-Z]\w*\(SIZE\))[^}]*fontWeight|fontWeight[^}]*\.\.\.(TITULO|letra[A-Z]\w*\(SIZE\))/);
    }
  });

  it('a tab’s head may take two lines — at the iPhone’s largest text Archivo cut *Cerca de ti* held to one (`11.5-ii`)', () => {
    expect(code('ui/Cabeza.tsx')).toMatch(/numberOfLines=\{2\}\s*style=\{\{ flex: 1, \.\.\.letraTitulo\(SIZE\)/);
  });
});

describe('one staggered entrance per screen, transform and opacity only (ADR-035 §2.11)', () => {
  it('fades in and rises 8 px, 40 ms apart, and the far blocks are simply there', () => {
    expect(LLEGADA.distancia).toBe(8);
    expect(LLEGADA.entreUno).toBe(40);
    expect(retrasoDe(0)).toBe(0);
    expect(retrasoDe(1)).toBe(40);
    expect(retrasoDe(LLEGADA.ultimo)).toBe(LLEGADA.ultimo * 40);
    expect(retrasoDe(LLEGADA.ultimo + 1)).toBeNull();
    expect(retrasoDe(-3)).toBe(0);
  });

  it('the sheet’s spring is slight: it overshoots, and settles without a second bounce', () => {
    const razon = razonDeAmortiguamiento(HOJA.resorte);
    expect(razon).toBeGreaterThan(0.65);
    expect(razon).toBeLessThan(0.95);
  });

  it('Reanimated is drawn by the motion parts alone — and the list sliding over the map (`10.5-iv-b-i`) and *Ya lo tengo*\'s swipe (`10.5b-iii-a`) — their styles opacity and transform only', () => {
    const animators = files.filter((f) => /from 'react-native-reanimated'/.test(f.text)).map((f) => f.name);
    expect(animators.sort()).toEqual(['ui/Deslizar.tsx', 'ui/Hoja.tsx', 'ui/HojaDeLista.tsx', 'ui/Llega.tsx']);
    const estilos = animators.flatMap((name) => [...code(name).matchAll(/useAnimatedStyle\(\(\) => \(\{([\s\S]*?)\}\)\)/g)].map((m) => m[1]));
    expect(estilos.length).toBe(6);
    for (const estilo of estilos) {
      const claves = [...estilo.matchAll(/(?:^|[{,]\s*)([a-zA-Z]+):/g)].map((m) => m[1]).filter((k) => k !== 'translateY' && k !== 'translateX');
      expect(claves.every((clave) => clave === 'opacity' || clave === 'transform'), estilo).toBe(true);
    }
    // And nothing else animates: no core `Animated`, no layout animation.
    for (const file of files) {
      expect(file.text, file.name).not.toMatch(/\bAnimated\.(timing|spring|Value)\b|LayoutAnimation|entering=|exiting=/);
    }
  });

  it('started once, from an effect, and a phone set to reduce motion shows everything at once', () => {
    for (const path of ['ui/Llega.tsx', 'ui/Hoja.tsx']) {
      const text = code(path);
      expect(text, path).toMatch(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/);
      expect(text, path).toMatch(/reduceMotion: ReduceMotion\.System/);
    }
  });

  it('every screen of the shell arrives — the three tabs, Dónde buscar and the way in', () => {
    for (const path of ['app/(vecino)/(tabs)/index.tsx', 'app/(vecino)/(tabs)/mis-cocinas.tsx', 'app/(vecino)/(tabs)/tu.tsx', 'app/(vecino)/apartados.tsx', 'app/(vecino)/donde.tsx', 'app/(auth)/entrar.tsx']) {
      expect(code(path), path).toMatch(/<Llega i=\{0\}/);
    }
    // The list's cards arrive in their order; a new order is not a second arrival (keyed cards).
    expect(code('app/(vecino)/(tabs)/index.tsx')).toMatch(/renderItem=\{\(\{ item, index \}\) => \(\s*<Llega i=\{index\}>/);
  });
});

describe('*Tú* — her account, Dónde buscar, the aviso, help, her way out, and its signature, Wera', () => {
  const google = { email: 'laura@correo.mx', user_metadata: { full_name: 'Laura Pérez' }, app_metadata: { provider: 'google', providers: ['google'] } };

  it('state first: who is signed in, then the doors, in the page’s order', () => {
    const screen = code('app/(vecino)/(tabs)/tu.tsx');
    const order = ['cuenta.titulo', 'ES.tu.dondeBuscar', 'ES.tu.aviso', 'ES.tu.ayuda', '<Salidas />', 'ES.tu.deWera'].map((s) => screen.indexOf(s));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Her account's row is state: nothing to tap.
    expect(screen).toMatch(/<Fila icono="account-outline" titulo=\{cuenta\.titulo\} detalle=\{cuenta\.detalle\} \/>/);
  });

  it('her account: her name, her address and how she signs in — never an address Apple made up', () => {
    expect(cuentaDe(google)).toEqual({ titulo: 'Laura Pérez', detalle: 'laura@correo.mx · Entras con Google' });
    expect(cuentaDe({ email: 'laura@correo.mx', app_metadata: { provider: 'email', providers: ['email'] } })).toEqual({
      titulo: 'laura@correo.mx',
      detalle: 'Entras con tu correo',
    });
    expect(
      cuentaDe({ email: 'x7k@privaterelay.appleid.com', user_metadata: { full_name: 'Laura' }, app_metadata: { providers: ['apple'] } }),
    ).toEqual({ titulo: 'Laura', detalle: 'Entras con Apple' });
    expect(esDeApple('X7K@PrivateRelay.AppleID.com ')).toBe(true);
    expect(cuentaDe(null)).toEqual({ titulo: null, detalle: null });
  });

  it('every way she signs in, Google first, then Apple, then her address', () => {
    expect(formasDe({ app_metadata: { provider: 'email', providers: ['email', 'apple', 'google'] } })).toEqual(['google', 'apple', 'correo']);
    expect(formasDe({ app_metadata: { provider: 'google' } })).toEqual(['google']);
    expect(formasDe({ app_metadata: { providers: ['github'] } })).toEqual([]);
    expect(ES.tu.entrasCon(['Google', 'tu correo'])).toBe('Entras con Google o con tu correo');
    expect(ES.tu.entrasCon(['Google', 'Apple', 'tu correo'])).toBe('Entras con Google, con Apple o con tu correo');
  });

  it('Dónde buscar says her pick, and opens the screen that changes it', () => {
    const screen = code('app/(vecino)/(tabs)/tu.tsx');
    expect(screen).toMatch(/detalle=\{codigo === null \? ES\.tu\.miUbicacion : ES\.tu\.codigoPostal\(codigo\.cp\)\}/);
    expect(screen).toMatch(/onPress=\{\(\) => router\.push\('\/donde'\)\}/);
    expect(ES.tu.codigoPostal('06400')).toBe('Código postal 06400');
  });

  it('the aviso is the page every link of this app opens', () => {
    expect(code('app/(vecino)/(tabs)/tu.tsx')).toMatch(/WebBrowser\.openBrowserAsync\(AVISO_URL\)/);
  });

  it('help by WhatsApp: only on a build with the owner’s number, a chat naming this app and her address', () => {
    const screen = code('app/(vecino)/(tabs)/tu.tsx');
    expect(screen).toMatch(/const numero = SUPPORT_WHATSAPP;/);
    expect(screen).toMatch(/\{numero !== null && \(/);
    expect(screen).toMatch(/Linking\.openURL\(ayudaUrl\(numero, session\?\.user\.email\)\)/);
    expect(ayudaUrl('525500000000', 'laura@correo.mx')).toBe(
      whatsappUrl('525500000000', 'Hola, necesito ayuda con Wera. Mi correo es laura@correo.mx'),
    );
    expect(ayudaUrl('525500000000', '  ')).toBe(whatsappUrl('525500000000', 'Hola, necesito ayuda con Wera.'));
  });

  it('Wera — under Wera’s cow, its rust file byte for byte', () => {
    expect(ES.tu.deWera).toBe('Wera');
    expect(code('app/(vecino)/(tabs)/tu.tsx')).toMatch(/require\('@\/marca\/vaca-oxido\.png'\)/);
    expect(bytes('itacate/src/marca/vaca-oxido.png')).toBe(bytes('app/src/marca/vaca-oxido.png'));
  });
});

describe('*Ordenar* — a button at the list’s head, and a sheet (the family-shell page)', () => {
  it('says the order in use, and offers each with the page’s line under it', () => {
    expect(ES.cerca.ordenarPor(ES.cerca.orden.ahora)).toBe('Ordenar: Ahora');
    expect(ES.cerca.ordenDetalle).toEqual({ ahora: 'Lo que puedes recoger ya, primero', cerca: 'Por distancia', barato: 'Por precio' });
    const ordenar = code('ui/Ordenar.tsx');
    expect(ordenar).toMatch(/<Hoja visible=\{abierta\} titulo=\{ES\.cerca\.ordenar\}/);
    expect(ordenar).toMatch(/ORDENES\.map\(/);
    expect(ordenar).toMatch(/onOrden\(cual\);\s*setAbierta\(false\);/);
  });

  it('sits in the head of the list — the sheet that slides over the map — and Cambiar opens Dónde buscar', () => {
    const list = code('app/(vecino)/(tabs)/index.tsx');
    // ⚠️ `10.5-iv-b-iii`: counted on the cards she sees — those within 3 km and the ones she tapped on the map.
    expect(list).toMatch(/derecha=\{hayLista && visibles > 1 \? <Ordenar orden=\{orden\} onOrden=\{setOrden\} \/> : null\}/);
    expect(list).toMatch(/const visibles = enElMapa\.length \+ resto\.length;/);
    // And, while the list measures from a zone of the map, *En esta zona del mapa* in Cambiar's place.
    expect(list).toMatch(/\) : \(\s*hayLista && <Desde origen=\{origen\} onCambiar=\{\(\) => router\.push\('\/donde'\)\} \/>\s*\)\}/);
    // ⚠️ `10.5-iv-b-i`: the head is the sheet's — under its handle, with no room for the phone's clock.
    expect(list).toMatch(/<Cabeza\s+titulo=\{ES\.cerca\.titulo\}\s+enHoja/);
    expect(list).toMatch(/<HojaDeLista[\s\S]*cabeza=\{\s*<Cabeza/);
    // The list no longer opens *Tu cuenta* and draws no way out of its own: *Tú* does.
    expect(list).not.toMatch(/\/cuenta|Salidas|signOut/);
  });
});
