import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import type { Posicion } from '@/api/apartados';
import type { Comer, Dish, Kitchen, Offer, Pago } from '@/api/cocinas';
import { useApartados, useApartar, useDarMiSi } from '@/api/hooks';
import { AVISO_URL, TERMINOS_URL } from '@/auth/aviso';
import { formatMXN } from '@/format/mxn';
import { pasaTexto } from '@/lib/apartados';
import { comeresDe, horasDe, horaVigente, inicialDe, porcentajeDe, totalDe } from '@/lib/apartar';
import { pedirPermiso } from '@/lib/avisos';
import { nuevoId } from '@/lib/ids';
import { ventanaTexto } from '@/lib/lista';
import { ANTES_MS } from '@/lib/recordatorio';
import { clockOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Hoja } from '@/ui/Hoja';
import { Opcion } from '@/ui/Opcion';

// ============================================================================
// *APARTAR*, THE SHEET. Plan task `10.5b-iii-a` — slice 3's design as the owner ruled it
// on 2026-11-05 (the family-shell page, stage 2: how she eats it when both are open,
// *Para llevar* first; her hour in quarter hours; how she pays, beside the button; the
// total before she reserves) and `10.5b-ii`'s final design of 2026-11-10: *Antes de tu
// primer apartado* with her express yes, once, and *La cocina verá tu nombre y tu
// calificación* under the button. Every rule is `@/lib/apartar`'s.
//
// ⚠️ THREE STEPS IN ONE SHEET: her yes (only before her first reservation — `my_standing`'s
// `yes_at`), her choice, and her code. ⚠️ THE RESERVATION'S ID IS MADE HERE, when the sheet
// opens, and made again whenever she changes her hour, how she eats it or how she pays —
// so a tap sent again after a lost answer is that same reservation, and a changed one
// never comes back as the old. ⚠️ An hour the clock passes while the sheet is open moves to
// the next (`horaVigente`) — keeping the id, so a tap sent again after a lost answer is
// still the one reservation; ⚠️ AND SO HER CODE'S HOUR IS THE DATABASE'S: once her
// reservations are read again it is the one kept under that id, with its day (*Pasa mañana
// a la 1:00*) — never only the chip she tapped (found by the review of `10.5b-iii-a`).
// ⚠️ SINCE `10.5b-iii-b`: her yes accepts the terms of use too (both links above it), and once
// a reservation goes through her phone is asked — while it still lets Itacate ask — to let it
// remind her 15 minutes before her hour (`@/lib/avisos`), said under her code when it will. NO CHECK CAN SEE THIS
// SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** The sheet's body scrolls past this share of the screen — a long window has many hours. */
const ALTO_MAXIMO = 0.72;

export function HojaApartar({
  visible,
  cocina,
  oferta,
  platillo,
  distancia,
  posicion,
  ahora,
  onCerrar,
  onVerApartado,
}: {
  visible: boolean;
  cocina: Kitchen;
  oferta: Offer;
  platillo: Dish;
  /** How far her kitchen is, in words, or `null`. */
  distancia: string | null;
  posicion: Posicion | undefined;
  ahora: Date;
  onCerrar: () => void;
  onVerApartado: () => void;
}) {
  const { height } = useWindowDimensions();
  const { apartar, busy } = useApartar();
  const { darSi, busy: dandoSi } = useDarMiSi();
  const apartados = useApartados();
  const [id, setId] = useState(() => nuevoId());
  const [hora, setHora] = useState<Date | null>(null);
  const [comer, setComer] = useState<Comer>('llevar');
  const [pago, setPago] = useState<Pago>('efectivo');
  const [pagosAbiertos, setPagosAbiertos] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);
  const [siDado, setSiDado] = useState(false);
  const [listo, setListo] = useState<{ readonly id: string; readonly codigo: string; readonly hora: Date } | null>(null);
  const [teAvisamos, setTeAvisamos] = useState(false);

  // Each opening starts afresh: the first hour, *para llevar* when it can be, cash, a new id.
  useEffect(() => {
    if (!visible) return;
    const inicial = inicialDe(oferta, platillo, new Date());
    setHora(inicial.hora);
    setComer(inicial.comer);
    setPago(inicial.pago);
    setPagosAbiertos(false);
    setFalla(null);
    setListo(null);
    setTeAvisamos(false);
    setId(nuevoId());
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const horas = horasDe(oferta, ahora);
  const horaElegida = horaVigente(hora, horas);
  const comeres = comeresDe(platillo);
  const cuenta = totalDe(platillo, oferta, comer);
  const paso = listo !== null ? 'listo' : posicion?.siDesde === null && !siDado ? 'si' : 'elegir';
  /** Her hour as the database kept it under this id, once read; the chip she tapped until then. */
  const horaDelListo = listo === null ? null : (apartados.data?.find((a) => a.id === listo.id)?.hora ?? listo.hora);
  const titulo =
    paso === 'listo' ? ES.apartar.listo : paso === 'si' ? ES.apartar.antes.titulo : ES.apartar.titulo(platillo.name);

  /** A changed choice is a new reservation: a new id, and no old refusal left on screen. */
  function cambia(hacer: () => void) {
    hacer();
    setId(nuevoId());
    setFalla(null);
  }

  async function aceptar() {
    const resultado = await darSi();
    if (resultado.ok) {
      setSiDado(true);
      setFalla(null);
    } else {
      setFalla(ES.apartar.fallas[resultado.falla]);
    }
  }

  async function confirmar() {
    if (horaElegida === null || busy) return;
    const resultado = await apartar({ id, ofertaId: oferta.id, lineNo: platillo.lineNo, hora: horaElegida, pago, comer });
    if (resultado.ok) {
      setListo({ id: resultado.valor.id, codigo: resultado.valor.codigo, hora: horaElegida });
      // Her reminder: her phone is asked, now that what it is for is on the screen.
      const recordar = horaElegida.getTime() - ANTES_MS > Date.now();
      void pedirPermiso().then((si) => setTeAvisamos(si && recordar));
    } else {
      setFalla(ES.apartar.fallas[resultado.falla]);
    }
  }

  return (
    <Hoja visible={visible} titulo={titulo} onCerrar={onCerrar}>
      <ScrollView style={{ maxHeight: height * ALTO_MAXIMO }} contentContainerStyle={{ gap: SIZE.space }} bounces={false}>
        {paso === 'si' && (
          <>
            <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{ES.apartar.antes.comoFunciona}</Text>
            <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{ES.apartar.antes.queVen}</Text>
            <View style={{ gap: SIZE.rowGap, padding: SIZE.space, borderRadius: 14, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.apartar.antes.asiTeVeran}</Text>
              <Etiqueta texto={posicion === undefined ? ES.tu.nueva : comoTeVen(posicion)} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: SIZE.space * 1.5 }}>
              {[
                { texto: ES.apartar.antes.aviso, url: AVISO_URL },
                { texto: ES.apartar.antes.terminos, url: TERMINOS_URL },
              ].map((enlace) => (
                <Pressable
                  key={enlace.url}
                  accessibilityRole="link"
                  accessibilityLabel={enlace.texto}
                  onPress={() => {
                    WebBrowser.openBrowserAsync(enlace.url).catch(() => {});
                  }}
                  style={({ pressed }) => ({ minHeight: SIZE.tapTarget - SIZE.rowGap, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.accion }}>{enlace.texto}</Text>
                </Pressable>
              ))}
            </View>
            {falla !== null && <Falla texto={falla} />}
            <BotonLleno label={ES.apartar.antes.acepto} variante="principal" busy={dandoSi} onPress={() => void aceptar()} />
          </>
        )}

        {paso === 'elegir' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.tinta }}>{cocina.name}</Text>
                <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>
                  {distancia === null ? ventanaTexto(oferta, ahora) : `${ventanaTexto(oferta, ahora)} · ${distancia}`}
                </Text>
              </View>
              <Text style={{ fontSize: SIZE.bodySize + 2, ...TITULO, color: PALETTE.tinta }}>{formatMXN(platillo.priceCentavos)}</Text>
            </View>

            {comeres.length === 2 ? (
              <View style={{ gap: SIZE.rowGap }}>
                <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tinta }}>{ES.apartar.comoComes}</Text>
                <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
                  {comeres.map((forma) => (
                    <Ficha
                      key={forma}
                      texto={ES.apartar.forma[forma]}
                      icono={forma === 'llevar' ? 'shopping-outline' : 'silverware-fork-knife'}
                      elegida={comer === forma}
                      ancha
                      onPress={() => cambia(() => setComer(forma))}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
                <MaterialCommunityIcons
                  name={comeres[0] === 'aqui' ? 'silverware-fork-knife' : 'shopping-outline'}
                  size={SIZE.iconSize - 4}
                  color={PALETTE.tintaApagada}
                />
                <Text style={{ fontSize: SIZE.bodySize - 1, color: PALETTE.tinta }}>
                  {comeres[0] === 'aqui' ? ES.platillo.comer.aqui : ES.platillo.comer.llevar}
                </Text>
              </View>
            )}

            <View style={{ gap: SIZE.rowGap }}>
              <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tinta }}>{ES.apartar.aQueHora}</Text>
              {horas.length === 0 ? (
                <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.apartar.sinHoras}</Text>
              ) : (
                <>
                  <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
                    {horas.map((h) => (
                      <Ficha
                        key={h.getTime()}
                        texto={clockOf(h)}
                        elegida={horaElegida !== null && h.getTime() === horaElegida.getTime()}
                        onPress={() => cambia(() => setHora(h))}
                      />
                    ))}
                  </View>
                  <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>
                    {comer === 'aqui' ? ES.apartar.notaAqui : ES.apartar.notaLlevar}
                  </Text>
                </>
              )}
            </View>

            {pagosAbiertos && cocina.pagos.length > 1 && (
              <View accessibilityRole="radiogroup" style={{ gap: SIZE.rowGap }}>
                {cocina.pagos.map((forma) => (
                  <Opcion
                    key={forma}
                    titulo={ES.platillo.pago[forma]}
                    detalle={ES.apartar.pagoDetalle[forma]}
                    elegida={pago === forma}
                    onPress={() =>
                      cambia(() => {
                        setPago(forma);
                        setPagosAbiertos(false);
                      })
                    }
                  />
                ))}
              </View>
            )}

            {falla !== null && <Falla texto={falla} />}

            {horaElegida !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: SIZE.rowGap }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ES.apartar.elegirPago(ES.platillo.pago[pago])}
                accessibilityState={{ disabled: cocina.pagos.length < 2, expanded: pagosAbiertos }}
                disabled={cocina.pagos.length < 2}
                onPress={() => setPagosAbiertos((abierto) => !abierto)}
                style={({ pressed }) => ({
                  minHeight: SIZE.tapTarget,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SIZE.rowGap / 2,
                  paddingHorizontal: SIZE.space,
                  borderRadius: SIZE.space / 2,
                  borderWidth: 1.5,
                  borderColor: PALETTE.linea,
                  backgroundColor: PALETTE.superficie,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialCommunityIcons name={iconoDe(pago)} size={SIZE.iconSize - 2} color={PALETTE.tinta} />
                <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.tinta }}>{ES.platillo.pago[pago]}</Text>
                {cocina.pagos.length > 1 && (
                  <MaterialCommunityIcons name={pagosAbiertos ? 'chevron-up' : 'chevron-down'} size={18} color={PALETTE.tintaApagada} />
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <BotonLleno
                  label={ES.apartar.boton(formatMXN(cuenta.total))}
                  variante="principal"
                  busy={busy}
                  onPress={() => void confirmar()}
                />
              </View>
            </View>
            )}

            {cuenta.desechable !== null && (
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>
                {`${ES.apartar.total} ${formatMXN(cuenta.total)} · ${ES.apartar.conDesechable(formatMXN(cuenta.platillo), formatMXN(cuenta.desechable))}`}
              </Text>
            )}
            <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tinta }}>{ES.apartar.tuNombre}</Text>
            <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.apartar.pie}</Text>
          </>
        )}

        {paso === 'listo' && listo !== null && (
          <View style={{ alignItems: 'center', gap: SIZE.space }}>
            <MaterialCommunityIcons name="check-circle" size={48} color={PALETTE.accion} />
            <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>{ES.apartar.tuCodigo}</Text>
            <Text
              accessibilityLabel={listo.codigo.split('').join(' ')}
              style={{ fontSize: 44, ...TITULO, letterSpacing: 6, color: PALETTE.tinta, fontVariant: ['tabular-nums'] }}
            >
              {listo.codigo}
            </Text>
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
              {pasaTexto(horaDelListo ?? listo.hora, ahora)}
            </Text>
            {teAvisamos && (
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{ES.apartar.teAvisamos}</Text>
            )}
            <View style={{ alignSelf: 'stretch' }}>
              <BotonLleno label={ES.apartar.verTuApartado} variante="principal" onPress={onVerApartado} />
            </View>
          </View>
        )}
      </ScrollView>
    </Hoja>
  );
}

/** What a kitchen sees of her today — her score, or *Nueva en Itacate*. */
function comoTeVen(posicion: Posicion): string {
  const pct = porcentajeDe(posicion.calificacion);
  return pct === null ? ES.tu.nueva : ES.tu.porcentaje(pct);
}

function iconoDe(pago: Pago): 'cash' | 'credit-card-outline' | 'bank-transfer' {
  return pago === 'tarjeta' ? 'credit-card-outline' : pago === 'transferencia' ? 'bank-transfer' : 'cash';
}

/** One choice among a few — an hour, a way to eat it — Itacate's blue when chosen, never colour alone. */
function Ficha({
  texto,
  icono,
  elegida,
  ancha = false,
  onPress,
}: {
  texto: string;
  icono?: 'shopping-outline' | 'silverware-fork-knife';
  elegida: boolean;
  ancha?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: elegida }}
      accessibilityLabel={texto}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: ancha ? 1 : undefined,
        minHeight: SIZE.tapTarget - 4,
        minWidth: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SIZE.rowGap / 2,
        paddingHorizontal: SIZE.space,
        borderRadius: 999,
        borderWidth: elegida ? 2 : 1.5,
        borderColor: elegida ? PALETTE.accion : PALETTE.linea,
        backgroundColor: elegida ? PALETTE.accion : PALETTE.superficie,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icono !== undefined && <MaterialCommunityIcons name={icono} size={18} color={elegida ? PALETTE.superficie : PALETTE.tinta} />}
      <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: elegida ? PALETTE.superficie : PALETTE.tinta, fontVariant: ['tabular-nums'] }}>
        {texto}
      </Text>
    </Pressable>
  );
}

/** Her score's chip — the kitchen's view of her, small and muted. */
function Etiqueta({ texto }: { texto: string }) {
  return (
    <Text
      style={{
        alignSelf: 'flex-start',
        fontSize: SIZE.smallSize,
        fontWeight: '700',
        color: PALETTE.tinta,
        backgroundColor: PALETTE.banda,
        borderRadius: 999,
        paddingHorizontal: SIZE.space - 2,
        paddingVertical: 4,
        overflow: 'hidden',
      }}
    >
      {texto}
    </Text>
  );
}

/** Why it did not go through, in the error's ink, above the button that tries again. */
function Falla({ texto }: { texto: string }) {
  return (
    <Text accessibilityLiveRegion="polite" style={{ fontSize: SIZE.smallSize, lineHeight: 19, fontWeight: '600', color: PALETTE.error }}>
      {texto}
    </Text>
  );
}
