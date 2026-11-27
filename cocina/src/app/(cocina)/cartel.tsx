import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esDuena } from '@/api/equipo';
import { useKitchen, useLogoDelCartel, usePage, usePlace, useSuRol, useTarjeta } from '@/api/hooks';
import { colorOf, kitchenInitials } from '@/api/pagina';
import { cartelHtml, direccionDeCocina, type DatosDelCartel } from '@/lib/cartel';
import { deviceStore } from '@/lib/store';
import { cartelVisto, direccionCorta, enFrase } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { CodigoQR } from '@/ui/CodigoQR';
import { Iniciales } from '@/ui/Iniciales';
import { Foto } from '@/vecinos/ui/Foto';

// ============================================================================
// *TU CARTEL* — THE COUNTER POSTER, IN HER KITCHEN'S OWN IDENTITY (G35; the family-shell page's `cCartel`).
// Plan task `10.9e-ii`, from the card's screen — the owner's (G18: a helper has no door to it).
//   - ON THE SCREEN: the poster as it prints — her colour and circle, her name, *Junta 8 sellos y llévate …*,
//     the QR of her kitchen's address on tu-wera.com (`@/lib/cartel`), *Escanéalo con tu cámara*, her
//     address, *en Itacate* small. Wera all but absent: nowhere.
//   - *IMPRIMIR* opens the phone's own print window (`expo-print`'s `printAsync`); *MANDARLO COMO PDF* makes
//     the file (`printToFileAsync`, A4) and opens the phone's share sheet (`expo-sharing`) — WhatsApp to her
//     papelería, or saved. Both from the same HTML (`cartelHtml`).
// ⚠️ THE QR IS HER KITCHEN'S ADDRESS, NEVER *SELLAR*'S CODE, which changes every minute. Her logo is fetched
// with her token and written into the page (`useLogoDelCartel`); with none, her initials.
// NO CHECK CAN SEE THIS SCREEN OR THE PAPER (ADR-035 §2.11): the phone and a printer are its instruments.
// ============================================================================

/** A4 in points — `expo-print`'s page, in the units it takes. */
const A4 = { width: 595, height: 842 } as const;

export default function Cartel() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const kitchenId = kitchen?.id ?? null;
  const page = usePage(kitchenId);
  const place = usePlace(kitchenId);
  const tarjeta = useTarjeta(kitchenId);
  const logo = useLogoDelCartel(kitchenId, page.data?.logo ?? null);
  const rol = useSuRol(kitchenId).data;
  const [haciendo, setHaciendo] = useState<'imprimir' | 'compartir' | null>(null);
  const [problema, setProblema] = useState<string | null>(null);

  // `10.9m`: she opened her poster — the card screen's *Cambiaste tu tarjeta: imprímelo otra vez* has said what it had to.
  useEffect(() => {
    if (kitchenId !== null) cartelVisto(deviceStore(), kitchenId);
  }, [kitchenId]);
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/tarjeta'));
  const banda = <Banda titulo={ES.cartel.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.cartel.volver, onPress: volver }} />;

  // ⚠️ Nothing of the owner's is drawn until her role is read (the review of `10.9e-ii`).
  if (kitchen === null || page.data === undefined || rol === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, padding: SIZE.space * 2 }}>
          <ActivityIndicator color={PALETTE.accion} />
          <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.tarjeta.leyendo}</Text>
        </View>
      </View>
    );
  }

  // The owner's (G18): a helper has no door here, and is told whose it is if she arrives.
  if (!esDuena(rol)) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <Text style={{ margin: SIZE.space * 2, fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.tarjetaErrores.soloLaDuena}</Text>
      </View>
    );
  }

  const color = colorOf(page.data, kitchen.giroPrincipal);
  const terms = tarjeta.data?.open === true ? tarjeta.data.terms : null;
  const direccion = direccionCorta(place.data?.address ?? null);
  const titulo = terms === null ? ES.cartel.miraHoy : ES.cartel.junta(terms.stamps, enFrase(terms.reward));
  const datos: DatosDelCartel = {
    id: kitchen.id,
    nombre: kitchen.displayName,
    iniciales: kitchenInitials(kitchen.displayName),
    color: HUES[color],
    logo: logo.data ?? null,
    direccion,
    tarjeta: terms === null ? null : { sellos: terms.stamps, premio: terms.reward, condicion: terms.conditions },
  };
  const listo = logo.data !== undefined || page.data.logo === null || logo.isError;

  async function hacer(que: 'imprimir' | 'compartir') {
    if (haciendo !== null) return;
    setProblema(null);
    setHaciendo(que);
    try {
      const html = cartelHtml(datos);
      if (que === 'imprimir') {
        await Print.printAsync({ html, ...A4 });
      } else {
        const { uri } = await Print.printToFileAsync({ html, ...A4 });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: ES.cartel.titulo });
      }
    } catch (thrown) {
      // Closing the iPhone's print window without printing rejects (`printAsync`'s note): nothing failed.
      const message = typeof thrown === 'object' && thrown !== null ? String((thrown as { message?: unknown }).message ?? '') : '';
      if (!/did not complete|cancel/i.test(message)) setProblema(ES.cartel.fallo);
    } finally {
      setHaciendo(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, gap: SIZE.space * 1.5 }}>
        <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.cartel.detalle}</Text>
        <View style={{ borderRadius: ESQUINA.hoja, overflow: 'hidden', backgroundColor: PALETTE.superficie }}>
          <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: HUES[color] }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)' }}>
              <Iniciales nombre={kitchen.displayName} color={color} size={84} />
              <Foto path={page.data.logo} cocinaId={kitchen.id} size="grande" />
            </View>
          </View>
          <View style={{ alignItems: 'center', padding: SIZE.space * 1.5, gap: SIZE.rowGap + 2 }}>
            <Text style={{ fontSize: SIZE.titleSize + 4, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>{kitchen.displayName}</Text>
            <Text style={{ fontSize: SIZE.bodySize + 1, fontWeight: '700', color: HUES[color], textAlign: 'center' }}>{titulo}</Text>
            {terms !== null && terms.conditions !== null && (
              <Text style={{ marginTop: -SIZE.rowGap, fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{terms.conditions}</Text>
            )}
            <CodigoQR texto={direccionDeCocina(kitchen.id, kitchen.displayName)} lado={150} etiqueta={ES.cartel.escanea} />
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{ES.cartel.escanea}</Text>
            {direccion !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{direccion}</Text>}
            <Text style={{ marginTop: SIZE.rowGap, fontSize: SIZE.smallSize - 1, color: PALETTE.tintaApagada }}>{ES.cartel.enItacate}</Text>
          </View>
        </View>
        {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
      </ScrollView>
      <View style={{ gap: SIZE.rowGap, paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space, paddingBottom: insets.bottom + SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea }}>
        <BotonLleno
          variante="principal"
          icon="printer-outline"
          label={haciendo === 'imprimir' || !listo ? ES.cartel.preparando : ES.cartel.imprimir}
          busy={haciendo !== null || !listo}
          onPress={() => void hacer('imprimir')}
        />
        <BotonLleno
          icon="share-variant-outline"
          label={haciendo === 'compartir' ? ES.cartel.preparando : ES.cartel.compartir}
          busy={haciendo !== null || !listo}
          onPress={() => void hacer('compartir')}
        />
        <Text style={{ fontSize: SIZE.smallSize - 1, color: PALETTE.tintaApagada, textAlign: 'center' }}>{ES.cartel.compartirDetalle}</Text>
      </View>
    </View>
  );
}
