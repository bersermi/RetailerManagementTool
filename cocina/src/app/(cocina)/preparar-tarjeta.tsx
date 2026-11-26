import MaterialCommunityIcons from '@/marca/Icono';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esDuena } from '@/api/equipo';
import { useGuardarTerminos, useKitchen, usePage, usePlace, useSuRol, useTarjeta } from '@/api/hooks';
import { colorOf } from '@/api/pagina';
import { DIAS_SIN_VENIR, PREMIO_MAX } from '@/api/tarjeta';
import { useNota } from '@/lib/NotaProvider';
import {
  SELLOS,
  SELLOS_SUGERIDOS,
  borradorDe,
  condicionesDe,
  direccionCorta,
  enVivoDe,
  esOtro,
  fichaDeDias,
  previaDe,
  revisarBorrador,
  textoDeDias,
  type Borrador,
} from '@/lib/tarjeta';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Fichas } from '@/ui/Fichas';
import { Formulario } from '@/ui/Formulario';
import { HojaDias } from '@/ui/HojaDias';
import { Llega } from '@/ui/Llega';
import { Mosaicos } from '@/ui/Mosaicos';
import { TarjetaDeLealtad } from '@/ui/TarjetaDeLealtad';

// ============================================================================
// THE CARD'S SETUP — ON ONE SCREEN, NOTHING PRE-CHOSEN, WITH ITS PREVIEW (G7, G8, G15, G34; the
// family-shell page's `cSetup`). Plan task `10.9e-ii`. Opened by *Activar* (`PREPARAR`), by her dashed
// tile on *Hoy* through the card's screen, by *Cambiar el premio, los sellos o cuándo se borran*, and
// by *Abrirla otra vez* once closed.
//   - *¿Qué les das al completarla?* (up to 60 characters, a hint in the box), *¿Cuántos sellos?* (4 to
//     12, the 8 dashed as a hint), *¿Cuándo se borran sus sellos si no vuelve?* — since `10.9k` (the owner's
//     rulings of 2026-11-19) *Nunca · 2 semanas · 1 mes · 2 meses · 3 meses · Otro…*, *Otro…* opening a box
//     she types her days in, 14 to 365 (`@/ui/HojaDias`), then reading *21 días*, chosen;
//   - *Así la verán tus vecinos*: the card in her kitchen's colour and logo, and its conditions naming her
//     kitchen and its address (G12, G41) — what Itacate shows before her first stamp (`10.9e-iii`);
//   - *Activar* the first time — then *Listo, ya está en tu Hoy* with her tile and *Ver mi Hoy*;
//     *Guardar* after, for new cards only (G12); *Abrirla otra vez* once closed (a new version opens it).
// ⚠️ `set_card_terms` IS AWAITED: what her neighbours start on is the database's answer, never a guess.
// ⚠️ THE OWNER'S (G18): a helper never reaches it — no door to it is drawn for her — and if she did, the
// screen says whose it is. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function PrepararTarjeta() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const kitchenId = kitchen?.id ?? null;
  const page = usePage(kitchenId);
  const place = usePlace(kitchenId);
  const tarjeta = useTarjeta(kitchenId);
  const rol = useSuRol(kitchenId).data;
  const { guardar, busy } = useGuardarTerminos(kitchenId);
  const { avisar } = useNota();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [otroAbierto, setOtroAbierto] = useState(false);
  const cerrarOtro = useCallback(() => setOtroAbierto(false), []);
  const enviando = useRef(false);

  // Filled once, from the card as it is read: empty the first time, her terms after (`borradorDe`).
  useEffect(() => {
    if (borrador === null && tarjeta.data !== undefined) setBorrador(borradorDe(tarjeta.data.terms));
  }, [borrador, tarjeta.data]);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const banda = <Banda titulo={ES.prepararTarjeta.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.prepararTarjeta.volver, onPress: volver }} />;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  if (listo && tarjeta.data !== undefined) {
    const vivo = enVivoDe(tarjeta.data, new Date());
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top, paddingBottom: insets.bottom + SIZE.space * 2 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: SIZE.space * 2, gap: SIZE.space * 1.5 }}>
          <Llega i={0} style={{ alignItems: 'center', gap: SIZE.rowGap }}>
            <MaterialCommunityIcons name="check-circle" size={SIZE.iconSize * 3} color={PALETTE.accion} />
            <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize + 2, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>
              {ES.loQueUsas.listo}
            </Text>
            <Text style={{ ...quiet, textAlign: 'center' }}>{ES.loQueUsas.nombre.tarjeta}</Text>
          </Llega>
          {vivo !== null && (
            <Llega i={1}>
              <Mosaicos mosaicos={[{ servicio: 'tarjeta', abre: '/tarjeta', vivo: { ...vivo, accion: { etiqueta: ES.tarjeta.sellar, abre: '/sellar' } } }]} />
            </Llega>
          )}
        </View>
        <Llega i={2} style={{ paddingHorizontal: SIZE.space * 2 }}>
          <BotonLleno variante="principal" label={ES.loQueUsas.verMiHoy} onPress={() => router.dismissTo('/')} />
        </Llega>
      </View>
    );
  }

  // ⚠️ Nothing of the owner's is drawn until her role is read (the review of `10.9e-ii`).
  if (kitchen === null || borrador === null || page.data === undefined || rol === undefined) {
    const fallo = tarjeta.isError || page.isError;
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {fallo ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.tarjeta.sinLeer}</Text>
              <BotonLleno
                label={ES.tarjeta.otraVez}
                busy={tarjeta.isFetching || page.isFetching}
                onPress={() => {
                  void tarjeta.refetch();
                  void page.refetch();
                }}
              />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={quiet}>{ES.tarjeta.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (!esDuena(rol)) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <Text style={{ margin: SIZE.space * 2, fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.tarjetaErrores.soloLaDuena}</Text>
      </View>
    );
  }

  const terms = tarjeta.data?.terms ?? null;
  const cerrada = terms !== null && tarjeta.data?.open === false;
  const primera = terms === null;
  const previa = previaDe(borrador);
  const direccion = direccionCorta(place.data?.address ?? null);
  const etiqueta = busy
    ? primera
      ? ES.prepararTarjeta.activando
      : ES.prepararTarjeta.guardando
    : primera
      ? ES.prepararTarjeta.activar
      : cerrada
        ? ES.tarjeta.abrirOtraVez
        : ES.prepararTarjeta.guardar;
  const cambiar = (parte: Partial<Borrador>) => {
    setProblema(null);
    setBorrador({ ...borrador, ...parte });
  };

  async function enviar() {
    if (borrador === null || enviando.current) return;
    const falta = revisarBorrador(borrador);
    if (falta !== null) return setProblema(falta);
    enviando.current = true;
    const fallo = await guardar({ premio: borrador.premio, sellos: borrador.sellos as number, dias: borrador.dias as number });
    enviando.current = false;
    if (fallo !== null) return setProblema(fallo);
    if (primera) return setListo(true);
    avisar(cerrada ? ES.prepararTarjeta.abierta : ES.prepararTarjeta.guardado);
    volver();
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <Formulario
        contentContainerStyle={{ paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space * 1.5, paddingBottom: SIZE.space * 2, gap: SIZE.space * 1.5 }}
      >
        {!primera && <Text style={{ ...quiet, fontSize: SIZE.smallSize + 1 }}>{ES.prepararTarjeta.editar}</Text>}
        <View style={{ gap: 4 }}>
          <Campo
            label={ES.prepararTarjeta.premio}
            placeholder={ES.prepararTarjeta.premioEjemplo}
            value={borrador.premio}
            maxLength={PREMIO_MAX}
            autoCapitalize="sentences"
            autoComplete="off"
            onChangeText={(premio) => cambiar({ premio })}
          />
          <Text style={{ alignSelf: 'flex-end', fontSize: SIZE.smallSize - 1, color: PALETTE.tintaApagada }}>
            {ES.prepararTarjeta.cuenta(borrador.premio.length, PREMIO_MAX)}
          </Text>
        </View>
        <Fichas
          titulo={ES.prepararTarjeta.sellos}
          opciones={SELLOS.map((n) => ({ valor: n, texto: String(n) }))}
          elegida={borrador.sellos}
          sugerida={SELLOS_SUGERIDOS}
          onElegir={(sellos) => cambiar({ sellos })}
        />
        <Fichas
          titulo={ES.prepararTarjeta.dias}
          opciones={DIAS_SIN_VENIR.map((d) => ({ valor: d as number, texto: textoDeDias(d) }))}
          elegida={fichaDeDias(borrador.dias)}
          onElegir={(dias) => cambiar({ dias })}
          otro={{
            texto: esOtro(borrador.dias) ? textoDeDias(borrador.dias as number) : ES.prepararTarjeta.otro,
            elegido: esOtro(borrador.dias),
            onAbrir: () => setOtroAbierto(true),
          }}
        />
        <View style={{ gap: SIZE.rowGap, padding: SIZE.space, borderRadius: 16, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.tintaApagada }}>
            {ES.prepararTarjeta.asiLaVeran}
          </Text>
          <TarjetaDeLealtad
            cocinaId={kitchen.id}
            nombre={kitchen.displayName}
            color={colorOf(page.data, kitchen.giroPrincipal)}
            logo={page.data.logo}
            sellos={0}
            de={previa.sellos}
            premio={previa.premio}
            dias={previa.dias}
          />
          <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>
            {condicionesDe(kitchen.displayName, direccion, previa.sellos, previa.premio, previa.dias)}
          </Text>
        </View>
        {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
      </Formulario>
      <View style={{ paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space, paddingBottom: insets.bottom + SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea }}>
        <BotonLleno variante="principal" label={etiqueta} busy={busy} onPress={() => void enviar()} />
      </View>
      <HojaDias
        visible={otroAbierto}
        inicial={esOtro(borrador.dias) ? borrador.dias : null}
        onCerrar={cerrarOtro}
        onListo={(dias) => {
          setOtroAbierto(false);
          cambiar({ dias });
        }}
      />
    </View>
  );
}
