// ============================================================================
// HER KITCHEN'S ADDRESS, AS FIVE BOXES — street, number, colonia, city, código
// postal. Plan task `10.4b-iii-b`; the search above them, `10.4g-i`; her pick's
// place handed up beside the boxes, for the small map, `10.4h`.
//
// ⚠️ WERA'S `Direccion`, COPIED (`app/src/ui/Direccion.tsx`, plan `8k`, the
// owner's ruling of 2026-10-16: *"at least Street, number, ciudad and Código
// Postal"*; the colonia is offered and may stay empty), at Wera's normal size and
// in `Campo`'s boxes. It decides nothing: `checkAddress` (`@/api/place`) says
// what is missing, and the screen says it. Drawn by *¿Dónde está tu cocina?*
// (`@/ui/PantallaDireccion`), in the sign-up and behind *Cambiar dirección*.
//
// ⚠️ THE CÓDIGO POSTAL TAKES DIGITS AND STOPS AT FIVE — the number pad and
// `maxLength`; a leading zero is part of it (CDMX's start with 0). Each box's key
// moves to the next, the last one's is ✓, and on an iPhone the pad carries
// *Listo* (`TecladoListo`) — Wera's `8g`, at the owner's ask.
//
// ⚠️⚠️ ONE DIFFERENCE FROM WERA'S: *BUSCA TU DIRECCIÓN* ABOVE THE FIVE BOXES
// (`10.4g-i`, the owner's answer of 2026-11-03, as Uber and Rappi do it). She types
// her street, number and colonia as she would say them; Google suggests as she
// types (`useSugerencias`, what she typed alone — the aviso's *mientras escribes tu
// dirección*); a pick's details (`detallar`, which end the search's session) fill
// the five boxes, and *revisa* asks her to check them; if hers never shows, she
// fills them as before. The boxes, their order and what is saved are unchanged.
// ⚠️ THE PICK ITSELF GOES UP WITH THE BOXES (`onChange`'s second argument, `10.4h`):
// the small map draws Google's point for it while the boxes still read as it
// filled them — shown, never kept — and asks Google nothing more.
// Why above and not under the street box: the street is the first box, so Google
// would not know her colonia yet — measured, hers was among the five suggestions
// for 3 to 5 of twenty addresses without it, 11 to 14 with it. What Google answers
// is never kept but through her boxes, which stay hers to change; a part Google
// does not name keeps what she typed, unless Google's street is another
// (`@/lib/google`'s `cajasDe`). A build with no key for its phone draws no box.
// ============================================================================

import { useRef, useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';

import type { AddressForm } from '@/api/place';
import type { Lugar, Sugerencia, Sugerencias } from '@/lib/google';
import { CLAVE, detallar, useSesion, useSugerencias } from '@/lib/useGoogle';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { CajaDeBusqueda, SugerenciasEnElFormulario } from '@/ui/Buscador';
import { Campo } from '@/ui/Campo';
import { useArriba } from '@/ui/Formulario';
import { TecladoListo } from '@/ui/TecladoListo';

/** The postal code's pad and its *Listo* bar meet by this string (`InputAccessoryView`). */
const PAD_ID = 'cocina.address.pad';

const ORDER: readonly (keyof AddressForm)[] = ['street', 'number', 'colonia', 'city', 'postalCode'];

export function Direccion({
  value,
  onChange,
  editable = true,
}: {
  value: AddressForm;
  /** Every change of a box; after a pick, the pick too — its place is the small map's, never saved. */
  onChange: (next: AddressForm, elegido?: Lugar) => void;
  editable?: boolean;
}) {
  const boxes = useRef<Partial<Record<keyof AddressForm, TextInput | null>>>({});
  /** The search's list is open: from her first touch of its box until a pick, or until she types in a box below. */
  const [abierta, setAbierta] = useState(false);
  const field = (
    key: keyof AddressForm,
    label: string,
    extra: { keyboardType?: 'default' | 'number-pad'; maxLength?: number; autoCapitalize?: 'words' | 'none' } = {},
  ) => {
    const next = ORDER[ORDER.indexOf(key) + 1];
    return (
      <Campo
        key={key}
        ref={(box) => {
          boxes.current[key] = box;
        }}
        label={label}
        value={value[key]}
        onChangeText={(text) => onChange({ ...value, [key]: text })}
        onFocus={() => setAbierta(false)}
        editable={editable}
        autoCorrect={false}
        autoCapitalize={extra.autoCapitalize ?? 'words'}
        keyboardType={extra.keyboardType ?? 'default'}
        maxLength={extra.maxLength}
        returnKeyType={next === undefined ? 'done' : 'next'}
        submitBehavior={next === undefined ? 'blurAndSubmit' : 'submit'}
        onSubmitEditing={() => (next === undefined ? undefined : boxes.current[next]?.focus())}
        inputAccessoryViewID={extra.keyboardType === 'number-pad' ? PAD_ID : undefined}
      />
    );
  };

  return (
    <View style={{ gap: SIZE.space }}>
      {CLAVE !== null && (
        <BuscaTuDireccion value={value} onChange={onChange} editable={editable} abierta={abierta} onAbierta={setAbierta} />
      )}
      {field('street', ES.address.street)}
      {field('number', ES.address.number, { autoCapitalize: 'none' })}
      {field('colonia', ES.address.colonia)}
      {field('city', ES.address.city)}
      {field('postalCode', ES.address.postalCode, { keyboardType: 'number-pad', maxLength: 5 })}
      <TecladoListo padId={PAD_ID} label={ES.address.done} />
    </View>
  );
}

/**
 * The search above her five boxes: its box, Google's list under it while it is
 * open, and — once a pick has filled the boxes — *revisa*, until she searches
 * again. ⚠️ THE FORM BRINGS THE BOX TO ITS TOP when she touches it (`useArriba`),
 * so the rows open in the room above the keyboard. ⚠️ THE KEYBOARD'S KEY ONLY
 * CLOSES THE KEYBOARD: the list stays, with more of it in view.
 */
function BuscaTuDireccion({
  value,
  onChange,
  editable,
  abierta,
  onAbierta,
}: {
  value: AddressForm;
  onChange: (next: AddressForm, elegido?: Lugar) => void;
  editable: boolean;
  abierta: boolean;
  onAbierta: (abierta: boolean) => void;
}) {
  const caja = useRef<TextInput>(null);
  useArriba(caja);
  const [texto, setTexto] = useState('');
  /** Her pick's details on their way, or why they never came — shown in the list; `null` otherwise. */
  const [eligiendo, setEligiendo] = useState<Sugerencias | null>(null);
  /** A pick filled her boxes: she is asked to check them. */
  const [elegida, setElegida] = useState(false);
  const sesion = useSesion();
  const sugerencias = useSugerencias(abierta && editable ? texto : '', null, sesion);

  /**
   * Her pick: its details, in the same session — which they end — fill her five
   * boxes from Google's parts. The list says *Buscando…* meanwhile, and why if they
   * never come; she may pick another or type on.
   */
  async function elegir(sugerencia: Sugerencia) {
    Keyboard.dismiss();
    setEligiendo({ kind: 'buscando' });
    const lugar = await detallar(sugerencia, sesion.token(), value);
    sesion.cerrar();
    if (lugar === null || lugar === 'sin-senal') {
      setEligiendo({ kind: lugar === null ? 'falla' : 'sin-senal' });
      return;
    }
    setEligiendo(null);
    onAbierta(false);
    setTexto('');
    setElegida(true);
    onChange(lugar.direccion, lugar);
  }

  return (
    <View style={{ gap: SIZE.rowGap }}>
      <CajaDeBusqueda
        caja={caja}
        texto={texto}
        hint={ES.buscaDireccion.hint}
        etiqueta={ES.buscaDireccion.etiqueta}
        editable={editable}
        onTexto={(next) => {
          setTexto(next);
          setEligiendo(null);
          setElegida(false);
          onAbierta(true);
        }}
        onFoco={() => onAbierta(true)}
        onBorrar={() => {
          setTexto('');
          setEligiendo(null);
        }}
        onBuscar={() => undefined}
      />
      {abierta && editable && (
        <SugerenciasEnElFormulario sugerencias={eligiendo ?? sugerencias} onElegir={(sugerencia) => void elegir(sugerencia)} />
      )}
      {elegida && !abierta && (
        <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.buscaDireccion.revisa}</Text>
      )}
    </View>
  );
}
