import { Icono } from '@/ui/Icono';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useAvisos, useSeguir, useSiguiendo, type FallaDeSeguir } from '@/api/hooks';
import { switchesDe, type Cambio, type Switches } from '@/api/siguiendo';
import { pedirPermisoParaAvisos } from '@/lib/avisos';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';

// ============================================================================
// *SEGUIR* AND ITS BELL, ON A KITCHEN'S PAGE. Plan task `10.9d-ii`, the owner's rulings G20 and
// G21 of 2026-11-17, as the family-shell page draws stage 3: a wide *Seguir* with a heart —
// filled in Itacate's blue until she follows, then *La sigues* in the light one — and beside it a
// square bell, filled while it is on. TWO SWITCHES, EITHER ALONE (`0084`): the bell may ring a
// kitchen she does not follow, and *Mis cocinas* lists only those she follows.
//
// ⚠️ THE BELL RINGS SINCE `10.9h-i` AND `10.5c-iii`: the database queues its message (`0094`, kind `publico`)
// and this phone receives it (`@/lib/AvisosDelTelefono`). It starts off, as `0084` stores it; ⚠️ RUNG ON,
// ONCE IT LANDS, THE PHONE IS ASKED for notifications if it does not allow them and still can — the moment
// it is for is on the screen (`@/lib/avisosPush`); the phone's settings are never opened from here.
// ⚠️ DRAWN ONLY ONCE IT LANDS (`useSeguir`): the button waits busy and shows the database's answer;
// a refusal is said under it. NO CHECK CAN SEE THIS (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function Seguir({ cocinaId, nombre }: { cocinaId: string; nombre: string }) {
  const siguiendo = useSiguiendo();
  const { cambiar, busy } = useSeguir();
  const avisos = useAvisos();
  /**
   * The database's last answer to her tap, and when it came — drawn until her list is read again after it
   * (`dataUpdatedAt`), then the list wins: another page of the same kitchen may have changed it since.
   */
  const [ultimo, setUltimo] = useState<{ readonly valor: Switches; readonly at: number } | null>(null);
  const [cual, setCual] = useState<'seguir' | 'campana' | null>(null);
  const [falla, setFalla] = useState<FallaDeSeguir | null>(null);

  // ⚠️ Not read yet, nothing to tap: a *Seguir* drawn before her list is known could undo a follow.
  const vigente = ultimo !== null && siguiendo.dataUpdatedAt <= ultimo.at ? ultimo.valor : null;
  if (siguiendo.data === undefined && vigente === null) return null;
  const leidos = switchesDe(siguiendo.data, cocinaId);
  const ahora = vigente ?? leidos;

  async function tocar(que: 'seguir' | 'campana') {
    if (busy) return;
    const cambio: Cambio = que === 'seguir' ? { siguiendo: !ahora.siguiendo } : { campana: !ahora.campana };
    setCual(que);
    setFalla(null);
    const resultado = await cambiar(cocinaId, cambio);
    setCual(null);
    if (resultado.ok) {
      setUltimo({ valor: resultado.valor, at: Date.now() });
      if (que === 'campana' && resultado.valor.campana) void pedirPermisoParaAvisos(avisos.data ?? []);
    } else {
      setFalla(resultado.falla);
    }
  }

  const sigue = ahora.siguiendo;
  const ink = sigue ? PALETTE.accion : PALETTE.superficie;
  return (
    <View style={{ gap: SIZE.rowGap / 2, paddingTop: SIZE.rowGap / 2 }}>
      <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sigue ? ES.seguir.dejarAyuda(nombre) : ES.seguir.seguirAyuda(nombre)}
          accessibilityState={{ selected: sigue, disabled: busy }}
          disabled={busy}
          onPress={() => void tocar('seguir')}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: SIZE.tapTarget,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SIZE.rowGap,
            borderRadius: ESQUINA.boton,
            borderWidth: 1,
            borderColor: PALETTE.accion,
            backgroundColor: sigue ? PALETTE.accionSuave : PALETTE.accion,
            opacity: pressed || (busy && cual !== 'seguir') ? 0.7 : 1,
          })}
        >
          {busy && cual === 'seguir' ? (
            <ActivityIndicator color={ink} />
          ) : (
            <Icono name={sigue ? 'heart' : 'heart-outline'} size={SIZE.iconSize - 4} color={ink} />
          )}
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: ink }}>{sigue ? ES.seguir.laSigues : ES.seguir.seguir}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={ahora.campana ? ES.seguir.campanaOn : ES.seguir.campanaOff}
          accessibilityState={{ checked: ahora.campana, disabled: busy }}
          disabled={busy}
          onPress={() => void tocar('campana')}
          style={({ pressed }) => ({
            width: SIZE.tapTarget + 4,
            minHeight: SIZE.tapTarget,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: ESQUINA.boton,
            borderWidth: 1,
            borderColor: ahora.campana ? PALETTE.accion : PALETTE.linea,
            backgroundColor: ahora.campana ? PALETTE.accion : PALETTE.superficie,
            opacity: pressed || (busy && cual !== 'campana') ? 0.7 : 1,
          })}
        >
          {busy && cual === 'campana' ? (
            <ActivityIndicator color={ahora.campana ? PALETTE.superficie : PALETTE.accion} />
          ) : (
            <Icono
              name={ahora.campana ? 'bell' : 'bell-outline'}
              size={SIZE.iconSize - 2}
              color={ahora.campana ? PALETTE.superficie : PALETTE.tinta}
            />
          )}
        </Pressable>
      </View>
      {falla !== null && (
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, fontWeight: '600', color: PALETTE.error }}>{ES.seguir.fallas[falla]}</Text>
      )}
    </View>
  );
}
