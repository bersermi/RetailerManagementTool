// ============================================================================
// THE SEARCH BOX ABOVE HER MAP, AND WHAT IT SUGGESTS. Plan tasks `10.4c` and
// `10.4g-i` (Google's suggestions, the owner's ruling of 2026-11-03).
//
// Two pieces `@/ui/MapaPunto` places: the box above the map, and the list of
// suggestions laid OVER the top of the map. ⚠️ THE LIST IS INSIDE THE MAP'S AREA
// ON PURPOSE: Android delivers no touch to a child drawn outside its parent's
// bounds, so a list hanging below the box would be visible and dead.
//
// ⚠️ GOOGLE'S CREDIT IS AT THE FOOT OF THE LIST'S OWN BOX (`ES.mapa.creditoGoogle`,
// its Places policies, read 2026-11-03): no extra credit is owed where Google's map
// and its logo show, but on a small phone with the keys up the list can cover the
// map's foot, logo and all. The text is Google's, never translated or wrapped.
//
// ⚠️ A MAGNIFIER AND A HINT, NOT A LABEL ABOVE IT — unlike every other box in
// this app (`@/ui/Campo`): this box is never saved, and a labelled box reads as
// one more field of her address. What she picks only moves the map.
//
// ⚠️ THE LIST SCROLLS AND KEEPS THE KEYBOARD (`keyboardShouldPersistTaps`): with
// the keys up, a small phone has room for two or three rows, and a tap on a
// suggestion must choose it, not just close the keyboard.
//
// ⚠️ THE LIST IS GOOGLE'S SUGGESTIONS (`10.4g-i`): her door once she has typed
// her number, her street before — measured 2026-11-03, with her colonia and city
// the first row was on her block for 12 of the twenty addresses. The keyboard's
// *Buscar* key asks Google's Geocoding for what she typed.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { Sugerencia, Sugerencias } from '@/lib/google';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

/** The box. ✕ empties it and keeps her in it; *Buscar* asks Google's Geocoding. */
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
  const caja = useRef<TextInput>(null);
  return (
    <View
      style={{
        paddingHorizontal: SIZE.space * 2,
        paddingTop: SIZE.space,
        paddingBottom: SIZE.rowGap,
        gap: SIZE.rowGap / 2,
        backgroundColor: PALETTE.fondo,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
      }}
    >
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          ref={caja}
          accessibilityLabel={ES.mapa.buscarEtiqueta}
          placeholder={ES.mapa.buscar}
          placeholderTextColor={PALETTE.tintaApagada}
          value={texto}
          onChangeText={onTexto}
          onFocus={onFoco}
          onSubmitEditing={onBuscar}
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
        {texto !== '' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ES.mapa.borrarBusqueda}
            onPress={() => {
              onBorrar();
              caja.current?.focus();
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
    </View>
  );
}

/** The suggestions, over the top of the map; nothing at all while there is nothing to say. */
export function ListaDeSugerencias({
  sugerencias,
  onElegir,
}: {
  sugerencias: Sugerencias;
  onElegir: (sugerencia: Sugerencia) => void;
}) {
  if (sugerencias.kind === 'nada') return null;
  const linea =
    sugerencias.kind === 'ninguna'
      ? ES.mapa.ninguna
      : sugerencias.kind === 'sin-senal'
        ? ES.mapa.sinSenal
        : sugerencias.kind === 'falla'
          ? ES.mapa.falla
          : null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: SIZE.space, paddingTop: SIZE.rowGap }}
    >
      <View
        style={{
          flexShrink: 1,
          backgroundColor: PALETTE.superficie,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          borderRadius: SIZE.space * 0.75,
          elevation: 6,
          overflow: 'hidden',
        }}
      >
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" bounces={false}>
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
          {linea !== null && (
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta, padding: SIZE.space }}>{linea}</Text>
          )}
        </ScrollView>
        <CreditoDeGoogle />
      </View>
    </View>
  );
}

/** Google's gray, which its attribution rules allow on a light ground. */
const GRIS_DE_GOOGLE = '#5E5E5E';

/**
 * ⚠️ *GOOGLE MAPS*, AS ITS ATTRIBUTION RULES WRITE IT (read 2026-11-03): Roboto
 * (Android's own; an iPhone's system sans-serif), weight 400, 12 to 16 points, its
 * gray, on one line, untranslated — at the foot of the suggestions' box, the same
 * container as what it credits. Drawn by the address form's list too.
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
