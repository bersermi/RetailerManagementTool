import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { NOTA_MAXIMA, etiquetasDeLaBanda, etiquetasPara, type Apartado, type EtiquetaDeCocina } from '@/api/apartados';
import { useCalificar } from '@/api/hooks';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// HER STARS ABOUT THE KITCHEN. Plan task `10.5b-iii-b` — `10.5b-ii`'s final design of
// 2026-11-10 (the page's *After Ya lo tengo*): *¿Qué tal estuvo?*, five stars, then the tags
// of their band — the good four after four or five, the other four after one to three (his
// answer of that night) — and *Cuéntale algo a Wera (opcional)*, *Solo lo lee Wera, no la
// cocina.*, *Listo*. Every rule is `@/api/apartados`' (`etiquetasPara`, `rateArgs`).
//
// ⚠️ ONE TAP RATES: the stars are sent the moment she taps them (`rate_kitchen`), so a rating
// is never lost to a screen she leaves; her tags and her note go with them again on *Listo*
// (each call sets all three). A change of stars drops the tags of the other band.
// ⚠️ HER TERMS WERE ACCEPTED WITH HER YES, before her first reservation (`@/ui/HojaApartar`):
// no rating can come before it, so no step is added here.
// ⚠️ IT IS NOT A SHEET: it sits on *Apartados* (`(vecino)/(tabs)/apartados`), inside a form that
// keeps the note above the keyboard — a box inside an Android `Modal` needs its own keyboard room.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function Calificar({ apartado, onListo }: { apartado: Apartado; onListo: () => void }) {
  const { calificar, busy } = useCalificar();
  const [estrellas, setEstrellas] = useState(0);
  const [etiquetas, setEtiquetas] = useState<readonly EtiquetaDeCocina[]>([]);
  const [nota, setNota] = useState('');
  const [falla, setFalla] = useState<string | null>(null);
  const [gracias, setGracias] = useState(false);

  async function enviar(n: number, tags: readonly EtiquetaDeCocina[], texto: string): Promise<boolean> {
    const resultado = await calificar(apartado.id, { estrellas: n, etiquetas: tags, nota: texto });
    if (resultado.ok) {
      setFalla(null);
      return true;
    }
    setFalla(ES.apartar.fallas[resultado.falla]);
    return false;
  }

  function tocarEstrella(n: number) {
    const tags = etiquetasDeLaBanda(n, etiquetas);
    setEstrellas(n);
    setEtiquetas(tags);
    void enviar(n, tags, nota);
  }

  function tocarEtiqueta(etiqueta: EtiquetaDeCocina) {
    setEtiquetas((ahora) => (ahora.includes(etiqueta) ? ahora.filter((e) => e !== etiqueta) : [...ahora, etiqueta]));
  }

  async function listo() {
    if (estrellas === 0) {
      onListo();
      return;
    }
    if (await enviar(estrellas, etiquetas, nota)) setGracias(true);
  }

  if (gracias) {
    return (
      <View style={{ alignItems: 'center', gap: SIZE.rowGap }}>
        <Estrellas n={estrellas} />
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada, textAlign: 'center' }}>
          {ES.apartados.calificar.gracias}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignSelf: 'stretch', gap: SIZE.space }}>
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta, textAlign: 'center' }}>
        {ES.apartados.calificar.pregunta}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SIZE.rowGap }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={ES.apartados.calificar.estrella(n)}
            accessibilityState={{ selected: n === estrellas }}
            hitSlop={4}
            onPress={() => tocarEstrella(n)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <MaterialCommunityIcons
              name={n <= estrellas ? 'star' : 'star-outline'}
              size={40}
              color={n <= estrellas ? PALETTE.estrella : PALETTE.estrellaApagada}
            />
          </Pressable>
        ))}
      </View>

      {estrellas > 0 && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SIZE.rowGap }}>
            {etiquetasPara(estrellas).map((etiqueta) => {
              const elegida = etiquetas.includes(etiqueta);
              return (
                <Pressable
                  key={etiqueta}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: elegida }}
                  onPress={() => tocarEtiqueta(etiqueta)}
                  style={({ pressed }) => ({
                    minHeight: SIZE.tapTarget - SIZE.rowGap,
                    justifyContent: 'center',
                    paddingHorizontal: SIZE.space,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: elegida ? PALETTE.accion : PALETTE.linea,
                    backgroundColor: elegida ? PALETTE.accionSuave : PALETTE.superficie,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: SIZE.smallSize, fontWeight: elegida ? '700' : '500', color: PALETTE.tinta }}>
                    {ES.apartados.calificar.etiqueta[etiqueta]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ gap: SIZE.rowGap / 2 }}>
            <TextInput
              value={nota}
              onChangeText={setNota}
              placeholder={ES.apartados.calificar.nota}
              placeholderTextColor={PALETTE.tintaApagada}
              accessibilityLabel={ES.apartados.calificar.nota}
              multiline
              maxLength={NOTA_MAXIMA}
              style={{
                minHeight: SIZE.tapTarget * 1.5,
                padding: SIZE.space,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: PALETTE.linea,
                backgroundColor: PALETTE.fondo,
                fontSize: SIZE.bodySize,
                color: PALETTE.tinta,
                textAlignVertical: 'top',
              }}
            />
            <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.apartados.calificar.notaAyuda}</Text>
          </View>
        </>
      )}

      {falla !== null && <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.error }}>{falla}</Text>}
      <BotonLleno label={ES.apartados.calificar.listo} variante={estrellas > 0 ? 'principal' : 'discreto'} busy={busy} onPress={() => void listo()} />
    </View>
  );
}

/** Her stars, drawn still — on the thanks, and on a past reservation she rated. */
export function Estrellas({ n, size = 22 }: { n: number; size?: number }) {
  return (
    <View
      accessible
      accessibilityLabel={ES.apartados.calificar.estrella(n)}
      style={{ flexDirection: 'row', gap: 2 }}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons key={i} name={i <= n ? 'star' : 'star-outline'} size={size} color={i <= n ? PALETTE.estrella : PALETTE.estrellaApagada} />
      ))}
    </View>
  );
}
