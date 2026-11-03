// ============================================================================
// THE SEARCH BOXES AND WHAT THEY SUGGEST. Plan tasks `10.4c` and `10.4g-i`
// (Google's suggestions, the owner's ruling of 2026-11-03).
//
// Two searches draw from here. The MAP'S (`@/ui/MapaPunto`): the box above the map
// (`CampoDeBusqueda`) and its list laid OVER the top of the map
// (`ListaDeSugerencias`). ⚠️ THAT LIST IS INSIDE THE MAP'S AREA ON PURPOSE: Android
// delivers no touch to a child drawn outside its parent's bounds, so a list
// hanging below the box would be visible and dead. And the ADDRESS FORM'S
// (`@/ui/Direccion`, *Busca tu dirección*, his answer of 2026-11-03): the same box
// (`CajaDeBusqueda`) and its list in the form's own flow, under it
// (`SugerenciasEnElFormulario`) — the form scrolls, and brings the box to its top
// (`@/ui/Formulario`'s `useArriba`) so the rows show above the keyboard.
//
// ⚠️ GOOGLE'S CREDIT IS AT THE FOOT OF EACH LIST'S OWN BOX (`ES.mapa.creditoGoogle`,
// its Places policies, read 2026-11-03): over the map the list can cover the map's
// foot, logo and all, on a small phone with the keys up; and the form has no map.
// The text is Google's, never translated or wrapped.
//
// ⚠️ A MAGNIFIER AND A HINT, NOT A LABEL ABOVE IT — unlike every other box in
// this app (`@/ui/Campo`): neither box is saved, and a labelled box reads as one
// more field of her address. A pick on the map only moves the map; a pick in the
// form fills her five boxes, which stay hers to change.
//
// ⚠️ THE LISTS KEEP THE KEYBOARD (`keyboardShouldPersistTaps`, here over the map
// and on the form's own scroll view): with the keys up, a small phone has room for
// two or three rows, and a tap on a suggestion must choose it, not just close the
// keyboard.
//
// ⚠️ THE ROWS ARE GOOGLE'S SUGGESTIONS (`10.4g-i`): her door once she has typed
// her number, her street before — measured 2026-11-03, with her colonia and city
// the first row was on her block for 12 of the twenty addresses. The map's
// keyboard *Buscar* key asks Google's Geocoding for what she typed; the form's
// only closes the keyboard, leaving its list in view.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, type RefObject } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { Sugerencia, Sugerencias } from '@/lib/google';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

/**
 * The box itself — `Campo`'s look, with a magnifier and no label. ✕ empties it and
 * keeps her in it; the keyboard's key is `onBuscar`.
 */
export function CajaDeBusqueda({
  texto,
  onTexto,
  onFoco,
  onBorrar,
  onBuscar,
  hint,
  etiqueta,
  editable = true,
  caja,
}: {
  texto: string;
  onTexto: (texto: string) => void;
  onFoco: () => void;
  onBorrar: () => void;
  onBuscar: () => void;
  hint: string;
  etiqueta: string;
  editable?: boolean;
  /** Its box, for a form that brings it to its top when focused (`@/ui/Formulario`'s `useArriba`). */
  caja?: RefObject<TextInput | null>;
}) {
  const propia = useRef<TextInput>(null);
  const ref = caja ?? propia;
  return (
    <View style={{ justifyContent: 'center' }}>
      <TextInput
        ref={ref}
        accessibilityLabel={etiqueta}
        placeholder={hint}
        placeholderTextColor={PALETTE.tintaApagada}
        value={texto}
        onChangeText={onTexto}
        onFocus={onFoco}
        onSubmitEditing={onBuscar}
        editable={editable}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        submitBehavior="blurAndSubmit"
        style={{
          fontSize: SIZE.bodySize,
          minHeight: SIZE.tapTarget,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          borderRadius: SIZE.space * 0.75,
          paddingLeft: SIZE.iconSize + SIZE.space * 1.5,
          paddingRight: texto === '' ? SIZE.space : SIZE.tapTarget,
          backgroundColor: PALETTE.superficie,
          color: PALETTE.tinta,
        }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', left: SIZE.space }}>
        <MaterialCommunityIcons name="magnify" size={SIZE.iconSize} color={PALETTE.tintaApagada} />
      </View>
      {texto !== '' && editable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.mapa.borrarBusqueda}
          onPress={() => {
            onBorrar();
            ref.current?.focus();
          }}
          hitSlop={SIZE.rowGap}
          style={{
            position: 'absolute',
            right: 0,
            minWidth: SIZE.tapTarget,
            minHeight: SIZE.tapTarget,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="close-circle" size={SIZE.iconSize * 0.85} color={PALETTE.tintaApagada} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** The map's box, in its strip above the map. *Buscar* asks Google's Geocoding. */
export function CampoDeBusqueda({
  texto,
  onTexto,
  onFoco,
  onBorrar,
  onBuscar,
}: {
  texto: string;
  onTexto: (texto: string) => void;
  onFoco: () => void;
  onBorrar: () => void;
  onBuscar: () => void;
}) {
  return (
    <View
      style={{
        paddingHorizontal: SIZE.space * 2,
        paddingTop: SIZE.space,
        paddingBottom: SIZE.rowGap,
        backgroundColor: PALETTE.fondo,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
      }}
    >
      <CajaDeBusqueda
        texto={texto}
        onTexto={onTexto}
        onFoco={onFoco}
        onBorrar={onBorrar}
        onBuscar={onBuscar}
        hint={ES.mapa.buscar}
        etiqueta={ES.mapa.buscarEtiqueta}
      />
    </View>
  );
}

/** What a list says when it has no rows to show, in the words of the box it serves. */
interface SinFilas {
  readonly ninguna: string;
  readonly sinSenal: string;
  readonly falla: string;
}

/** The rows of one list: *Buscando…*, Google's suggestions, or why there are none. */
function Filas({
  sugerencias,
  onElegir,
  palabras,
}: {
  sugerencias: Exclude<Sugerencias, { kind: 'nada' }>;
  onElegir: (sugerencia: Sugerencia) => void;
  palabras: SinFilas;
}) {
  const linea =
    sugerencias.kind === 'ninguna'
      ? palabras.ninguna
      : sugerencias.kind === 'sin-senal'
        ? palabras.sinSenal
        : sugerencias.kind === 'falla'
          ? palabras.falla
          : null;
  return (
    <>
      {sugerencias.kind === 'buscando' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, padding: SIZE.space }}>
          <ActivityIndicator color={PALETTE.accion} />
          <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.mapa.buscando}</Text>
        </View>
      )}
      {sugerencias.kind === 'sugerencias' &&
        sugerencias.sugerencias.map((sugerencia, i) => (
          <Pressable
            key={sugerencia.id}
            accessibilityRole="button"
            onPress={() => onElegir(sugerencia)}
            style={({ pressed }) => ({
              minHeight: SIZE.tapTarget,
              justifyContent: 'center',
              paddingVertical: SIZE.rowGap,
              paddingHorizontal: SIZE.space,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: PALETTE.linea,
              backgroundColor: pressed ? PALETTE.accionSuave : PALETTE.superficie,
            })}
          >
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{sugerencia.titulo}</Text>
            {sugerencia.detalle !== '' && (
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{sugerencia.detalle}</Text>
            )}
          </Pressable>
        ))}
      {linea !== null && <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta, padding: SIZE.space }}>{linea}</Text>}
    </>
  );
}

/** A list's own box: a white card with the form's line and corners. */
const CAJA = {
  backgroundColor: PALETTE.superficie,
  borderWidth: 1,
  borderColor: PALETTE.linea,
  borderRadius: SIZE.space * 0.75,
  overflow: 'hidden',
} as const;

/** The map's suggestions, over the top of the map; nothing at all while there is nothing to say. */
export function ListaDeSugerencias({
  sugerencias,
  onElegir,
}: {
  sugerencias: Sugerencias;
  onElegir: (sugerencia: Sugerencia) => void;
}) {
  if (sugerencias.kind === 'nada') return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: SIZE.space, paddingTop: SIZE.rowGap }}
    >
      <View style={{ ...CAJA, flexShrink: 1, elevation: 6 }}>
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <Filas sugerencias={sugerencias} onElegir={onElegir} palabras={ES.mapa} />
        </ScrollView>
        <CreditoDeGoogle />
      </View>
    </View>
  );
}

/**
 * The address form's suggestions, under its box in the form's own flow — the form
 * scrolls, so this list does not; at most Google's five rows. Nothing at all while
 * there is nothing to say.
 */
export function SugerenciasEnElFormulario({
  sugerencias,
  onElegir,
}: {
  sugerencias: Sugerencias;
  onElegir: (sugerencia: Sugerencia) => void;
}) {
  if (sugerencias.kind === 'nada') return null;
  return (
    <View style={CAJA}>
      <Filas sugerencias={sugerencias} onElegir={onElegir} palabras={ES.buscaDireccion} />
      <CreditoDeGoogle />
    </View>
  );
}

/** Google's gray, which its attribution rules allow on a light ground. */
const GRIS_DE_GOOGLE = '#5E5E5E';

/**
 * ⚠️ *GOOGLE MAPS*, AS ITS ATTRIBUTION RULES WRITE IT (read 2026-11-03): Roboto
 * (Android's own; an iPhone's system sans-serif), weight 400, 12 to 16 points, its
 * gray, on one line, untranslated — at the foot of each list's own box, the same
 * container as what it credits.
 */
export function CreditoDeGoogle() {
  return (
    <View
      style={{
        paddingHorizontal: SIZE.space,
        paddingVertical: SIZE.rowGap / 2,
        borderTopWidth: 1,
        borderTopColor: PALETTE.linea,
        alignItems: 'flex-end',
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: Platform.OS === 'android' ? 'Roboto' : undefined,
          fontWeight: '400',
          fontSize: 12,
          color: GRIS_DE_GOOGLE,
        }}
      >
        {ES.mapa.creditoGoogle}
      </Text>
    </View>
  );
}
