import { Icono } from '@/ui/Icono';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEscaneo, useKitchen, type Respuesta } from '@/api/hooks';
import type { CardRow } from '@/api/tarjeta';
import { digitosDe } from '@/lib/codigo';
import { conTarjeta, escaneoDe, premiosDe, resultadoDe, resumenDe, selloDado, tecleadoDe, type Escaneo, type Tono } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { useAsiFunciona } from '@/ui/AsiFunciona';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Escaner } from '@/ui/Escaner';
import { Formulario } from '@/ui/Formulario';
import { SelloVaca } from '@/ui/Mostrador';
import { Cae } from '@/ui/Movimientos';

// ============================================================================
// *ESCANEAR A TU CLIENTE* — HER CODE, AND WHAT IT GIVES (G5, G6, G10, G11, G16; the family-shell page's
// `cFscan` and `cFres`). Plan task `10.9e-ii`, from *Sellar*.
//   - THE CAMERA (`@/ui/Escaner`, `10.9c`'s) reads her *Mi código* (`WERA1:v:…`); a kitchen's code or
//     anything else reads *Ese no es…* and the camera stays open. Or SIX DIGITS TYPED, when the camera
//     fails — no phone named, so the database tries every neighbour's phone (`0085`).
//   - WITH SIGNAL, whose code it is (`card_of_code`): *Ana R. · 5 de 8 · 2 premios*, *Dar sello* — or
//     *Ya tiene su sello de hoy* — and *Entregar premio* → *¿Cuál le das?* (she chose; the kitchen gives
//     the one she says). ⚠️ HER *COBRAS: …* CODE NAMES ITS REWARD, so it is given at once, with no
//     choosing (`give_reward`, its `p_reward_id`).
//   - ⚠️ EVERY CALL CHECKED AT THE SCAN'S MOMENT (`@/api/hooks`' `momentoDeLaLlamada`): a stamp given a minute
//     after the camera read her code still fits it. ⚠️ ONE REWARD A SCAN (`0085`): once this scan gave one,
//     *Entregar premio* goes and the screen says to scan her next minute's code.
//   - ⚠️ ONE NEIGHBOUR AT A TIME (the review of `10.9e-ii`): an answer that comes back after *Escanear a otro
//     cliente* belongs to the one before, and is dropped (`turno`).
//   - ⚠️ WITH NO SIGNAL nothing about her can be read: *Dar sello sin señal* keeps it on this phone and it
//     is sent with its moment when the signal returns (`@/api/cola`) — and a *Cobras: …* code keeps its
//     reward the same way. *Sellar* lists what waits, and later what went and gave nothing.
// What the camera sees is never kept or sent — only the text of the code it read.
// ⚠️ `11.8-ii`: THE STAMP SHE GAVE LANDS (*El sello cae*): the Wera cow in her green beside *Sello para Ana · 6 de 8*,
// turned as that place is on Ana's card (`selloDado`), when the database's answer says it was given — with signal
// this screen waits for that answer (above), so the stamp lands with it and never before: a stamp landed and then
// refused (*Ya tiene su sello de hoy*) would be a stamp she did not give. A scan kept with no signal lands nothing:
// it is *Guardado*, not given. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

type Paso =
  | { readonly tipo: 'leyendo' }
  | { readonly tipo: 'buscando'; readonly escaneo: Escaneo }
  | {
      readonly tipo: 'suya';
      readonly escaneo: Escaneo;
      readonly card: CardRow;
      readonly eligiendo: boolean;
      readonly dijo: { texto: string; tono: Tono } | null;
      /** This scan gave a reward already, or was told it could not: another needs her next code. */
      readonly premioDado: boolean;
    }
  | { readonly tipo: 'sinSenal'; readonly escaneo: Escaneo }
  | { readonly tipo: 'guardado'; readonly texto: string }
  | { readonly tipo: 'dijo'; readonly texto: string; readonly tono: Tono };

const COLOR_DE: Readonly<Record<Tono, string>> = { bien: PALETTE.accion, nada: PALETTE.tinta, mal: PALETTE.error };

export default function Escanear() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const kitchenId = kitchen?.id ?? null;
  const { buscar, darSello, darPremio, busy } = useEscaneo(kitchenId);
  const asi = useAsiFunciona(kitchenId ?? '', 'tarjeta');
  const [paso, setPaso] = useState<Paso>({ tipo: 'leyendo' });
  const [escrito, setEscrito] = useState('');
  const turno = useRef(0);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/sellar'));
  const otraVez = () => {
    turno.current += 1;
    setEscrito('');
    setPaso({ tipo: 'leyendo' });
  };

  /** What an answer draws: her card with what it said, or the sentence alone — only if still this neighbour's turn. */
  function despues(t: number, escaneo: Escaneo, r: Respuesta, guardado: string, yaGuardado: string, premioDado = false) {
    if (t !== turno.current || r.tipo === 'ocupado') return;
    if (r.tipo === 'enCola') return setPaso({ tipo: 'guardado', texto: guardado });
    if (r.tipo === 'yaEnCola') return setPaso({ tipo: 'guardado', texto: yaGuardado });
    if (r.tipo === 'sinSenal') return setPaso({ tipo: 'sinSenal', escaneo });
    if (r.tipo === 'problema') return setPaso({ tipo: 'dijo', texto: r.problema, tono: 'mal' });
    const card = r.card;
    const dijo = card.result === 'suya' && card.of === null ? { texto: ES.escanearCliente.resultado.cerrada, tono: 'mal' as const } : resultadoDe(card);
    if (dijo !== null && (dijo.tono === 'bien' || card.result === 'ya_hoy' || card.result === 'ya_cobrado')) asi.usado();
    const dado = premioDado || card.result === 'cobrado' || card.result === 'ya_cobrado' || card.result === 'ya_usado';
    if (conTarjeta(card)) return setPaso({ tipo: 'suya', escaneo, card, eligiendo: false, dijo, premioDado: dado });
    return setPaso({ tipo: 'dijo', texto: dijo?.texto ?? '', tono: dijo?.tono ?? 'nada' });
  }

  const S = ES.escanearCliente.sinSenal;

  async function leido(escaneo: Escaneo) {
    const t = ++turno.current;
    setPaso({ tipo: 'buscando', escaneo });
    // Her *Cobras: …* code: that reward, at once.
    if (escaneo.premio !== null) return despues(t, escaneo, await darPremio(escaneo, escaneo.premio), S.premioGuardado, S.premioYaGuardado, true);
    despues(t, escaneo, await buscar(escaneo), '', '');
  }

  const banda = <Banda titulo={ES.escanearCliente.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.escanearCliente.volver, onPress: volver }} />;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <Formulario
        contentContainerStyle={{ paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space * 1.5, paddingBottom: SIZE.space * 2 + insets.bottom, gap: SIZE.space }}
      >
        {paso.tipo === 'leyendo' && (
          <>
            <Escaner
              textos={ES.escanearCliente.escaner}
              onLeido={(texto) => {
                const escaneo = escaneoDe(texto, new Date());
                if (escaneo === null) return false;
                void leido(escaneo);
                return true;
              }}
            />
            <Campo
              label={ES.escanearCliente.escribir}
              placeholder={ES.escanearCliente.numeroEjemplo}
              value={escrito}
              onChangeText={setEscrito}
              keyboardType="number-pad"
              maxLength={7}
              autoComplete="off"
            />
            {digitosDe(escrito) !== null && (
              <BotonLleno
                variante="principal"
                label={ES.escanearCliente.buscar}
                onPress={() => {
                  const escaneo = tecleadoDe(escrito, new Date());
                  if (escaneo !== null) void leido(escaneo);
                }}
              />
            )}
          </>
        )}

        {paso.tipo === 'buscando' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, minHeight: SIZE.tapTarget * 2 }}>
            <ActivityIndicator color={PALETTE.accion} />
            <Text style={quiet}>{ES.escanearCliente.buscando}</Text>
          </View>
        )}

        {paso.tipo === 'suya' && (
          <SuTarjeta
            paso={paso}
            busy={busy}
            onSello={async () => despues(turno.current, paso.escaneo, await darSello(paso.escaneo), S.guardado, S.yaGuardado, paso.premioDado)}
            onPremios={() => setPaso({ ...paso, eligiendo: true, dijo: null })}
            onCancelar={() => setPaso({ ...paso, eligiendo: false })}
            onPremio={async (id) => despues(turno.current, paso.escaneo, await darPremio(paso.escaneo, id), S.premioGuardado, S.premioYaGuardado, true)}
          />
        )}

        {paso.tipo === 'sinSenal' && (
          <View style={{ gap: SIZE.space }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <Icono name="wifi-off" size={22} color={PALETTE.tinta} />
              <Text style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta }}>{ES.escanearCliente.sinSenal.titulo}</Text>
            </View>
            <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{ES.escanearCliente.sinSenal.texto}</Text>
            <BotonLleno
              variante="principal"
              icon="stamper"
              label={ES.escanearCliente.sinSenal.darSello}
              busy={busy}
              onPress={async () => despues(turno.current, paso.escaneo, await darSello(paso.escaneo), S.guardado, S.yaGuardado)}
            />
          </View>
        )}

        {(paso.tipo === 'guardado' || paso.tipo === 'dijo') && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.rowGap }}>
            <Icono
              name={paso.tipo === 'guardado' ? 'cloud-upload-outline' : paso.tono === 'bien' ? 'check-circle' : paso.tono === 'mal' ? 'alert-circle-outline' : 'information-outline'}
              size={22}
              color={paso.tipo === 'guardado' ? PALETTE.tinta : COLOR_DE[paso.tono]}
            />
            <Text style={{ flex: 1, fontSize: SIZE.bodySize, lineHeight: 22, fontWeight: '600', color: paso.tipo === 'guardado' ? PALETTE.tinta : COLOR_DE[paso.tono] }}>
              {paso.texto}
            </Text>
          </View>
        )}

        {paso.tipo !== 'leyendo' && paso.tipo !== 'buscando' && (
          <View style={{ gap: SIZE.rowGap, marginTop: SIZE.space }}>
            <BotonLleno icon="camera-outline" label={ES.escanearCliente.otroCliente} busy={busy} onPress={otraVez} />
            <BotonLleno variante="discreto" label={ES.escanearCliente.listo} onPress={volver} />
          </View>
        )}
      </Formulario>
    </View>
  );
}

function SuTarjeta({
  paso,
  busy,
  onSello,
  onPremios,
  onCancelar,
  onPremio,
}: {
  paso: Extract<Paso, { tipo: 'suya' }>;
  busy: boolean;
  onSello: () => void;
  onPremios: () => void;
  onCancelar: () => void;
  onPremio: (id: string) => void;
}) {
  const { card } = paso;
  const nombre = card.name ?? ES.sellar.alguien;
  const resumen = resumenDe(card);
  const premios = premiosDe(card);
  const dado = selloDado(card);
  const nueva = card.stamps === 0 && premios.length === 0 && card.result === 'suya' && card.open !== false && card.stamped_today !== true;
  return (
    <View style={{ gap: SIZE.space, padding: SIZE.space * 1.25, borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.superficie }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.accionSuave }}>
          <Text style={{ fontSize: SIZE.titleSize - 2, fontWeight: '800', color: PALETTE.accion }}>{nombre.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta }}>{nombre}</Text>
          {resumen !== null && <Text style={{ fontSize: SIZE.bodySize - 1, color: PALETTE.tintaApagada }}>{resumen}</Text>}
          {/* `10.9m`: HER card's condition — what it started on — so a helper checks it before *Dar sello*; none, nothing. */}
          {card.conditions != null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{card.conditions}</Text>}
        </View>
      </View>
      {paso.dijo !== null &&
        (dado !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
            <Cae cae>
              <SelloVaca i={dado} tinta={PALETTE.accion} />
            </Cae>
            <Text style={{ flex: 1, fontSize: SIZE.bodySize, lineHeight: 22, fontWeight: '700', color: COLOR_DE[paso.dijo.tono] }}>{paso.dijo.texto}</Text>
          </View>
        ) : (
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, fontWeight: '700', color: COLOR_DE[paso.dijo.tono] }}>{paso.dijo.texto}</Text>
        ))}
      {nueva && paso.dijo === null && <Text style={{ fontSize: SIZE.smallSize + 1, color: PALETTE.tintaApagada }}>{ES.escanearCliente.sinTarjeta}</Text>}
      {paso.eligiendo ? (
        <View style={{ gap: SIZE.rowGap }}>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.escanearCliente.cualLeDas}</Text>
          {premios.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.que}. ${p.cuando}`}
              disabled={busy}
              onPress={() => onPremio(p.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: SIZE.space,
                padding: SIZE.space,
                borderRadius: ESQUINA.hoja,
                backgroundColor: pressed ? PALETTE.accionSuave : PALETTE.superficie,
                opacity: busy ? 0.6 : 1,
              })}
            >
              <Icono name="gift-outline" size={22} color={PALETTE.marca} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{p.que}</Text>
                <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{p.cuando}</Text>
              </View>
            </Pressable>
          ))}
          <BotonLleno variante="discreto" label={ES.escanearCliente.volver} onPress={onCancelar} />
        </View>
      ) : (
        <View style={{ gap: SIZE.rowGap }}>
          {card.stamped_today === true ? (
            <View style={{ minHeight: SIZE.tapTarget, alignItems: 'center', justifyContent: 'center', borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.accionSuave }}>
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.accion }}>{ES.escanearCliente.yaTiene}</Text>
            </View>
          ) : (
            card.of !== null && <BotonLleno variante="principal" icon="stamper" label={ES.escanearCliente.darSello} busy={busy} onPress={onSello} />
          )}
          {premios.length > 0 && !paso.premioDado && (
            <BotonLleno icon="gift-outline" label={ES.escanearCliente.entregarPremio} busy={busy} onPress={onPremios} />
          )}
          {premios.length > 0 && paso.premioDado && <Text style={{ fontSize: SIZE.smallSize + 1, color: PALETTE.tintaApagada }}>{ES.escanearCliente.otroPremio}</Text>}
        </View>
      )}
    </View>
  );
}
