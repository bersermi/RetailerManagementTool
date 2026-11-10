import { Pressable, Text, View } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// TWO HALVES OF ONE SCREEN — *Hoy · Historial*. Plan task `10.5b-iv-a`, the owner's final
// design of 2026-11-10 (`.p-seg2`): a box of two, the half in use on the green's tint in
// the green, its word heavier — never the colour alone (ADR-035 §2.11's palette row). A
// half may carry a count in a rust round: what waits for her thumb.
// ============================================================================

export interface Mitad<T extends string> {
  readonly valor: T;
  readonly label: string;
  /** A count in a rust round, or `null`. */
  readonly cuenta?: number | null;
  /** What a screen reader says of the count. */
  readonly cuentaAyuda?: string;
}

export function Segmento<T extends string>({
  mitades,
  valor,
  onCambio,
}: {
  mitades: readonly Mitad<T>[];
  valor: T;
  onCambio: (valor: T) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', borderWidth: 1.5, borderColor: PALETTE.linea, borderRadius: SIZE.space - 2, overflow: 'hidden' }}
    >
      {mitades.map((mitad) => {
        const enUso = mitad.valor === valor;
        const cuenta = mitad.cuenta ?? 0;
        return (
          <Pressable
            key={mitad.valor}
            accessibilityRole="tab"
            accessibilityLabel={cuenta > 0 && mitad.cuentaAyuda ? `${mitad.label}, ${mitad.cuentaAyuda}` : mitad.label}
            accessibilityState={{ selected: enUso }}
            onPress={() => onCambio(mitad.valor)}
            style={{
              flex: 1,
              minHeight: SIZE.tapTarget - 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: enUso ? PALETTE.accionSuave : PALETTE.superficie,
            }}
          >
            <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: enUso ? '700' : '600', color: enUso ? PALETTE.accion : PALETTE.tinta }}>
              {mitad.label}
            </Text>
            {cuenta > 0 && <Cuenta n={cuenta} />}
          </Pressable>
        );
      })}
    </View>
  );
}

/** A count in a rust round — on *Historial*, and on the tab. */
export function Cuenta({ n }: { n: number }) {
  return (
    <View style={{ minWidth: 18, paddingHorizontal: 5, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.marca }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: PALETTE.superficie }}>{String(n)}</Text>
    </View>
  );
}
