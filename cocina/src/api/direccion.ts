// ============================================================================
// HER ADDRESS FIRST, AS WHAT IS WRITTEN. Plan task `10.4h`, the owner's ruling of
// 2026-11-03 (*"The address is the most relevant thing … The pin is only
// indicative"*).
//
// ⚠️⚠️ WHAT IS KEPT: HER ADDRESS, HER LINE OF DIRECTIONS, AND HER OWN POINT ONLY
// IF SHE SETS ONE. Every map that draws her kitchen asks Google where her address
// is, live, and keeps nothing (the small map's `useDondeEsta`, outside this layer);
// a point is stored only when her own hand put it on *Ajusta el punto*.
//
// ⚠️ A NEW STREET OR NUMBER CLEARS HER OWN POINT, so the map follows the new
// address (his ruling). Her point carries the street and number it was set at
// (`SuPunto`); while the boxes read another, it no longer applies — the small map
// shows Google's placing of the new address — and *Guardar* clears it
// (`clear_store_pin`, `0075`). A typo fixed back brings it back before she saves.
// The colonia, the city and the postal code never clear it: a fixed colonia is
// the same door.
//
// ⚠️ PURE: the calls are handed in (`@/api/calls` on the phone), so
// `test/direccion.test.ts` can fail each one and watch the rest.
// ============================================================================

import {
  clearStorePinArgs,
  directionsFrom,
  samePin,
  sameAddress,
  setStoreAddressArgs,
  setStoreDirectionsArgs,
  setStorePinArgs,
  type AddressForm,
  type ClearStorePinArgs,
  type Pin,
  type Place,
  type SetStoreAddressArgs,
  type SetStoreDirectionsArgs,
  type SetStorePinArgs,
} from '@/api/place';

/** Her own point, and the street and number it was set at. */
export interface SuPunto {
  readonly pin: Pin;
  readonly calle: string;
  readonly numero: string;
}

/** What her address screen holds while she gives or changes it. */
export interface SuDireccion {
  readonly address: AddressForm;
  /** As she typed it; `directionsFrom` makes it one line, or none. */
  readonly directions: string;
  /** Her own point — `null` until she sets one on *Ajusta el punto*. */
  readonly punto: SuPunto | null;
}

/** A street or a number as compared: no accents, no case, one space — *Córdoba* is *cordoba*. */
export function comoSeCompara(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Her point, set at the street and number in the boxes now. */
export function puntoEn(pin: Pin, address: AddressForm): SuPunto {
  return { pin, calle: address.street, numero: address.number };
}

/** ⚠️ Her own point while it still belongs to the street and number in the boxes — else `null`. */
export function puntoVigente(d: SuDireccion): Pin | null {
  if (d.punto === null) return null;
  const mismaCalle = comoSeCompara(d.punto.calle) === comoSeCompara(d.address.street);
  const mismoNumero = comoSeCompara(d.punto.numero) === comoSeCompara(d.address.number);
  return mismaCalle && mismoNumero ? d.punto.pin : null;
}

/** Her kitchen's screen opens her address screen on what is stored. */
export function desdeSuLugar(place: Place): SuDireccion {
  return {
    address: place.address,
    directions: place.directions ?? '',
    punto: place.pin === null ? null : puntoEn(place.pin, place.address),
  };
}

/** One write *Guardar* sends. */
export type Escritura =
  | { readonly kind: 'direccion'; readonly args: SetStoreAddressArgs }
  | { readonly kind: 'punto'; readonly args: SetStorePinArgs }
  | { readonly kind: 'sinPunto'; readonly args: ClearStorePinArgs }
  | { readonly kind: 'indicaciones'; readonly args: SetStoreDirectionsArgs };

/**
 * ⚠️ WHAT *GUARDAR* WRITES, IN ORDER, AND ONLY WHAT CHANGED: her address; then her
 * point — set (with her line, which `set_store_pin` writes with it), or cleared
 * when the one stored no longer applies; then her line alone, when no point was
 * sent. Nothing changed, nothing sent.
 */
export function escrituras(place: Place, ahora: SuDireccion): Escritura[] {
  const out: Escritura[] = [];
  if (!sameAddress(ahora.address, place.address)) {
    out.push({ kind: 'direccion', args: setStoreAddressArgs(place.id, ahora.address) });
  }
  const vigente = puntoVigente(ahora);
  if (vigente !== null && !samePin(vigente, place.pin)) {
    out.push({ kind: 'punto', args: setStorePinArgs(place.id, vigente, ahora.directions) });
    return out;
  }
  if (vigente === null && place.pin !== null) {
    out.push({ kind: 'sinPunto', args: clearStorePinArgs(place.id) });
  }
  if (directionsFrom(ahora.directions) !== place.directions) {
    out.push({ kind: 'indicaciones', args: setStoreDirectionsArgs(place.id, ahora.directions) });
  }
  return out;
}

/** The round trips, as `@/api/calls` makes them. */
export interface DireccionCalls {
  readonly setAddress: (args: SetStoreAddressArgs) => Promise<void>;
  readonly setPin: (args: SetStorePinArgs) => Promise<void>;
  readonly clearPin: (args: ClearStorePinArgs) => Promise<void>;
  readonly setDirections: (args: SetStoreDirectionsArgs) => Promise<void>;
}

/**
 * Sends them one after the other. ⚠️ THE FIRST THAT FAILS STOPS THE REST, and its
 * error is thrown: an address that did not change must not lose her point. What
 * landed is re-read; a second *Guardar* sends only what is still different.
 */
export async function guardarSuDireccion(lista: readonly Escritura[], calls: DireccionCalls): Promise<void> {
  for (const escritura of lista) {
    if (escritura.kind === 'direccion') await calls.setAddress(escritura.args);
    else if (escritura.kind === 'punto') await calls.setPin(escritura.args);
    else if (escritura.kind === 'sinPunto') await calls.clearPin(escritura.args);
    else await calls.setDirections(escritura.args);
  }
}
