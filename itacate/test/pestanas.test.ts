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
// family-shell page): the tab bar *Cerca · Apartados · Mis cocinas · Tú*, *Tú*'s rows,
// Nunito titles, Itacate's blue for actions, one staggered entrance per screen on
// Reanimated, transform and opacity only (ADR-035 §2.11).
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it pins values and reads source as text — the
// order, the words, the glyphs, the colour, the font's bytes, the motion's numbers and
// which keys an animated style may touch. That the bar draws, a title wears Nunito or
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

describe('the tab bar — Cerca · Apartados · Mis cocinas · Tú (the ruling of 2026-11-05)', () => {
  it('four tabs at most, in the ruled order, each with its word', () => {
    expect(PESTANAS.map((p) => p.label)).toEqual(['Cerca', 'Apartados', 'Mis cocinas', 'Tú']);
    expect(PESTANAS.length).toBeLessThanOrEqual(4);
  });

  it('the two ends never move, and only they are drawn until reserving and the stamp card ship', () => {
    expect(PESTANAS[0].ruta).toBe('index');
    expect(PESTANAS[PESTANAS.length - 1].ruta).toBe('tu');
    expect(EN_USO.map((p) => p.label)).toEqual(['Cerca', 'Tú']);
    expect(PESTANAS.filter((p) => p.llega !== null).map((p) => [p.label, p.llega])).toEqual([
      ['Apartados', '10.5b'],
      ['Mis cocinas', '10.9'],
    ]);
    expect(pestanaDe('tu')?.label).toBe('Tú');
    expect(pestanaDe('apartados')).toBeNull();
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

describe('Nunito titles — Wera’s file, byte for byte (the ruling of 2026-11-05)', () => {
  it('the font and its licence are Wera’s files', () => {
    expect(bytes('itacate/src/marca/letras/Nunito-ExtraBold.ttf')).toBe(bytes('app/src/marca/letras/Nunito-ExtraBold.ttf'));
    expect(bytes('itacate/src/marca/letras/OFL-Nunito.txt')).toBe(bytes('app/src/marca/letras/OFL-Nunito.txt'));
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

  it('every title wears it — the band, a tab’s head, a sheet’s name and, since `10.5-v-c-i`, the two pages’ — with no weight beside it', () => {
    for (const path of ['ui/Banda.tsx', 'ui/Cabeza.tsx', 'ui/Hoja.tsx', 'ui/PaginaDeCocina.tsx', 'ui/PaginaDePlatillo.tsx']) {
      const text = code(path);
      expect(text, path).toMatch(/\.\.\.TITULO/);
    }
    for (const file of files) {
      expect(file.text, file.name).not.toMatch(/\.\.\.TITULO[^}]*fontWeight|fontWeight[^}]*\.\.\.TITULO/);
    }
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

  it('Reanimated is drawn by the two motion parts alone, and their styles touch opacity and transform only', () => {
    const animators = files.filter((f) => /from 'react-native-reanimated'/.test(f.text)).map((f) => f.name);
    expect(animators.sort()).toEqual(['ui/Hoja.tsx', 'ui/Llega.tsx']);
    const estilos = animators.flatMap((name) => [...code(name).matchAll(/useAnimatedStyle\(\(\) => \(\{([\s\S]*?)\}\)\)/g)].map((m) => m[1]));
    expect(estilos.length).toBe(3);
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
    for (const path of ['ui/Llega.tsx', 'ui/Hoja.tsx']) {
      const text = code(path);
      expect(text, path).toMatch(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/);
      expect(text, path).toMatch(/reduceMotion: ReduceMotion\.System/);
    }
  });

  it('every screen of the shell arrives — the two tabs, Dónde buscar and the way in', () => {
    for (const path of ['app/(vecino)/(tabs)/index.tsx', 'app/(vecino)/(tabs)/tu.tsx', 'app/(vecino)/donde.tsx', 'app/(auth)/entrar.tsx']) {
      expect(code(path), path).toMatch(/<Llega i=\{0\}/);
    }
    // The list's cards arrive in their order; a new order is not a second arrival (keyed cards).
    expect(code('app/(vecino)/(tabs)/index.tsx')).toMatch(/renderItem=\{\(\{ item, index \}\) => \(\s*<Llega i=\{index\}>/);
  });
});

describe('*Tú* — her account, Dónde buscar, the aviso, help, her way out, and Itacate, de Wera', () => {
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
      whatsappUrl('525500000000', 'Hola, necesito ayuda con Itacate. Mi correo es laura@correo.mx'),
    );
    expect(ayudaUrl('525500000000', '  ')).toBe(whatsappUrl('525500000000', 'Hola, necesito ayuda con Itacate.'));
  });

  it('Itacate, de Wera — under Wera’s cow, its rust file byte for byte', () => {
    expect(ES.tu.deWera).toBe('Itacate, de Wera');
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

  it('sits in the head of the list — the sheet the map will slide under — and Cambiar opens Dónde buscar', () => {
    const list = code('app/(vecino)/(tabs)/index.tsx');
    expect(list).toMatch(/derecha=\{tarjetas\.length > 1 \? <Ordenar orden=\{orden\} onOrden=\{setOrden\} \/> : null\}/);
    expect(list).toMatch(/<Desde origen=\{origen\} onCambiar=\{\(\) => router\.push\('\/donde'\)\} \/>/);
    // The list no longer opens *Tu cuenta* and draws no way out of its own: *Tú* does.
    expect(list).not.toMatch(/\/cuenta|Salidas|signOut/);
  });
});
