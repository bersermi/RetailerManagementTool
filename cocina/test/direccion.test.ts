import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  comoSeCompara,
  desdeSuLugar,
  escrituras,
  guardarSuDireccion,
  puntoEn,
  puntoVigente,
  type DireccionCalls,
  type SuDireccion,
} from '@/api/direccion';
import {
  CLEAR_STORE_PIN,
  SET_STORE_DIRECTIONS,
  clearStorePinArgs,
  samePin,
  setStoreDirectionsArgs,
  type Place,
} from '@/api/place';
import { PAUSA_DEL_MAPA_MS, PAUSA_MS } from '@/lib/google';
import { ES } from '@/strings';

// ============================================================================
// HER ADDRESS FIRST (`10.4h`, the owner's ruling of 2026-11-03): what is kept is
// her address, her line of directions, and her own point only if she sets one; a
// new street or number clears that point, so the map follows the new address.
//
// ⚠️ THE ROUND TRIPS THEMSELVES ARE THE CONTRACT CHECK'S
// (`docs/checks/10.4b-iii-a-cocina-contract.sh`, groups 12–13) and the functions'
// refusals are `supabase/tests/0075_her_address_first.sql`'s. Here the calls are
// stand-ins, so each can be failed in turn; and the screens, which no suite can
// load (ADR-035 §2.11), are read for their wiring.
// ============================================================================

const SRC = new URL('../src/', import.meta.url);
const code = (path: string) =>
  readFileSync(new URL(path, SRC), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
const MIGRATION = readFileSync(new URL('../../supabase/migrations/0075_her_address_first.sql', import.meta.url), 'utf8');

const ADDRESS = { street: 'Durango', number: '220', colonia: 'Roma Norte', city: 'Cuauhtémoc', postalCode: '06700' };
const PIN = { latitude: 19.41936, longitude: -99.16796 };
const OTRO = { latitude: 19.41951, longitude: -99.16812 };

const place = (over: Partial<Place> = {}): Place => ({
  id: 'her-place',
  name: 'Fonda Doña Lupe',
  address: ADDRESS,
  pin: null,
  directions: null,
  ...over,
});

describe('her own point belongs to the street and number it was set at', () => {
  it('compared without accents, case or extra spaces — a fixed accent is the same street', () => {
    expect(comoSeCompara('  Córdoba ')).toBe('cordoba');
    expect(comoSeCompara('Avenida  Insurgentes   Sur')).toBe('avenida insurgentes sur');
    expect(comoSeCompara('Calle 6')).not.toBe(comoSeCompara('Calle 8'));
  });

  it('applies while the boxes read that street and number; a new one, and it no longer does', () => {
    const d: SuDireccion = { address: ADDRESS, directions: '', punto: puntoEn(PIN, ADDRESS) };
    expect(puntoVigente(d)).toEqual(PIN);
    expect(puntoVigente({ ...d, address: { ...ADDRESS, street: 'durango ' } })).toEqual(PIN);
    expect(puntoVigente({ ...d, address: { ...ADDRESS, number: '22' } })).toBeNull();
    expect(puntoVigente({ ...d, address: { ...ADDRESS, street: 'Colima' } })).toBeNull();
    expect(puntoVigente({ ...d, punto: null })).toBeNull();
  });

  it('⚠️ the colonia, the city and the postal code never take it — a fixed colonia is the same door', () => {
    const d: SuDireccion = { address: ADDRESS, directions: '', punto: puntoEn(PIN, ADDRESS) };
    expect(puntoVigente({ ...d, address: { ...ADDRESS, colonia: '', city: 'Ciudad de México', postalCode: '06701' } })).toEqual(PIN);
  });

  it('her address screen opens on what is stored, her point beside the street and number it has now', () => {
    expect(desdeSuLugar(place({ pin: PIN, directions: 'Portón verde' }))).toEqual({
      address: ADDRESS,
      directions: 'Portón verde',
      punto: { pin: PIN, calle: 'Durango', numero: '220' },
    });
    expect(desdeSuLugar(place())).toEqual({ address: ADDRESS, directions: '', punto: null });
  });
});

describe('what *Guardar* writes, in order, and only what changed', () => {
  const stored = place({ pin: PIN, directions: 'Portón verde' });
  const abierto = desdeSuLugar(stored);
  const kinds = (d: SuDireccion, p: Place = stored) => escrituras(p, d).map((e) => e.kind);

  it('nothing changed, nothing sent', () => {
    expect(escrituras(stored, abierto)).toEqual([]);
    expect(escrituras(place(), desdeSuLugar(place()))).toEqual([]);
  });

  it('a new colonia: her address, and her point stays where it is', () => {
    expect(kinds({ ...abierto, address: { ...ADDRESS, colonia: 'Roma Sur' } })).toEqual(['direccion']);
  });

  it('⚠️ a new number: her address, then her point cleared — the map follows the new address', () => {
    const lista = escrituras(stored, { ...abierto, address: { ...ADDRESS, number: '222' } });
    expect(lista.map((e) => e.kind)).toEqual(['direccion', 'sinPunto']);
    expect(lista[1].args).toEqual(clearStorePinArgs('her-place'));
  });

  it('a typo fixed back before she saves brings her point back: nothing cleared', () => {
    expect(kinds({ ...abierto, address: { ...ADDRESS, number: '220 ' } })).toEqual([]);
  });

  it('a new number and a point set for it: her address, then her pin — with her line, which it writes too', () => {
    const nueva = { ...ADDRESS, number: '222' };
    const lista = escrituras(stored, { address: nueva, directions: 'Portón azul', punto: puntoEn(OTRO, nueva) });
    expect(lista.map((e) => e.kind)).toEqual(['direccion', 'punto']);
    expect(lista[1].args).toEqual({ p_location_id: 'her-place', p_lat: 19.41951, p_lng: -99.16812, p_directions: 'Portón azul' });
  });

  it('her line alone: set_store_directions, the pin untouched', () => {
    const lista = escrituras(stored, { ...abierto, directions: '  Junto a la farmacia ' });
    expect(lista.map((e) => e.kind)).toEqual(['indicaciones']);
    expect(lista[0].args).toEqual(setStoreDirectionsArgs('her-place', 'Junto a la farmacia'));
    expect(kinds({ ...abierto, directions: '   ' })).toEqual(['indicaciones']);
    expect(escrituras(stored, { ...abierto, directions: '   ' })[0].args).toEqual({ p_location_id: 'her-place', p_directions: null });
  });

  it('a new number and a new line, no new point: address, point cleared, then the line', () => {
    expect(kinds({ ...abierto, address: { ...ADDRESS, number: '1' }, directions: 'Otra' })).toEqual(['direccion', 'sinPunto', 'indicaciones']);
  });

  it('a first point for a kitchen with none: her pin with her line, and no second write for the line', () => {
    const sinPunto = place({ directions: 'Portón verde' });
    expect(kinds({ ...desdeSuLugar(sinPunto), directions: 'Portón azul', punto: puntoEn(PIN, ADDRESS) }, sinPunto)).toEqual(['punto']);
  });

  it('the same point again is no write — compared as stored, at six decimals', () => {
    expect(samePin(PIN, { latitude: 19.4193604, longitude: -99.1679596 })).toBe(true);
    expect(kinds({ ...abierto, punto: puntoEn({ latitude: 19.4193604, longitude: -99.1679596 }, ADDRESS) })).toEqual([]);
  });

  it('⚠️ sent one after the other, and the first failure stops the rest — an address not saved keeps her point', async () => {
    const sent: string[] = [];
    const step = (name: string, fails = false) => async () => {
      sent.push(name);
      if (fails) throw new TypeError('Network request failed');
    };
    const calls = (failing: string | null): DireccionCalls => ({
      setAddress: step('setAddress', failing === 'setAddress'),
      setPin: step('setPin', failing === 'setPin'),
      clearPin: step('clearPin', failing === 'clearPin'),
      setDirections: step('setDirections', failing === 'setDirections'),
    });
    const lista = escrituras(stored, { ...abierto, address: { ...ADDRESS, number: '1' }, directions: 'Otra' });
    await guardarSuDireccion(lista, calls(null));
    expect(sent).toEqual(['setAddress', 'clearPin', 'setDirections']);
    sent.length = 0;
    await expect(guardarSuDireccion(lista, calls('setAddress'))).rejects.toThrow(/Network request failed/);
    expect(sent).toEqual(['setAddress']);
  });
});

describe('the two doors `0075` added, as the app sends them', () => {
  it('named as the migration names them, each argument by the name PostgREST matches on', () => {
    expect(SET_STORE_DIRECTIONS).toBe('set_store_directions');
    expect(CLEAR_STORE_PIN).toBe('clear_store_pin');
    expect(MIGRATION).toMatch(/create function public\.set_store_directions\(\s*p_location_id uuid,\s*p_directions\s+text default null\s*\)/);
    expect(MIGRATION).toMatch(/create function public\.clear_store_pin\(p_location_id uuid\)/);
    expect(setStoreDirectionsArgs('p', 'a\nb')).toEqual({ p_location_id: 'p', p_directions: 'a b' });
    expect(clearStorePinArgs('p')).toEqual({ p_location_id: 'p' });
    const calls = code('api/calls.ts');
    expect(calls).toMatch(/supabase\.rpc\(SET_STORE_DIRECTIONS, args\)/);
    expect(calls).toMatch(/supabase\.rpc\(CLEAR_STORE_PIN, args\)/);
  });

  it('⚠️⚠️ *Ajustar punto* sends her stored line with her point — `set_store_pin` writes both, and that screen has no box for it', () => {
    expect(code('app/(cocina)/ubicacion.tsx')).toMatch(/save\(setStorePinArgs\(here\.id, pin, here\.directions \?\? ''\)\)/);
  });

  it('*Cambiar dirección* writes what `escrituras` chose, and nothing when nothing changed', () => {
    const screen = code('app/(cocina)/direccion/index.tsx');
    expect(screen).toMatch(/const lista = escrituras\(here, valor\);\s*if \(lista\.length === 0\) \{\s*router\.back\(\);\s*return null;\s*\}\s*const problem = await save\(lista\);/);
    expect(code('api/hooks.ts')).toMatch(/mutationFn: \(lista: readonly Escritura\[\]\) => guardarSuDireccion\(lista, direccionCalls\)/);
  });
});

describe('the small map: her own point, or where Google places her address — looked up live, never kept', () => {
  it('asked only while she has no point of her own, on both screens that draw it', () => {
    expect(code('ui/PantallaDireccion.tsx')).toMatch(/const donde = useDondeEsta\(propio !== null \? null : valor\.address, elegido\);/);
    expect(code('ui/PantallaDireccion.tsx')).toMatch(/const punto = propio \?\? \(donde\.kind === 'punto' \? donde\.destino\.punto : null\);/);
    expect(code('app/(cocina)/index.tsx')).toMatch(
      /const donde = useDondeEsta\(here === undefined \|\| here === null \|\| here\.pin !== null \? null : here\.address, null\);/,
    );
  });

  it('a pick asks nothing; her boxes ask once they rest, longer than the suggestions’ pause, with the full map’s question', () => {
    expect(PAUSA_DEL_MAPA_MS).toBe(900);
    expect(PAUSA_DEL_MAPA_MS).toBeGreaterThan(PAUSA_MS);
    const hook = code('lib/useGoogle.ts');
    expect(hook).toMatch(/const delElegido = elegido !== null && direccion !== null && sameAddress\(direccion, elegido\.direccion\) \? elegido : null;/);
    expect(hook).toMatch(/const asentada = useAsentado\(delElegido === null \? direccion : null, PAUSA_DEL_MAPA_MS\);/);
    expect(hook.match(/queryKey: \[\.\.\.BUSCAR_KEY, 'apertura', pregunta\]/g)).toHaveLength(2);
    expect(hook).toMatch(/export function useDondeEsta\([\s\S]*?enabled: pregunta !== null && CLAVE !== null,/);
  });

  it('its point reaches the picture and the full map’s opening, and nothing that writes', () => {
    for (const route of ['app/(onboarding)/donde.tsx', 'app/(cocina)/direccion/index.tsx']) {
      expect(code(route), route).not.toMatch(/useDondeEsta|destino/);
    }
    for (const route of ['app/(onboarding)/punto.tsx', 'app/(cocina)/direccion/punto.tsx', 'app/(cocina)/ubicacion.tsx']) {
      expect(code(route), route).toMatch(/abreEn=\{donde\.kind === 'punto' \? donde\.destino : null\}/);
    }
  });
});

describe('the words — the proposal he chose, and the few it did not draw', () => {
  it('two steps, her address on the second', () => {
    expect(ES.registro.paso(1)).toBe('Paso 1 de 2');
    expect(ES.registro.paso(2)).toBe('Paso 2 de 2');
    expect(ES.registro.siguiente).toBe('Siguiente: tu dirección');
    expect(ES.direccion.titulo).toBe('¿Dónde está tu cocina?');
    expect(ES.direccion.registrar).toBe('Registrar mi cocina');
  });

  it('the pin a suggestion she never has to touch', () => {
    expect(ES.direccion.tocaElMapa).toBe('Si el punto no es tu puerta, toca el mapa.');
    expect(ES.direccion.ajustarEtiqueta).toBe('Ajustar');
    expect(ES.mapa.titulo).toBe('Ajusta el punto');
    expect(ES.mapa.listo).toBe('Listo');
    expect(ES.mapa.guardado).toBe('Tu punto queda guardado y lo usan todos los mapas.');
  });

  it('her kitchen: three doors, and her point never missing', () => {
    expect([ES.cocina.cambiarDireccion, ES.cocina.ajustarPunto, ES.cocina.cambiarGiro]).toEqual([
      'Cambiar dirección',
      'Ajustar punto',
      'Cambiar giro',
    ]);
    expect(Object.keys(ES.cocina)).not.toContain('sinPunto');
  });
});
