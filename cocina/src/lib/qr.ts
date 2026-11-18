import qrcode from 'qrcode-generator';

// ============================================================================
// A QR CODE AS A GRID OF SQUARES, WITH NO NATIVE MODULE. Plan task `10.9c` — the helper's invitation
// (`@/ui/HojaInvitar`), and later the card's *Sellar* and the counter poster (`10.9e`).
//
// ⚠️ MEASURED FIRST, AS THE ROW ASKED: NO APP HAS SVG, AND A QR NEEDS NONE. `qrcode-generator` (MIT, no
// dependencies, plain JavaScript) works out which squares are dark; `@/ui/CodigoQR` draws each row's dark
// runs as React Native `View`s — so the QR rides an over-the-air update, and the poster (`expo-print`
// takes HTML) can draw the same grid as `<rect>`s. `test/qr.test.ts` decodes what this returns with the
// reader `expo-camera`'s web half carries (`zxing-wasm`), so a grid that would not scan is red there.
//
// ⚠️ ALPHANUMERIC WHEN IT CAN BE: a helper's code is sixteen of Crockford's alphabet — upper case and
// digits, which QR's alphanumeric mode holds at 5.5 bits a character — so it fits the smallest QR there
// is (21 × 21) at level M, which a phone reads across a counter. Anything else (a link) goes as bytes.
// ============================================================================

/** QR's alphanumeric alphabet (ISO/IEC 18004, 7.4.4). */
const ALFANUMERICO = /^[0-9A-Z $%*+\-./:]*$/;

/** Level M: about 15 % of the squares can be lost and it still reads — a scratched screen, a glare. */
const NIVEL = 'M';

/** Which squares are dark: `matriz[fila][columna]`, a square grid with no margin. */
export function matrizQR(texto: string): boolean[][] {
  const qr = qrcode(0, NIVEL);
  qr.addData(texto, ALFANUMERICO.test(texto) ? 'Alphanumeric' : 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, fila) => Array.from({ length: n }, (_, col) => qr.isDark(fila, col)));
}

/** A run of dark squares in one row: where it starts and how many. */
export interface Tramo {
  readonly desde: number;
  readonly largo: number;
}

/**
 * Each row's dark runs, left to right — what `@/ui/CodigoQR` draws, one `View` a run rather than one a
 * square (a 21 × 21 code is about 200 runs instead of 441 squares), and no seam inside a run.
 */
export function tramosQR(matriz: readonly (readonly boolean[])[]): Tramo[][] {
  return matriz.map((fila) => {
    const tramos: Tramo[] = [];
    let desde = -1;
    fila.forEach((oscuro, col) => {
      if (oscuro && desde < 0) desde = col;
      if (!oscuro && desde >= 0) {
        tramos.push({ desde, largo: col - desde });
        desde = -1;
      }
    });
    if (desde >= 0) tramos.push({ desde, largo: fila.length - desde });
    return tramos;
  });
}

/** The quiet zone a reader needs around the code, in squares (ISO/IEC 18004, 5.3.8: four). */
export const MARGEN_QR = 4;
