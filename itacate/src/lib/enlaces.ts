// ============================================================================
// A KITCHEN'S ADDRESS ON TU-WERA.COM, AND WHERE IT OPENS ITACATE. Plan task `10.9c` (G40: app links in
// Itacate's first public build — the poster's QR, *Compartir mi página*, a neighbour sharing a kitchen).
//
// ⚠️ ONE ADDRESS PER KITCHEN: `https://tu-wera.com/cocina/?k=<her id>&n=<her name>`. With Itacate on the
// phone, the phone hands it to Itacate — the iPhone by `applinks:tu-wera.com` and the site's
// `.well-known/apple-app-site-association`, Android by the link filter on `/cocina/` and the site's
// `.well-known/assetlinks.json` (`itacate/app.json`; `test/enlaces.test.ts` holds the three to one path)
// — and this file turns it into her page's route, `/cocina/<id>`. Without Itacate, the same address is a
// page on the site (`site/cocina/index.html`): her name read from the link (`n` — nothing is readable
// without an account, ADR-035 §2.7) and the stores. The app reads `k` alone: a name in a link is what
// whoever made it typed, and her page shows the door's.
//
// ⚠️ NO `URL`: React Native's own lacks most of it, and this runs as the app starts, before anything
// polyfills it. A link that is not a kitchen's — the sign-in's return, `mx.wera.vecino://auth/callback`,
// above all — passes through untouched.
//
// ⚠️ SIGNED OUT, SHE IS SENT TO *ENTRAR* FIRST, and her page opens once she is in (`@/auth/guard`'s
// `paraDespues`, kept by `_layout.tsx`'s `Gate` in memory — never across a closed app).
// ============================================================================

/** The site's host, and the path every kitchen's address starts with — the same three places hold it. */
export const SITIO = 'tu-wera.com';
export const RUTA_DE_COCINA = '/cocina/';

/** A kitchen's id: her workspace's (`on_offer_now`'s `id`), a UUID. */
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `https://tu-wera.com/cocina/?…`, or the app's own scheme with the same path (the site's *Abrir Itacate*). */
const DE_COCINA = /^(?:https:\/\/tu-wera\.com|mx\.wera\.vecino:\/)\/cocina\/([^?#]*)(?:\?([^#]*))?/i;

/** The kitchen's id a link names, lower case — or `null` when it is not a kitchen's link. */
export function cocinaDelEnlace(enlace: string): string | null {
  const m = DE_COCINA.exec(enlace.trim());
  if (m === null) return null;
  const [, resto, consulta = ''] = m;
  // `…/cocina/<id>` too: the scheme's link, and a hand-written one.
  const enRuta = resto.replace(/\/$/, '');
  const candidatos = [enRuta, ...consulta.split('&').filter((p) => p.startsWith('k=')).map((p) => p.slice(2))];
  for (const c of candidatos) {
    let id: string;
    try {
      id = decodeURIComponent(c);
    } catch {
      continue;
    }
    if (ID.test(id)) return id.toLowerCase();
  }
  return null;
}

/** Her page's route for a kitchen's link — or `null`, and the link goes on as it came. */
export function rutaDelEnlace(enlace: string): `/cocina/${string}` | null {
  const id = cocinaDelEnlace(enlace);
  return id === null ? null : `/cocina/${id}`;
}
