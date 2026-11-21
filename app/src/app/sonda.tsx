// ⚠️ 11.5-i (never merged): do the big number's figures hold a column on this
// phone? Each digit six times over, in each face, with and without
// `fontVariant: ['tabular-nums']`, measured by the phone's own layout. Tabular
// figures hold when every digit's six measure the same width.
import { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';

const CARAS = [
  { nombre: 'Archivo Condensed Bold', familia: 'ArchivoCondensed-Bold' },
  { nombre: 'Nunito ExtraBold', familia: 'Nunito-ExtraBold' },
] as const;
const DIGITOS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const TAM = 34;

function Medida({ familia, tabular, d, onAncho }: { familia: string; tabular: boolean; d: string; onAncho: (w: number) => void }) {
  return (
    <Text
      onLayout={(e) => onAncho(e.nativeEvent.layout.width)}
      style={{ position: 'absolute', opacity: 0, fontFamily: familia, fontSize: TAM, ...(tabular ? { fontVariant: ['tabular-nums' as const] } : {}) }}
    >
      {d.repeat(6)}
    </Text>
  );
}

function Cara({ nombre, familia }: { nombre: string; familia: string }) {
  const [anchos, setAnchos] = useState<Record<string, number>>({});
  const fila = (tabular: boolean) => {
    const ws = DIGITOS.map((d) => anchos[`${tabular}-${d}`]).filter((w): w is number => w !== undefined);
    const listo = ws.length === DIGITOS.length;
    const min = listo ? Math.min(...ws) : 0;
    const max = listo ? Math.max(...ws) : 0;
    return (
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '700' }}>{tabular ? 'tabular-nums' : 'sin tabular-nums'}</Text>
        <Text style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>
          {DIGITOS.map((d) => `${d}:${(anchos[`${tabular}-${d}`] ?? 0).toFixed(1)}`).join('  ')}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: listo && max - min < 0.5 ? '#1C6B4B' : '#A32218' }}>
          {listo ? `spread ${(max - min).toFixed(2)} pt — ${max - min < 0.5 ? 'HOLDS A COLUMN' : 'DOES NOT'}` : 'measuring…'}
        </Text>
      </View>
    );
  };
  return (
    <View style={{ gap: 8, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 3 }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>{nombre}</Text>
      <Text style={{ fontFamily: familia, fontSize: TAM, fontVariant: ['tabular-nums'] }}>$1,111.11</Text>
      <Text style={{ fontFamily: familia, fontSize: TAM, fontVariant: ['tabular-nums'] }}>$8,888.88</Text>
      <Text style={{ fontFamily: familia, fontSize: TAM }}>$1,111.11 · plain</Text>
      {fila(true)}
      {fila(false)}
      {[true, false].flatMap((tabular) =>
        DIGITOS.map((d) => (
          <Medida key={`${tabular}-${d}`} familia={familia} tabular={tabular} d={d} onAncho={(w) => setAnchos((a) => ({ ...a, [`${tabular}-${d}`]: w }))} />
        )),
      )}
    </View>
  );
}

export default function Sonda() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#E9E8E3' }} contentContainerStyle={{ padding: 12, paddingTop: 56, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>{`Sonda · ${Platform.OS} ${String(Platform.Version)} · ${TAM} pt`}</Text>
      {CARAS.map((c) => (
        <Cara key={c.familia} nombre={c.nombre} familia={c.familia} />
      ))}
    </ScrollView>
  );
}
