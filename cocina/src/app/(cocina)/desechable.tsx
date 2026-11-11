import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import { desechableDe, desechablePatch, desechableTexto } from '@/api/ajustes';
import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Aclaracion, PantallaDeAjustes, type Ajuste } from '@/ui/PantallaDeAjustes';
import { TecladoListo } from '@/ui/TecladoListo';

// ============================================================================
// *EL DESECHABLE* — plan task `10.5b-iv-c`, `10.5b-ii`'s final design (a row of its own in *Mi
// cocina*) with the family-shell page's words (`srvSheet`, call 28, ruled 2026-11-05): the price
// she charges for the container, added when a neighbour picks *para llevar* and shown before she
// reserves, or none (`container_price`, `0079`). *Guardar* sends the price, *No lo cobro* clears
// it. ⚠️ EACH OFFER KEEPS THE PRICE IT HAD WHEN PUBLISHED (`publish_listing` copies it), so a
// change here reaches her next offer, never one already in Itacate — the line under it says so.
// The price is read as every price here (Wera's `parsePesos`' cleaning, above zero, below 100,000).
// ============================================================================

const PAD = 'desechable-numeros';

export default function Desechable() {
  const [problema, setProblema] = useState<string | null>(null);
  return (
    <PantallaDeAjustes titulo={ES.ajustes.desechable.titulo} problema={problema} setProblema={setProblema}>
      {(ajuste) => <Precio key={ajuste.ajustes.desechableCentavos ?? 'ninguno'} ajuste={ajuste} setProblema={setProblema} />}
    </PantallaDeAjustes>
  );
}

function Precio({ ajuste, setProblema }: { ajuste: Ajuste; setProblema: (problema: string | null) => void }) {
  const d = ES.ajustes.desechable;
  const { ajustes, guardar, busy } = ajuste;
  const [texto, setTexto] = useState(() => desechableTexto(ajustes.desechableCentavos));

  function enviar() {
    Keyboard.dismiss();
    const leido = desechableDe(texto);
    if ('issue' in leido) return setProblema(d.errores[leido.issue]);
    if (leido.centavos === ajustes.desechableCentavos) return setProblema(null);
    guardar(desechablePatch(leido.centavos));
  }

  return (
    <>
      <Aclaracion>{d.intro}</Aclaracion>
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
        {ajustes.desechableCentavos === null ? d.noCobras : d.cobras(formatMXN(ajustes.desechableCentavos))}
      </Text>
      <Campo
        label={d.campo}
        value={texto}
        onChangeText={setTexto}
        placeholder={d.ejemplo}
        keyboardType="decimal-pad"
        inputAccessoryViewID={PAD}
        editable={!busy}
        returnKeyType="done"
        onSubmitEditing={enviar}
      />
      <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
        {ajustes.desechableCentavos !== null && (
          <View style={{ flex: 1 }}>
            <BotonLleno
              variante="discreto"
              label={d.noLoCobro}
              onPress={() => {
                Keyboard.dismiss();
                setTexto('');
                guardar(desechablePatch(null));
              }}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <BotonLleno label={d.guardar} busy={busy} onPress={enviar} />
        </View>
      </View>
      <Aclaracion>{d.nota}</Aclaracion>
      <TecladoListo padId={PAD} label={ES.publicar.listo} />
    </>
  );
}
