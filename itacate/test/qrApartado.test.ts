import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { beforeAll, describe, expect, it } from 'vitest';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';

import { SELLO_MAXIMO, selloOf } from '@/api/apartados';
import { MARGEN_QR, matrizQR, tramosQR } from '@/lib/qr';
import { QR_LADO } from '@/lib/apartados';

// ============================================================================
// HER TICKET'S QR, READ BACK. Plan task `10.9j-ii-a` (the owner's J2 of 2026-11-20): the seal
// `0088` makes, drawn as `@/ui/CodigoQR` draws it — `@/lib/qr`'s squares, the quiet zone — and
// decoded by ZXing (`zxing-wasm`, the reader `expo-camera`'s web half carries; Wera Cocina's
// `test/qr.test.ts` does the same for a helper's code). ⚠️ THE TEXT A CAMERA READS MUST BE THE TEXT
// THE DATABASE SIGNED, byte for byte, or the fonda's phone refuses a real ticket: `0088` makes the
// whole seal printable ASCII (the dish's name percent-encoded) because `qrcode-generator` writes a
// character as one byte — this suite reads back the longest seal the database can make.
// ============================================================================

const require = createRequire(import.meta.url);

beforeAll(async () => {
  const wasm = readFileSync(require.resolve('zxing-wasm/reader/zxing_reader.wasm'));
  await prepareZXingModule({ overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) }, fireImmediately: true });
});

/** The runs, as `@/ui/CodigoQR` draws them, painted into RGBA pixels on white with the quiet zone. */
function pintar(texto: string, px = 3) {
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

/** `servicio.seal_text`, as `0088` writes it: printable ASCII as itself but `%` and `|`, every other UTF-8 byte as `%XX`. */
function sealText(texto: string): string {
  return [...new TextEncoder().encode(texto)]
    .map((b) => (b >= 32 && b <= 126 && b !== 37 && b !== 124 ? String.fromCharCode(b) : `%${b.toString(16).toUpperCase().padStart(2, '0')}`))
    .join('');
}

/** `servicio.seal_name`: whole characters while they fit in 120 encoded. */
function sealName(nombre: string): string {
  let out = '';
  for (const c of nombre) {
    const enc = sealText(c);
    if (out.length + enc.length > 120) break;
    out += enc;
  }
  return out;
}

/** A seal of `0088`'s shape: fourteen fields, the MAC last (its value is the database's; any 20 hex read the same). */
function sello(nombre: string, contenedor = '5.00'): string {
  return ['s1', '0088cccc000040008000000000000001', 'f6099120a84e4925a62e15ea7e4b50e0', '12', '418', '1795161600', 'transferencia', 'llevar', '1.000', '1250.00', contenedor, '0', sealName(nombre), 'ecf487c2074b247f4bf9'].join('|');
}

describe('her ticket’s QR', () => {
  it('a seal reads back exactly — her ticket as Doña Mari’s phone will scan it', async () => {
    const texto = sello('Pozole rojo | con piña y jalapeño');
    expect(texto).toMatch(/^[ -~]+$/);
    expect(await leer(texto)).toEqual([texto]);
  });

  it('⚠️ the longest a dish’s name can be (80 characters, `0072`), every one a two-byte accent or a four-byte emoji — cut to 120 encoded by the database: still read back byte for byte', async () => {
    for (const nombre of ['ñ'.repeat(80), '🌮'.repeat(80), `Mole — “de la casa” ${'á'.repeat(59)}`.slice(0, 80)]) {
      const texto = sello(nombre);
      expect(texto, nombre).toMatch(/^[ -~]+$/);
      expect(selloOf(texto), nombre).toBe(texto);
      expect(await leer(texto), nombre).toEqual([texto]);
    }
  });

  it('the longest seal fits what the ticket accepts, and draws at 2.5 points a square or more at the ticket’s width', () => {
    const largo = sello('🌮'.repeat(80));
    expect(largo.length).toBeLessThanOrEqual(SELLO_MAXIMO);
    const cuadros = matrizQR(largo).length + 2 * MARGEN_QR;
    expect(QR_LADO / cuadros).toBeGreaterThanOrEqual(2.5);
    // A usual one — a dish of a few words — is a QR of about 60 squares, over 3 points each.
    const usual = matrizQR(sello('Pozole rojo con tostadas')).length + 2 * MARGEN_QR;
    expect(QR_LADO / usual).toBeGreaterThan(3);
  });
});
