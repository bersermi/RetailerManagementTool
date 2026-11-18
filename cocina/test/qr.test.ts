import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { beforeAll, describe, expect, it } from 'vitest';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';

import { codigoAgrupado, codigoAlEscribir, codigoCompleto } from '@/api/invitar';
import { MARGEN_QR, matrizQR, tramosQR } from '@/lib/qr';

// ============================================================================
// A QR CODE DRAWN WITH NO NATIVE MODULE, AND READ BACK. Plan task `10.9c` (`@/lib/qr`, drawn by
// `@/ui/CodigoQR`).
//
// ⚠️ THE INSTRUMENT IS A REAL READER: the grid is painted square by square into pixels — the runs
// `@/ui/CodigoQR` draws, each square 4 pixels, with the quiet zone — and decoded by ZXing (`zxing-wasm`,
// the reader `expo-camera`'s web half carries, pinned to the copy the lockfile holds), loaded from this
// disk, never the network. A grid that would not scan, or reads back something else, is red here. What it
// cannot say is how a phone's camera reads a phone's screen: that is the phone's (the handbook).
// ============================================================================

const require = createRequire(import.meta.url);

beforeAll(async () => {
  const wasm = readFileSync(require.resolve('zxing-wasm/reader/zxing_reader.wasm'));
  await prepareZXingModule({ overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) }, fireImmediately: true });
});

/** The runs, as `@/ui/CodigoQR` draws them, painted into RGBA pixels on white with the quiet zone. */
function pintar(texto: string, px = 4) {
  const tramos = tramosQR(matrizQR(texto));
  const lado = (tramos.length + 2 * MARGEN_QR) * px;
  const data = new Uint8ClampedArray(lado * lado * 4).fill(255);
  tramos.forEach((fila, f) => {
    for (const { desde, largo } of fila) {
      for (let y = (f + MARGEN_QR) * px; y < (f + MARGEN_QR + 1) * px; y++) {
        for (let x = (desde + MARGEN_QR) * px; x < (desde + largo + MARGEN_QR) * px; x++) {
          const i = (y * lado + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  });
  return { data, width: lado, height: lado, colorSpace: 'srgb' } as unknown as ImageData;
}

async function leer(texto: string): Promise<string[]> {
  const leidos = await readBarcodes(pintar(texto), { formats: ['QRCode'], tryHarder: true });
  return leidos.filter((r) => r.isValid).map((r) => r.text);
}

const CODIGO = 'EF0JYVX8J7P7Q9FH';

describe('a helper’s code as a QR', () => {
  it('fits the smallest QR there is: 21 × 21, alphanumeric at level M', () => {
    const m = matrizQR(CODIGO);
    expect(m).toHaveLength(21);
    for (const fila of m) expect(fila).toHaveLength(21);
  });

  it('drawn inside the quiet zone ISO/IEC 18004 asks for — four squares of white at least', () => {
    // ⚠️ ZXing reads a code with no margin at all, so the read-back below cannot hold this: a phone's camera
    // across a counter needs the white around it (`@/ui/CodigoQR` pads by this many squares).
    expect(MARGEN_QR).toBeGreaterThanOrEqual(4);
    expect(readFileSync(new URL('../src/ui/CodigoQR.tsx', import.meta.url), 'utf8')).toContain('padding: cuadro * MARGEN_QR');
  });

  it('the runs paint exactly the dark squares — no square lost, none added', () => {
    const m = matrizQR(CODIGO);
    const tramos = tramosQR(m);
    const repintada = m.map((fila) => fila.map(() => false));
    tramos.forEach((fila, f) => fila.forEach(({ desde, largo }) => {
      for (let c = desde; c < desde + largo; c++) repintada[f][c] = true;
    }));
    expect(repintada).toEqual(m);
    // A run never touches another in its row: each is as long as it can be.
    for (const fila of tramos) for (let i = 1; i < fila.length; i++) {
      expect(fila[i].desde).toBeGreaterThan(fila[i - 1].desde + fila[i - 1].largo);
    }
  });

  it('a reader reads back the sixteen, and joining takes what it reads', async () => {
    const leido = await leer(CODIGO);
    expect(leido).toEqual([CODIGO]);
    // What *Unirme a una cocina* does with a scan: the box's own rule, then a whole code.
    expect(codigoCompleto(codigoAlEscribir(leido[0]))).toBe(CODIGO);
  });

  it('the code read aloud in groups is the same code, and still alphanumeric', async () => {
    expect(await leer(codigoAgrupado(CODIGO))).toEqual([codigoAgrupado(CODIGO)]);
    expect(codigoCompleto(codigoAlEscribir(codigoAgrupado(CODIGO)))).toBe(CODIGO);
  });
});

describe('anything else goes as bytes, and still reads back', () => {
  it('a link with accents and a query — the poster’s and *Compartir mi página*’s kind (`10.9e`)', async () => {
    const enlace = 'https://tu-wera.com/cocina/?k=0b6d44cc-6501-4e40-833d-e89f23913df5&n=Fonda%20Do%C3%B1a%20Mari';
    expect(await leer(enlace)).toEqual([enlace]);
    expect(await leer('Fonda Doña Mari')).toEqual(['Fonda Doña Mari']);
  });
});
