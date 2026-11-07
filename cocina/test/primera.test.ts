import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { firstTime, type DeviceStore } from '@/lib/store';
import { ES } from '@/strings';
import {
  COW_BOX,
  ICON_VIEW_UNITS,
  MARK_UNITS,
  OPENING,
  OPENING_KEY,
  SELLO,
  SPLASH_FADE_MS,
  SPLASH_IMAGE_WIDTH,
  SPLASH_VIEW_UNITS,
  SQUARE_SIDE,
  esperaDe,
  openingLength,
  settledScale,
} from '@/theme/apertura';

// ============================================================================
// THE FIRST RUN — plan task `10.5-v-d`, the family-shell page's (ruled 2026-11-05): the cow's
// opening on Cocina's green with *Vende hasta el último plato*, her account, her kitchen's
// name and trade, her address, *¿Qué ofreces hoy?* — her first offer, or *Después* — and her
// page as her neighbours see it, then *Hoy*.
//
// The guard's moves are `test/guard.test.ts`'s. What is pinned here: the opening starts on
// the splash's own frame and ends on the icon's picture, read off the files that draw those;
// it plays once per phone; and each screen hands on to the next, read as text. ⚠️ WHAT THIS
// CANNOT SEE (ADR-035 §2.11): a frame move, or the router land — the emulator and his phones.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const bytes = (path: string) => readFileSync(join(ROOT, path)).toString('base64');
const code = (path: string) => read(join('cocina/src', path)).replace(/^\s*\/\/.*$/gm, '');

describe('the opening starts where Wera Cocina’s splash leaves her', () => {
  it('uses the width the splash draws its picture at', () => {
    const app = JSON.parse(read('cocina/app.json')) as { expo: { plugins: (string | [string, { imageWidth?: number }])[] } };
    const splash = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect(Array.isArray(splash) ? splash[1].imageWidth : null).toBe(SPLASH_IMAGE_WIDTH);
  });

  it('uses the view boxes this app’s script draws the splash and the icon from', () => {
    const script = read('store/cocina-itacate/render.sh');
    const splash = /cat > "\$WORK\/app-splash\.html"[\s\S]*?viewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/.exec(script);
    const icon = /cat > "\$WORK\/app-icon\.html"[\s\S]*?viewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/.exec(script);
    expect(splash?.[3]).toBe(String(SPLASH_VIEW_UNITS));
    expect(icon?.slice(1)).toEqual(['-70', '-70', String(ICON_VIEW_UNITS), String(ICON_VIEW_UNITS)]);
    expect(read('brand/wera-mark.svg')).toContain(`viewBox="0 0 ${MARK_UNITS} ${MARK_UNITS}"`);
  });

  it('puts the whole mark at the size the splash shows it, and the icon square around it', () => {
    expect(COW_BOX).toBeCloseTo(158.58, 1);
    expect(SQUARE_SIDE / COW_BOX).toBeCloseTo(ICON_VIEW_UNITS / MARK_UNITS, 6);
    expect(SQUARE_SIDE * settledScale(SELLO)).toBeCloseTo(SELLO, 6);
  });

  it('with Wera’s steps, over in under two seconds', () => {
    const wera = read('app/src/theme/apertura.ts');
    for (const [key, value] of Object.entries(OPENING)) {
      const twin = key === 'wordsFrom' ? 'doorsFrom' : key === 'wordsFor' ? 'doorsFor' : key;
      expect(wera, key).toMatch(new RegExp(`${twin}: ${value.toLocaleString('en-US').replace(',', '_')},`));
    }
    expect(openingLength()).toBeLessThan(2_000);
    expect(openingLength()).toBeGreaterThan(1_000);
  });

  it('on Android, after the splash’s own fade — expo-splash-screen’s default, read off its source', () => {
    const kotlin = read('node_modules/expo-splash-screen/android/src/main/java/expo/modules/splashscreen/SplashScreenModule.kt');
    expect(kotlin).toMatch(new RegExp(`val duration: Long = ${SPLASH_FADE_MS}L`));
    expect(read('node_modules/expo-splash-screen/build/SplashScreen.types.d.ts')).toMatch(/@platform ios\s+\* @default false\s+\*\/\s+fade\?: boolean;/);
    expect(esperaDe('android')).toBe(SPLASH_FADE_MS);
    expect(esperaDe('ios')).toBe(0);
    const apertura = code('ui/Apertura.tsx');
    // The five steps, each after the fade — and the invisible point's beat, which lasts until the first.
    expect((apertura.match(/ESPERA \+ OPENING\.\w+From,\s*with(Timing|Sequence)\(/g) ?? []).length).toBe(5);
    // The opening she sees, from the first move to the buttons, is still under two seconds.
    expect(openingLength() - OPENING.squareFrom).toBeLessThan(2_000);
  });

  it('drawing Wera’s cream cow, byte for byte — green by tint, so no second picture', () => {
    expect(bytes('cocina/src/marca/vaca-crema.png')).toBe(bytes('app/src/marca/vaca-crema.png'));
    const apertura = code('ui/Apertura.tsx');
    expect(apertura).toMatch(/require\('@\/marca\/vaca-crema\.png'\)/);
    expect(apertura).toMatch(/tintColor: PALETTE\.accion/);
  });
});

describe('it plays once per phone', () => {
  function memoria(): DeviceStore & { readonly datos: Map<string, string> } {
    const datos = new Map<string, string>();
    return {
      datos,
      getItem: (k) => datos.get(k) ?? null,
      setItem: (k, v) => void datos.set(k, v),
      removeItem: (k) => void datos.delete(k),
    };
  }

  it('the first time, and never again', () => {
    const store = memoria();
    expect(firstTime(store, OPENING_KEY)).toBe(true);
    expect(firstTime(store, OPENING_KEY)).toBe(false);
    expect(store.datos.get(OPENING_KEY)).toBe('1');
  });

  it('and not at all where nothing can be remembered — an opening on every launch is worse than none', () => {
    expect(firstTime(undefined, OPENING_KEY)).toBe(false);
    const sorda: DeviceStore = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    expect(firstTime(sorda, OPENING_KEY)).toBe(false);
  });

  it('asked once, as the screen mounts', () => {
    expect(code('app/(auth)/hola.tsx')).toMatch(/const \[plays\] = useState\(\(\) => firstTime\(deviceStore\(\), OPENING_KEY\)\);/);
  });
});

describe('the splash lets go where she will see the screen', () => {
  it('held from the root’s module; let go by the opening once its cow is in, and by the guard everywhere else', () => {
    const root = code('app/_layout.tsx');
    expect(root).toMatch(/^holdSplash\(\);$/m);
    expect(root).toMatch(/if \(ready && pathname !== '\/hola'\) releaseSplash\(\);/);
    expect(code('app/(auth)/hola.tsx')).toMatch(/onCargada=\{releaseSplash\}/);
    expect(code('ui/Apertura.tsx')).toMatch(/useEffect\(\(\) => \{\s*if \(!listo\) return;\s*onCargada\(\);/);
  });

  it('and while the splash leaves, one invisible point changes every frame, so Android lets the screen draw at once', () => {
    const apertura = code('ui/Apertura.tsx');
    expect(apertura).toMatch(/latido\.value = withTiming\(1, \{ duration: ESPERA \+ OPENING\.squareFrom, easing: Easing\.linear, reduceMotion: ReduceMotion\.Never \}\);/);
    expect(apertura).toMatch(/const pulso = useAnimatedStyle\(\(\) => \(\{ opacity: 0\.01 \+ 0\.01 \* latido\.value \}\)\);/);
    expect(apertura).toMatch(/width: 1, height: 1/);
  });

  it('and the cow is drawn at once — Android’s Image would fade it in over 300 ms, under the fading splash', () => {
    const apertura = code('ui/Apertura.tsx');
    expect((apertura.match(/<Image source=\{VACA\} fadeDuration=\{0\}/g) ?? []).length).toBe(2);
    expect((apertura.match(/<Image /g) ?? []).length).toBe(2);
  });

  it('is Wera’s, below its header', () => {
    const fold = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
    expect(fold(read('cocina/src/lib/splash.ts'))).toBe(fold(read('app/src/lib/splash.ts')));
  });
});

describe('each screen hands on to the next', () => {
  it('the opening: her app’s name and line, then *Crear cuenta* and *Ya tengo cuenta*, each on its half of the way in', () => {
    const hola = code('app/(auth)/hola.tsx');
    expect(hola).toMatch(/\{ES\.nombre\}[\s\S]*\{ES\.lema\}/);
    expect(hola).toMatch(/label=\{ES\.hola\.crear\} onPress=\{\(\) => router\.push\('\/entrar'\)\}/);
    expect(hola).toMatch(/label=\{ES\.hola\.tengo\}\s*onPress=\{\(\) => router\.push\(\{ pathname: '\/entrar', params: \{ cuenta: 'tengo' \} \}\)\}/);
    expect(code('app/(auth)/entrar.tsx')).toMatch(/useState\(cuenta !== 'tengo'\)/);
    expect([ES.hola.crear, ES.hola.tengo]).toEqual([ES.auth.signUp, 'Ya tengo cuenta']);
  });

  it('three steps now: her kitchen, her address, and *¿Qué ofreces hoy?*', () => {
    expect(code('app/(onboarding)/registro.tsx')).toMatch(/ES\.registro\.paso\(1\)/);
    expect(code('app/(onboarding)/donde.tsx')).toMatch(/ES\.registro\.paso\(2\)/);
    expect(code('app/(cocina)/que-ofreces.tsx')).toMatch(/ES\.registro\.paso\(3\)/);
  });

  it('*¿Qué ofreces hoy?*: the one form for her first offer, or *Después* to her page — and back leaves for *Hoy*', () => {
    const que = code('app/(cocina)/que-ofreces.tsx');
    expect(que).toMatch(/label=\{ES\.primera\.publicar\}\s*onPress=\{\(\) => router\.push\(\{ pathname: '\/publicar', params: \{ primera: '1' \} \}\)\}/);
    expect(que).toMatch(/label=\{ES\.primera\.despues\} onPress=\{\(\) => router\.replace\('\/ya-estas'\)\}/);
    expect(que).toMatch(/BackHandler\.addEventListener\('hardwareBackPress', \(\) => \{\s*router\.replace\('\/'\);\s*return true;/);
  });

  it('the form, opened from there: published, with *Deshacer*, on to her page — the first run dismissed under it', () => {
    const form = code('app/(cocina)/publicar.tsx');
    const nota = form.indexOf('avisarPublicada(ES.nota.publicaste(');
    expect(nota).toBeGreaterThan(-1);
    expect(form.slice(nota)).toMatch(/if \(!primera\) return salir\(\);\s*router\.dismissAll\(\);\s*router\.replace\('\/ya-estas'\);/);
  });

  it('her page: Itacate’s, from her own rows; its title true of her kitchen now; then *Hoy*', () => {
    const ya = code('app/(cocina)/ya-estas.tsx');
    expect(ya).toMatch(/const seVe = seVeEnItacate\(listings\.data, ahora\);/);
    expect(ya).toMatch(/\{seVe \? ES\.primera\.yaEsta : ES\.primera\.asiTeVeran\}/);
    expect(ya).toMatch(/\{seVe \? ES\.primera\.asiTeVen : ES\.vista\.noSeVe\}/);
    expect(ya).toMatch(/cocinaComoLaVen\(\{ kitchen, place: place\.data, page: page\.data, listings: listings\.data, now: ahora \}\)/);
    expect(ya).toMatch(/<PaginaDeCocina[\s\S]*?distancia=\{null\}[\s\S]*?onPlatillo=\{\(\) => \{\}\}[\s\S]*?atras=\{false\}/);
    expect(ya).toMatch(/const irAHoy = \(\) => router\.replace\('\/'\);/);
    expect(ya).toMatch(/label=\{ES\.primera\.irAHoy\} onPress=\{irAHoy\}/);
  });

  it('in the drawing’s words', () => {
    expect(ES.primera).toMatchObject({
      titulo: '¿Qué ofreces hoy?',
      publicar: 'Publicar mi primera oferta',
      despues: 'Después',
      yaEsta: 'Tu cocina ya está en Itacate',
      irAHoy: 'Ir a Hoy',
    });
    expect(ES.registro.paso(3)).toBe('Paso 3 de 3');
  });
});
