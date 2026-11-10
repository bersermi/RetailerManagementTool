import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { etiquetasDelLado, etiquetasPara, type Etiqueta, type Falla, type Pulgar } from '@/api/apartados';
import type { PulgarNuevo } from '@/api/hooks';
import { cuandoTexto } from '@/lib/apartados';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { AntesDeCalificar, useTerminos } from '@/ui/AntesDeCalificar';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// HER THUMB ABOUT THE NEIGHBOUR — the owner's final design of 2026-11-10 (*After the
// handover*). Plan task `10.5b-iv-a`. *¿Cómo te fue con Ana R.?*, 👍 and 👎; after a thumb up
// *Llegó a tiempo* and *Persona amable*, after a thumb down *Se presentó tarde* and
// *Problemas con el pago* — each label only where it can be true (`etiquetasPara`); *Listo*
// and *Después*. Under *Ya cobré y lo entregué*, and on an order handed over and not rated.
//
// ⚠️ ONE TAP IS ENOUGH (the design: *"One tap is enough, and Después leaves it for later"*):
// the thumb is SENT THE MOMENT SHE TAPS IT, so a fonda who turns to the next neighbour has
// rated; her labels go on *Listo*, sent again with the thumb (`rate_neighbour` sets both
// each call, and keeps the first moment). Itacate's stars work the same way (`10.5b-iii-b`).
// ⚠️ `10.5b-iv-b`: EVERY TAP IS QUEUED, NEVER AWAITED (`@/api/cola`): with signal or without,
// the panel moves at once; a second thumb before the first went replaces it, so nothing
// arrives out of order; and the database's refusal comes back as `rechazo`.
// ⚠️ THE TERMS, ONCE, BEFORE HER FIRST THUMB (the final design) — `@/ui/AntesDeCalificar`.
// ⚠️ A THUMB MAY BE CHANGED FOR 24 HOURS, never the clock's: past that it is drawn, not
// offered. NO CHECK CAN SEE THIS PANEL (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function CalificarVecino({
  nombre,
  inicial,
  ahora,
  rechazo,
  onCalificar,
  onListo,
  onDespues,
}: {
  /** *Ana R.*, or `null` when the database no longer says. */
  nombre: string | null;
  /** The thumb already on the order, or `null`. */
  inicial: Pulgar | null;
  ahora: Date;
  /** Why the database refused her last thumb on this order (`@/api/cola`), or `null`. */
  rechazo: Falla | null;
  /** Queues her thumb — synchronous: it is on the phone when this returns. */
  onCalificar: (pulgar: PulgarNuevo) => void;
  /** Her thumb is saved and she is done. */
  onListo: () => void;
  /** She leaves it for later — *Calificar* stays on the order. `null`: no way out but *Listo*. */
  onDespues: (() => void) | null;
}) {
  const terminos = useTerminos();
  const [arriba, setArriba] = useState<boolean | null>(inicial?.arriba ?? null);
  const [etiquetas, setEtiquetas] = useState<readonly Etiqueta[]>(inicial?.etiquetas ?? []);
  const [enviado, setEnviado] = useState<string | null>(inicial === null ? null : firma(inicial.arriba, inicial.etiquetas));

  const cambiable = inicial === null || (!inicial.reloj && inicial.cambiarHasta !== null && ahora.getTime() < inicial.cambiarHasta.getTime());

  if (!cambiable && inicial !== null) {
    return (
      <View style={{ gap: SIZE.rowGap }}>
        <Pulgares arriba={inicial.arriba} onPulgar={null} />
        {inicial.reloj ? (
          <Text style={{ fontSize: SIZE.smallSize, textAlign: 'center', color: PALETTE.tintaApagada }}>{ES.pulgar.reloj}</Text>
        ) : (
          inicial.etiquetas.length > 0 && <Etiquetas todas={inicial.etiquetas} elegidas={inicial.etiquetas} onTocar={null} />
        )}
      </View>
    );
  }

  if (!terminos.aceptados) return <AntesDeCalificar onAcepto={terminos.aceptar} onDespues={onDespues} />;

  function enviar(nuevoArriba: boolean, nuevas: readonly Etiqueta[]) {
    const lado = etiquetasDelLado(nuevoArriba, nuevas);
    onCalificar({ arriba: nuevoArriba, etiquetas: lado });
    setEnviado(firma(nuevoArriba, lado));
  }

  function tocarPulgar(nuevo: boolean) {
    const quedan = etiquetasDelLado(nuevo, etiquetas);
    setArriba(nuevo);
    setEtiquetas(quedan);
    if (enviado !== firma(nuevo, quedan)) enviar(nuevo, quedan);
  }

  function tocarEtiqueta(etiqueta: Etiqueta) {
    setEtiquetas((antes) => (antes.includes(etiqueta) ? antes.filter((e) => e !== etiqueta) : [...antes, etiqueta]));
  }

  function listo() {
    if (arriba === null) return;
    if (enviado !== firma(arriba, etiquetasDelLado(arriba, etiquetas))) enviar(arriba, etiquetas);
    onListo();
  }

  return (
    <View style={{ gap: SIZE.space }}>
      <Text style={{ ...TITULO, fontSize: 19, textAlign: 'center', color: PALETTE.tinta }}>{ES.pulgar.pregunta(nombre)}</Text>
      <Pulgares arriba={arriba} onPulgar={tocarPulgar} />
      {arriba !== null && <Etiquetas todas={etiquetasPara(arriba)} elegidas={etiquetas} onTocar={tocarEtiqueta} />}
      {inicial !== null && inicial.cambiarHasta !== null && (
        <Text style={{ fontSize: SIZE.smallSize, textAlign: 'center', color: PALETTE.tintaApagada }}>
          {ES.pulgar.cambiarHasta(cuandoTexto(inicial.cambiarHasta, ahora))}
        </Text>
      )}
      {rechazo !== null && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.error, textAlign: 'center' }}>{ES.apartados.fallas[rechazo]}</Text>}
      {arriba !== null && <BotonLleno variante="principal" label={ES.pulgar.listo} onPress={listo} />}
      {onDespues !== null && <BotonLleno variante="discreto" label={ES.pulgar.despues} onPress={onDespues} />}
    </View>
  );
}

/** A thumb and its labels as one comparable value. */
function firma(arriba: boolean, etiquetas: readonly Etiqueta[]): string {
  return `${arriba ? '+' : '-'}${etiquetasDelLado(arriba, etiquetas).join(',')}`;
}

/** 👍 and 👎, the chosen one on the green's tint. `onPulgar` `null`: drawn, not offered. */
function Pulgares({ arriba, onPulgar }: { arriba: boolean | null; onPulgar: ((arriba: boolean) => void) | null }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SIZE.space + 4 }}>
      {[true, false].map((valor) => {
        const elegido = arriba === valor;
        return (
          <Pressable
            key={String(valor)}
            accessibilityRole="button"
            accessibilityLabel={valor ? ES.pulgar.arribaAyuda : ES.pulgar.abajoAyuda}
            accessibilityState={{ selected: elegido, disabled: onPulgar === null }}
            disabled={onPulgar === null}
            onPress={() => onPulgar?.(valor)}
            style={{
              width: 76,
              height: 60,
              borderRadius: SIZE.space + 4,
              borderWidth: 1.5,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: elegido ? PALETTE.accion : PALETTE.linea,
              backgroundColor: elegido ? PALETTE.accionSuave : PALETTE.superficie,
              opacity: onPulgar === null && !elegido ? 0.4 : 1,
            }}
          >
            <Text style={{ fontSize: 28 }}>{valor ? ES.apartados.pulgares.arriba : ES.apartados.pulgares.abajo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The labels of the thumb's side, each a chip. `onTocar` `null`: drawn, not offered. */
function Etiquetas({
  todas,
  elegidas,
  onTocar,
}: {
  todas: readonly Etiqueta[];
  elegidas: readonly Etiqueta[];
  onTocar: ((etiqueta: Etiqueta) => void) | null;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SIZE.rowGap }}>
      {todas.map((etiqueta) => {
        const elegida = elegidas.includes(etiqueta);
        const texto = ES.pulgar.etiquetas[etiqueta];
        return (
          <Pressable
            key={etiqueta}
            accessibilityRole="button"
            accessibilityLabel={texto}
            accessibilityState={{ selected: elegida, disabled: onTocar === null }}
            disabled={onTocar === null}
            onPress={() => onTocar?.(etiqueta)}
            style={{
              minHeight: SIZE.tapTarget - 8,
              justifyContent: 'center',
              paddingHorizontal: SIZE.space,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: elegida ? PALETTE.accion : PALETTE.linea,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: elegida ? PALETTE.accion : PALETTE.tinta }}>{texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
