import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { redirectSystemPath } from '@/app/+native-intent';
import { RUTA_DE_COCINA, SITIO, cocinaDelEnlace, rutaDelEnlace } from '@/lib/enlaces';

// ============================================================================
// A KITCHEN'S ADDRESS ON TU-WERA.COM OPENS ITACATE ON HER PAGE. Plan task `10.9c` (G40).
//
// ⚠️ THREE PLACES MUST SAY THE SAME HOST AND PATH, AND NOTHING FAILS WHEN THEY DRIFT — the link just opens
// the browser: Itacate's `app.json` (the iPhone's `applinks:` and Android's link filter, baked into the
// build), the site's two files (`site/.well-known/`, published by `site.yml`), and `@/lib/enlaces`, which
// turns the address into her page's route. This reads all three. ⚠️ WHAT IT CANNOT SAY: that a phone
// opens Itacate — Android's `pm get-app-links mx.wera.vecino` reading `verified`, and a tap on an iPhone,
// are the instruments (the handbook); `docs/checks/5R-d-ii-site-live.sh` reads what the domain serves.
// ============================================================================

const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const sitio = (f: string) => readFileSync(new URL(`../../site/${f}`, import.meta.url), 'utf8');

const ID = '3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b';
const ENLACE = `https://tu-wera.com/cocina/?k=${ID}&n=Fonda%20Do%C3%B1a%20Mari`;

/** Apple's id for this app: the team that signs its builds (read off its ad hoc profile, 2026-11-18), and its id. */
const EQUIPO_DE_APPLE = 'RGWA74UM3G';
/**
 * The key EAS signs Itacate's builds with — the `preview` APKs and the `production` bundle Play receives
 * (read off both with `apksigner` and `keytool`, 2026-11-18). ⚠️ An app installed FROM Play is signed by
 * Play's own key instead, read in Play Console; until it is in `assetlinks.json` too, a Play install opens
 * the site's page, never Itacate (the plan's decisions block).
 */
const LLAVE_DE_EAS = '0B:6D:44:CC:65:01:E4:00:33:DE:89:F2:39:13:DF:59:99:66:56:81:B0:D1:3F:D1:CA:D8:19:42:60:38:EA:03';

describe('a kitchen’s address, read', () => {
  it('her id, from `k`, whatever else the address carries', () => {
    expect(cocinaDelEnlace(ENLACE)).toBe(ID);
    expect(cocinaDelEnlace(`https://tu-wera.com/cocina/?n=Mari&k=${ID.toUpperCase()}`)).toBe(ID);
    expect(cocinaDelEnlace(`https://TU-WERA.com/cocina/?k=${ID}#arriba`)).toBe(ID);
    expect(cocinaDelEnlace(`  https://tu-wera.com/cocina/?k=${ID}  `)).toBe(ID);
  });

  it('the app’s own scheme, as the site’s *Ya tengo Itacate* sends it, and an id in the path', () => {
    expect(cocinaDelEnlace(`mx.wera.vecino://cocina/${ID}`)).toBe(ID);
    expect(cocinaDelEnlace(`https://tu-wera.com/cocina/${ID}/`)).toBe(ID);
  });

  it('becomes her page’s route — the one the list opens', () => {
    expect(rutaDelEnlace(ENLACE)).toBe(`/cocina/${ID}`);
    // The route is `(vecino)/cocina/[id]`, and it takes the door's id as it is.
    expect(readFileSync(new URL('../src/app/(vecino)/cocina/[id].tsx', import.meta.url), 'utf8')).toMatch(/useLocalSearchParams<\{ id: string \}>/);
  });

  it('anything that is not a kitchen’s address is not one', () => {
    for (const otro of [
      'mx.wera.vecino://auth/callback?code=abc',
      `http://tu-wera.com/cocina/?k=${ID}`,
      `https://www.tu-wera.com/cocina/?k=${ID}`,
      `https://tu-wera.com.mx/cocina/?k=${ID}`,
      `https://otro.com/https://tu-wera.com/cocina/?k=${ID}`,
      `https://tu-wera.com/privacidad/?k=${ID}`,
      'https://tu-wera.com/cocina/?n=Mari',
      'https://tu-wera.com/cocina/?k=no-es-un-id',
      'https://tu-wera.com/cocina/?k=%E0%A4%A',
      '/cocina/abc',
      '',
    ]) {
      expect(cocinaDelEnlace(otro), otro).toBeNull();
    }
  });
});

describe('every link the phone hands Itacate (`+native-intent`)', () => {
  it('a kitchen’s goes to her page; the sign-in’s return, and anything else, as it came', () => {
    expect(redirectSystemPath({ path: ENLACE, initial: true })).toBe(`/cocina/${ID}`);
    expect(redirectSystemPath({ path: ENLACE, initial: false })).toBe(`/cocina/${ID}`);
    for (const igual of ['mx.wera.vecino://auth/callback#access_token=x', 'mx.wera.vecino://', '/apartados', 'https://tu-wera.com/']) {
      expect(redirectSystemPath({ path: igual, initial: true })).toBe(igual);
    }
  });
});

describe('the three places agree on one host and one path', () => {
  it('the build: the iPhone’s associated domain, and Android’s verified filter on the path alone', () => {
    expect(app.ios.associatedDomains).toEqual([`applinks:${SITIO}`]);
    expect(app.android.intentFilters).toEqual([
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: SITIO, pathPrefix: RUTA_DE_COCINA }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ]);
  });

  it('the iPhone’s file names this app, signed by its team, on the same path and nothing wider', () => {
    const aasa = JSON.parse(sitio('.well-known/apple-app-site-association'));
    expect(aasa.applinks.details).toHaveLength(1);
    const [d] = aasa.applinks.details;
    expect(d.appIDs).toEqual([`${EQUIPO_DE_APPLE}.${app.ios.bundleIdentifier}`]);
    expect(d.components.map((c: { '/': string }) => c['/'])).toEqual([`${RUTA_DE_COCINA}*`]);
  });

  it('Android’s file names this package and the key EAS signs it with', () => {
    const links = JSON.parse(sitio('.well-known/assetlinks.json'));
    expect(links).toHaveLength(1);
    expect(links[0].relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(links[0].target.namespace).toBe('android_app');
    expect(links[0].target.package_name).toBe(app.android.package);
    expect(links[0].target.sha256_cert_fingerprints).toContain(LLAVE_DE_EAS);
  });

  it('the page on the site sits at that path, and opens Itacate by the app’s own scheme', () => {
    const pagina = sitio('cocina/index.html');
    expect(pagina).toContain(`'${app.scheme}://cocina/' + id`);
    // It reads `k` and `n` — the two names `@/lib/enlaces` documents — and nothing else of the address.
    expect(pagina).toMatch(/q\.get\('n'\)/);
    expect(pagina).toMatch(/q\.get\('k'\)/);
    expect(pagina.match(/q\.get\('/g)).toHaveLength(2);
  });
});
