// ============================================================================
// THE SEARCH BOX ABOVE HER MAP, AND WHAT IT SUGGESTS. Plan task `10.4c`.
//
// Two pieces `@/ui/MapaPunto` places: the box (with the credit LocationIQ's free
// plan requires) above the map, and the list of suggestions laid OVER the top of
// the map. ⚠️ THE LIST IS INSIDE THE MAP'S AREA ON PURPOSE: Android delivers no
// touch to a child drawn outside its parent's bounds, so a list hanging below
// the box would be visible and dead.
//
// ⚠️ A MAGNIFIER AND A HINT, NOT A LABEL ABOVE IT — unlike every other box in
// this app (`@/ui/Campo`): this box is never saved, and a labelled box reads as
// one more field of her address. What she picks only moves the map.
//
// ⚠️ THE LIST SCROLLS AND KEEPS THE KEYBOARD (`keyboardShouldPersistTaps`): with
// the keys up, a small phone has room for two or three rows, and a tap on a
// suggestion must choose it, not just close the keyboard.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { CREDITO_LOCATIONIQ_URL, CREDITO_OSM_URL, type Respuesta } from '@/lib/buscar';
import type { Sugerencias } from '@/lib/locationiq';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

/** The box, and under it the credit. ✕ empties it and keeps her in it. */
export function CampoDeBusqueda({
  texto,
  onTexto,
  onFoco,
  onBorrar,
}: {
  texto: string;
  onTexto: (texto: string) => void;
  onFoco: () => void;
  onBorrar: () => void;
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.space }}>
        <Text
          accessibilityRole="link"
          onPress={() => void Linking.openURL(CREDITO_LOCATIONIQ_URL)}
          style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textDecorationLine: 'underline' }}
        >
          {ES.mapa.creditoBusqueda}
        </Text>
        <Text
          accessibilityRole="link"
          onPress={() => void Linking.openURL(CREDITO_OSM_URL)}
          style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textDecorationLine: 'underline' }}
        >
          {ES.mapa.creditoDatos}
        </Text>
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
  onElegir: (respuesta: Respuesta) => void;
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
          {sugerencias.kind === 'respuestas' &&
            sugerencias.respuestas.map((respuesta, i) => (
              <Pressable
                key={respuesta.id}
                accessibilityRole="button"
                onPress={() => onElegir(respuesta)}
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
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{respuesta.titulo}</Text>
                {respuesta.detalle !== '' && (
                  <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{respuesta.detalle}</Text>
                )}
              </Pressable>
            ))}
          {linea !== null && (
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta, padding: SIZE.space }}>{linea}</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
