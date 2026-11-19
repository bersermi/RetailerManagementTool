import { MARGEN_QR, matrizQR, tramosQR } from '@/lib/qr';
import { enFrase } from '@/lib/tarjeta';
import { ES } from '@/strings';

// ============================================================================
// THE COUNTER POSTER — HER KITCHEN'S OWN, PRINTED OR SHARED AS A PDF (G35: *"minimize the exposure of
// Wera and maximize the Cocina identity, we should show ourselves as enablers rather than providers"*;
// the family-shell page's `cCartel`). Plan task `10.9e-ii`.
//
// ⚠️ ITS QR IS HER KITCHEN'S ADDRESS, NEVER *SELLAR*'S CODE: `https://tu-wera.com/cocina/?k=<her id>&n=<her
// name>` (`10.9c`'s ruling, binding every poster printed — `direccionDeCocina`, held to Itacate's reading
// of it, `itacate/src/lib/enlaces.ts`): with Itacate it opens her page, without it the site's page with the
// stores. A code that changes every minute cannot be printed.
// ⚠️ WHAT IT SAYS: her circle (her logo, else her initials) on her colour, her name large, *Junta 8 sellos y
// llévate una comida corrida* while her card is open (else *Mira lo que hay hoy*), the QR, *Escanéalo con
// tu cámara*, her address, and *en Itacate* small. The word *Wera* nowhere.
// ⚠️ HTML FOR `expo-print` (a WebView), SO THE QR IS SVG `<rect>`s — one per dark run of a row, the same grid
// `@/ui/CodigoQR` draws (`@/lib/qr`) — and nothing is fetched: the logo arrives as a data URI or not at all.
// Pure: `test/tarjetaCocina.test.ts` reads the rectangles back into the grid, has a real reader decode them, and
// checks every word.
// ============================================================================

/** The site's host and the kitchens' path — Itacate's `SITIO` and `RUTA_DE_COCINA`, held to them by the suite. */
export const SITIO = 'tu-wera.com';
export const RUTA_DE_COCINA = '/cocina/';

/** The site's page reads at most 60 characters of the name (`site/cocina/index.html`). */
export const NOMBRE_EN_ENLACE = 60;

/** Her kitchen's address on tu-wera.com — what the poster's QR holds. */
export function direccionDeCocina(id: string, nombre: string): string {
  return `https://${SITIO}${RUTA_DE_COCINA}?k=${encodeURIComponent(id)}&n=${encodeURIComponent(nombre.trim().slice(0, NOMBRE_EN_ENLACE))}`;
}

/** Text written into HTML, never markup. */
export function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** The QR as SVG: the grid with its quiet zone, one `<rect>` per dark run. */
export function qrSvg(texto: string, lado: number): string {
  const matriz = matrizQR(texto);
  const n = matriz.length + MARGEN_QR * 2;
  const rects = tramosQR(matriz)
    .flatMap((tramos, fila) =>
      tramos.map((t) => `<rect x="${t.desde + MARGEN_QR}" y="${fila + MARGEN_QR}" width="${t.largo}" height="1"/>`),
    )
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${lado}" height="${lado}" shape-rendering="crispEdges">` +
    `<rect width="${n}" height="${n}" fill="#fff"/><g fill="#000">${rects}</g></svg>`
  );
}

export interface DatosDelCartel {
  readonly id: string;
  readonly nombre: string;
  readonly iniciales: string;
  /** Her colour's hue, `#RRGGBB`. */
  readonly color: string;
  /** Her logo as a data URI, or `null` — her initials then. */
  readonly logo: string | null;
  /** Her street and colonia, or `null`. */
  readonly direccion: string | null;
  /** Her card's terms while it is open, else `null`. */
  readonly tarjeta: { readonly sellos: number; readonly premio: string } | null;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const DATA_URI = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

/** The poster's HTML, one A4 page. */
export function cartelHtml(d: DatosDelCartel): string {
  const color = HEX.test(d.color) ? d.color : '#1C6B4B';
  const circulo =
    d.logo !== null && DATA_URI.test(d.logo)
      ? `<img class="logo" src="${d.logo}" alt=""/>`
      : `<div class="logo ini">${escapar(d.iniciales)}</div>`;
  const titulo = d.tarjeta === null ? ES.cartel.miraHoy : ES.cartel.junta(d.tarjeta.sellos, enFrase(d.tarjeta.premio));
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${escapar(`${ES.cartel.archivo} · ${d.nombre}`)}</title>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif; color: #201D16; }
.hoja { width: 210mm; height: 297mm; display: flex; flex-direction: column; }
.banda { background: ${color}; height: 78mm; display: flex; align-items: center; justify-content: center; }
.logo { width: 52mm; height: 52mm; border-radius: 50%; border: 2mm solid rgba(255,255,255,.7); object-fit: cover; background: ${color}; }
.ini { display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 22mm; }
.cuerpo { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 10mm 18mm 12mm; gap: 6mm; }
.nombre { font-size: 15mm; font-weight: 800; line-height: 1.05; }
.titulo { font-size: 8mm; font-weight: 700; color: ${color}; line-height: 1.2; }
.qr svg { width: 72mm; height: 72mm; }
.escanea { font-size: 6mm; font-weight: 600; }
.dir { font-size: 5mm; color: #6F675A; }
.itacate { margin-top: auto; font-size: 4mm; color: #6F675A; letter-spacing: .3mm; }
</style></head><body><div class="hoja">
<div class="banda">${circulo}</div>
<div class="cuerpo">
<div class="nombre">${escapar(d.nombre)}</div>
<div class="titulo">${escapar(titulo)}</div>
<div class="qr">${qrSvg(direccionDeCocina(d.id, d.nombre), 288)}</div>
<div class="escanea">${escapar(ES.cartel.escanea)}</div>
${d.direccion === null ? '' : `<div class="dir">${escapar(d.direccion)}</div>`}
<div class="itacate">${escapar(ES.cartel.enItacate)}</div>
</div></div></body></html>`;
}
