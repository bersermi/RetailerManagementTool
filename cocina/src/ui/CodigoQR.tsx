import { useMemo } from 'react';
import { PixelRatio, View } from 'react-native';

import { MARGEN_QR, matrizQR, tramosQR } from '@/lib/qr';

// ============================================================================
// A QR CODE, DRAWN WITH VIEWS. Plan task `10.9c` — *Invitar a alguien*'s code (`@/ui/HojaInvitar`); the
// card's *Sellar* draws its own with it (`10.9e`). Which squares are dark is `@/lib/qr`'s (read back by a
// real reader in `test/qr.test.ts`); here each row's dark runs are one `View` each, black on white, inside
// the four-square quiet zone a reader needs.
//
// ⚠️ THE SQUARE IS ROUNDED TO WHOLE PIXELS (`PixelRatio`): a square of 6.43 points draws soft edges and a
// hairline between rows, which a camera can read as a light seam. So the drawing is at most `lado` wide,
// and the white margin takes what is left. Never tinted: a reader wants black on white, whatever the
// palette. NO CHECK CAN SEE THIS DRAWING (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function CodigoQR({ texto, lado, etiqueta }: { texto: string; lado: number; etiqueta: string }) {
  const tramos = useMemo(() => tramosQR(matrizQR(texto)), [texto]);
  const cuadros = tramos.length + 2 * MARGEN_QR;
  const pixel = 1 / PixelRatio.get();
  // The largest square, in whole pixels, that fits the code and its margin in `lado`.
  const cuadro = Math.max(pixel, Math.floor(lado / cuadros / pixel) * pixel);
  const total = cuadro * cuadros;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={etiqueta}
      style={{ width: total, height: total, backgroundColor: '#FFFFFF', padding: cuadro * MARGEN_QR }}
    >
      {tramos.map((fila, f) => (
        <View key={f} style={{ height: cuadro, flexDirection: 'row' }}>
          {fila.map(({ desde, largo }) => (
            <View
              key={desde}
              style={{ position: 'absolute', left: desde * cuadro, width: largo * cuadro, height: cuadro, backgroundColor: '#000000' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
