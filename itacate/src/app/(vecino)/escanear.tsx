import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { Kitchen } from '@/api/cocinas';
import { useCocinas, useEscanearCodigo, useTarjetas } from '@/api/hooks';
import type { RewardRow } from '@/api/tarjeta';
import { parametro } from '@/lib/paginas';
import {
  cardDeEscaneo,
  cocinaDelEscaneo,
  codigoDeCocinaDe,
  condicionesDeSuTarjeta,
  desenlaceDe,
  dio,
  enFrase,
  preguntarCobro,
  tecleadoDe,
  terminaElCobro,
  tituloDe,
  vistaDe,
  type CodigoDeCocina,
  type Desenlace,
} from '@/lib/tarjeta';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Escaner } from '@/ui/Escaner';
import { Formulario } from '@/ui/Formulario';
import { HojaCobrar } from '@/ui/HojaCobrar';
import { Llega } from '@/ui/Llega';
import { TarjetaDeLealtad } from '@/ui/TarjetaDeLealtad';

// ============================================================================
// *ESCANEAR* — THE KITCHEN'S CODE, READ BY HER CAMERA OR TYPED. Plan task `10.9e-iii` (G10, G16; the
// family-shell page's `iEscanear`, `iPrimer`, `cobrarSheet`), from the top of *Mis cocinas* or her card on a
// kitchen's page (`cocina`: six digits typed are tried at that kitchen first — `p_workspace_id`).
//   - ⚠️ THE CAMERA IS ASKED FOR THE FIRST TIME HERE, WHEN SHE TAPS (`@/ui/Escaner`, Wera Cocina's, copied):
//     until then a button; refused, the six digits under the kitchen's code are her way;
//   - WHAT IT GAVE, as the database answered (`stamp_with_code`): *Tu primer sello en …* with its conditions,
//     *Sello en … · 3 de 8*, *Hoy ya tienes tu sello en …*, or why not — and, where she has a reward there,
//     *¿Cobrar tu premio ahora?* (she chooses which), claimed with the same code (`claim_with_code`);
//   - `premio`: from *Cobras: …*'s *O escanea su código* — the scan claims that reward instead.
// ⚠️ HER PHONE NEEDS SIGNAL HERE (the kitchen's does not, G16): the code is checked the moment she sends it.
// ⚠️ THE LAST STAMP'S *¡GANASTE!* IS `@/lib/Festejos`' — her cards are read again after every answer, and it
// celebrates over this screen. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

type Estado =
  | { readonly tipo: 'leyendo' }
  | { readonly tipo: 'enviando' }
  | { readonly tipo: 'resultado'; readonly desenlace: Desenlace }
  | { readonly tipo: 'problema'; readonly problema: string };

export default function Escanear() {
  const params = useLocalSearchParams<{ cocina?: string; premio?: string }>();
  const cocinaId = parametro(params.cocina) || null;
  const [premioId, setPremioId] = useState<string | null>(parametro(params.premio) || null);
  const cocinas = useCocinas();
  const tarjetas = useTarjetas();
  const { sellar, cobrar, busy } = useEscanearCodigo();
  const [estado, setEstado] = useState<Estado>({ tipo: 'leyendo' });
  const [tecleado, setTecleado] = useState('');
  const [hoja, setHoja] = useState<{ readonly cocina: string; readonly premios: readonly RewardRow[]; readonly codigo: CodigoDeCocina } | null>(null);

  const premio = premioId === null ? null : (tarjetas.data ?? []).flatMap((c) => c.rewards).find((r) => r.id === premioId) ?? null;
  const puertaDe = (id: string): Kitchen | null => cocinas.data?.find((k) => k.id === id) ?? null;
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/mis-cocinas'));

  async function enviar(codigo: CodigoDeCocina) {
    setEstado({ tipo: 'enviando' });
    // ⚠️ A QR NAMES ITS PHONE: the page's kitchen narrows six digits typed, never a QR — `kitchen_code_owner` ANDs
    // both, so kitchen B's QR scanned from kitchen A's page was a miss (the review of `10.9e-iii`).
    const r =
      premioId !== null
        ? await cobrar(premioId, codigo.code, codigo.key)
        : await sellar(codigo.code, cocinaDelEscaneo(codigo, cocinaId), codigo.key);
    if (!r.ok) {
      // A reward no longer hers (`TD027`) leaves the claim: the next scan is a stamp again.
      if (r.problema === ES.tarjeta.errores.noEsTuPremio) setPremioId(null);
      setEstado({ tipo: 'problema', problema: r.problema });
      return;
    }
    const d = desenlaceDe(r.scan);
    setEstado({ tipo: 'resultado', desenlace: d });
    // ⚠️ A CLAIM ENDS WITH ANY ANSWER but a code that did not fit (`no_valido`, `repite`): after `cerrada` the reward
    // is gone, and every later scan would have claimed it again (the review of `10.9e-iii`).
    if (premioId !== null && terminaElCobro(r.scan.result)) setPremioId(null);
    const porCobrar = preguntarCobro(d);
    if (porCobrar.length > 0 && d.kind !== 'nada') setHoja({ cocina: d.cocina.name, premios: porCobrar, codigo });
  }

  async function elegir(rewardId: string) {
    if (hoja === null) return;
    const r = await cobrar(rewardId, hoja.codigo.code, hoja.codigo.key);
    setHoja(null);
    if (!r.ok) {
      setEstado({ tipo: 'problema', problema: r.problema });
      return;
    }
    if (r.scan.result === 'no_valido') {
      // Her stamp took a minute or two: the kitchen's code has changed. She scans it again for this reward.
      setPremioId(rewardId);
      setEstado({ tipo: 'problema', problema: ES.escanear.resultado.cambio });
      return;
    }
    setEstado({ tipo: 'resultado', desenlace: desenlaceDe(r.scan) });
  }

  function otraVez() {
    setTecleado('');
    setEstado({ tipo: 'leyendo' });
  }

  const titulo = premio === null ? ES.escanear.titulo : ES.escanear.cobrarTitulo(enFrase(premio.reward));
  const quiet = { fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada } as const;
  const escrito = tecleadoDe(tecleado);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={titulo} volver={{ label: ES.escanear.volver, onPress: volver }} />
      <Formulario contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 6, gap: SIZE.space * 1.5 }}>
        {estado.tipo === 'leyendo' || estado.tipo === 'enviando' ? (
          <>
            <Llega i={0}>
              <Escaner
                textos={{
                  boton: ES.escanear.boton,
                  apunta: ES.escanear.apunta,
                  sinPermiso: ES.escanear.sinPermiso,
                  ajustes: ES.escanear.ajustes,
                  noEs: ES.escanear.noEs,
                  noAbre: ES.escanear.noAbre,
                }}
                activo={estado.tipo === 'leyendo'}
                onLeido={(texto) => {
                  const codigo = codigoDeCocinaDe(texto);
                  if (codigo === null) return false;
                  void enviar(codigo);
                  return true;
                }}
              />
            </Llega>
            {estado.tipo === 'enviando' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZE.rowGap, minHeight: 80 }}>
                <ActivityIndicator color={PALETTE.accion} />
                <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.escanear.revisando}</Text>
              </View>
            ) : (
              <Llega i={1} style={{ gap: SIZE.rowGap }}>
                <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>{ES.escanear.escribir}</Text>
                <Campo
                  label={ES.escanear.numero}
                  value={tecleado}
                  onChangeText={setTecleado}
                  keyboardType="number-pad"
                  maxLength={7}
                  autoCorrect={false}
                  onSubmitEditing={() => (escrito === null ? undefined : void enviar(escrito))}
                />
                {escrito !== null && <BotonLleno variante="principal" label={ES.escanear.revisar} busy={busy} onPress={() => void enviar(escrito)} />}
              </Llega>
            )}
          </>
        ) : estado.tipo === 'problema' ? (
          <Llega i={0} style={{ gap: SIZE.space }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.rowGap }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color={PALETTE.error} />
              <Text style={{ flex: 1, fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{estado.problema}</Text>
            </View>
            <BotonLleno variante="principal" icon="camera-outline" label={ES.escanear.otro} onPress={otraVez} />
            <BotonLleno variante="discreto" label={ES.escanear.volver} onPress={volver} />
          </Llega>
        ) : (
          <Resultado desenlace={estado.desenlace} puertaDe={puertaDe} onOtro={otraVez} onListo={volver} quiet={quiet} />
        )}
      </Formulario>
      <HojaCobrar
        visible={hoja !== null}
        cocina={hoja?.cocina ?? ''}
        premios={hoja?.premios ?? []}
        busy={busy}
        onElegir={(id) => void elegir(id)}
        onCerrar={() => setHoja(null)}
      />
    </View>
  );
}

/** What the scan gave: its line, her card there, and — on her first stamp — the conditions she starts on. */
function Resultado({
  desenlace,
  puertaDe,
  onOtro,
  onListo,
  quiet,
}: {
  desenlace: Desenlace;
  puertaDe: (id: string) => Kitchen | null;
  onOtro: () => void;
  onListo: () => void;
  quiet: { readonly fontSize: number; readonly lineHeight: number; readonly color: string };
}) {
  const bien = dio(desenlace);
  const puerta = desenlace.kind === 'nada' ? null : puertaDe(desenlace.cocina.id);
  const card = desenlace.kind === 'nada' || desenlace.card === null ? null : cardDeEscaneo(desenlace.cocina, desenlace.card);
  const vista = card === null ? null : vistaDe(card, puerta);
  const condiciones = desenlace.kind === 'primer' && card !== null ? condicionesDeSuTarjeta(card, puerta) : null;
  return (
    <>
      <Llega i={0} style={{ alignItems: 'center', gap: SIZE.rowGap, paddingVertical: SIZE.space }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: bien ? PALETTE.accionSuave : PALETTE.superficie,
            borderWidth: 1,
            borderColor: bien ? PALETTE.accion : PALETTE.linea,
          }}
        >
          <MaterialCommunityIcons name={bien ? 'check' : 'information-outline'} size={30} color={bien ? PALETTE.accion : PALETTE.tintaApagada} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize - 4, fontWeight: '800', color: PALETTE.tinta, textAlign: 'center' }}>
          {tituloDe(desenlace)}
        </Text>
      </Llega>
      {vista !== null && (
        <Llega i={1}>
          <TarjetaDeLealtad vista={vista} onPremios={() => router.push({ pathname: '/premios/[cocina]', params: { cocina: vista.cocinaId } })} />
        </Llega>
      )}
      {condiciones !== null && (
        <Llega i={2} style={{ gap: SIZE.rowGap / 2 }}>
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>{ES.tarjeta.condiciones}</Text>
          <Text style={quiet}>{condiciones}</Text>
        </Llega>
      )}
      <Llega i={3} style={{ gap: SIZE.rowGap }}>
        <BotonLleno variante="principal" label={ES.escanear.entendido} onPress={onListo} />
        <BotonLleno variante="discreto" icon="camera-outline" label={ES.escanear.otro} onPress={onOtro} />
      </Llega>
    </>
  );
}
