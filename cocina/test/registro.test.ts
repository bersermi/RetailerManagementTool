import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { KNOWN_API_CODES, apiErrorKey, apiErrorMessage } from '@/api/errors';
import {
  COCINA_KIND,
  GIRO_COLUMN,
  KITCHEN_GIROS,
  ONBOARD_WORKSPACE,
  checkKitchenName,
  giroLabel,
  girosFrom,
  onboardArgs,
} from '@/api/kitchen';
import { puntoEn } from '@/api/direccion';
import {
  EMPTY_ADDRESS,
  toPlace,
  type SetStoreAddressArgs,
  type SetStoreDirectionsArgs,
  type SetStorePinArgs,
} from '@/api/place';
import {
  BORRADOR_VACIO,
  draftFrom,
  formIssue,
  makeKitchen,
  pasoUno,
  withKitchen,
  type Draft,
  type KitchenCalls,
} from '@/api/registro';
import { ES } from '@/strings';
import { ES as WERA } from '../../app/src/strings';

// ============================================================================
// MAKING HER KITCHEN: what the sign-up asks, what is sent, and what happens when
// a step fails. Plan tasks `10.4b-iii-b` and `10.4h` (address first: her own point
// only if she sets one, and her line of directions saved without it).
//
// ⚠️ THE ROUND TRIPS THEMSELVES ARE THE CONTRACT CHECK'S
// (`docs/checks/10.4b-iii-a-cocina-contract.sh`, as a login that owns a shop).
// Here the calls are stand-ins, so each one can be failed in turn and the rest
// watched: only the first may fail the sign-up, and every later write lands on
// the place THE NEW KITCHEN owns.
// ============================================================================

const SRC = new URL('../src/', import.meta.url);
const code = (path: string) =>
  readFileSync(new URL(path, SRC), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const ADDRESS = { street: 'Fresno', number: '45', colonia: '', city: 'Cuauhtémoc', postalCode: '06400' };
/** Her own point, set on *Ajusta el punto*. */
const DRAFT: Draft = {
  name: 'Fonda Doña Lupe',
  giro: 'giro-fonda',
  address: ADDRESS,
  pin: { latitude: 19.45123449, longitude: -99.15987651 },
  directions: 'Portón verde',
};
/** ⚠️ The usual one since `10.4h`: her address alone, and a line of directions. */
const SIN_PUNTO: Draft = { ...DRAFT, pin: null };

/** Stand-ins that record what they were sent; `fail` names the ones that throw. */
function calls(fail: readonly string[] = []) {
  const sent: { name: string; args: unknown }[] = [];
  const step = <T>(name: string, answer: T) => async (...args: unknown[]): Promise<T> => {
    sent.push({ name, args: args.length === 1 ? args[0] : args });
    if (fail.includes(name)) throw new TypeError('Network request failed');
    return answer;
  };
  const place = toPlace({
    id: 'place-of-the-new-kitchen',
    name: 'Fonda Doña Lupe',
    street: null,
    street_number: null,
    colonia: null,
    city: null,
    postal_code: null,
    pin_lat: null,
    pin_lng: null,
    directions: null,
  });
  const api: KitchenCalls = {
    onboard: step('onboard', 'new-kitchen'),
    setGiro: step('setGiro', undefined),
    firstPlace: step('firstPlace', place),
    setAddress: step('setAddress', undefined),
    setPin: step('setPin', undefined),
    setDirections: step('setDirections', undefined),
  };
  return { api, sent, names: () => sent.map((s) => s.name) };
}

describe('the writes, in order', () => {
  it('her address alone: the kitchen, her trade, her address, and her line without a pin — all on what the new kitchen owns', async () => {
    const { api, sent, names } = calls();
    expect(await makeKitchen(SIN_PUNTO, api)).toEqual({ kitchenId: 'new-kitchen', missing: [] });
    expect(names()).toEqual(['onboard', 'setGiro', 'firstPlace', 'setAddress', 'setDirections']);
    expect((sent[3].args as SetStoreAddressArgs).p_location_id).toBe('place-of-the-new-kitchen');
    expect(sent[4].args as SetStoreDirectionsArgs).toEqual({ p_location_id: 'place-of-the-new-kitchen', p_directions: 'Portón verde' });
  });

  it('with no line and no point, nothing after her address — no empty write', async () => {
    const { api, names } = calls();
    expect(await makeKitchen({ ...SIN_PUNTO, directions: '   ' }, api)).toEqual({ kitchenId: 'new-kitchen', missing: [] });
    expect(names()).toEqual(['onboard', 'setGiro', 'firstPlace', 'setAddress']);
  });

  it('with her own point: her pin, and her line with it — `set_store_pin` writes both, so no second write', async () => {
    const { api, sent, names } = calls();
    const made = await makeKitchen(DRAFT, api);
    expect(made).toEqual({ kitchenId: 'new-kitchen', missing: [] });
    expect(names()).toEqual(['onboard', 'setGiro', 'firstPlace', 'setAddress', 'setPin']);
    expect(sent[0].args).toEqual({ p_display_name: 'Fonda Doña Lupe', p_kind: 'cocina' });
    expect(sent[1].args).toEqual(['new-kitchen', 'giro-fonda']);
    expect(sent[2].args).toBe('new-kitchen');
    expect((sent[3].args as SetStoreAddressArgs).p_location_id).toBe('place-of-the-new-kitchen');
    expect(sent[4].args as SetStorePinArgs).toEqual({
      p_location_id: 'place-of-the-new-kitchen',
      p_lat: 19.451234,
      p_lng: -99.159877,
      p_directions: 'Portón verde',
    });
  });

  it('when the kitchen is not made, nothing else is sent and the sign-up says so', async () => {
    const { api, names } = calls(['onboard']);
    await expect(makeKitchen(DRAFT, api)).rejects.toThrow(/Network request failed/);
    expect(names()).toEqual(['onboard']);
  });

  it('a later step that fails leaves the kitchen made, and the rest are still written', async () => {
    const giro = calls(['setGiro']);
    expect(await makeKitchen(DRAFT, giro.api)).toEqual({ kitchenId: 'new-kitchen', missing: ['giro'] });
    expect(giro.names()).toEqual(['onboard', 'setGiro', 'firstPlace', 'setAddress', 'setPin']);

    const address = calls(['setAddress']);
    expect(await makeKitchen(DRAFT, address.api)).toEqual({ kitchenId: 'new-kitchen', missing: ['address'] });
    expect(address.names()).toContain('setPin');

    const pin = calls(['setPin']);
    expect(await makeKitchen(DRAFT, pin.api)).toEqual({ kitchenId: 'new-kitchen', missing: ['pin'] });

    const line = calls(['setDirections']);
    expect(await makeKitchen(SIN_PUNTO, line.api)).toEqual({ kitchenId: 'new-kitchen', missing: ['directions'] });
  });

  it('with no place read, what comes after the kitchen waits for her kitchen’s screen', async () => {
    const withPoint = calls(['firstPlace']);
    expect(await makeKitchen(DRAFT, withPoint.api)).toEqual({ kitchenId: 'new-kitchen', missing: ['address', 'pin'] });
    expect(withPoint.names()).toEqual(['onboard', 'setGiro', 'firstPlace']);
    const withLine = calls(['firstPlace']);
    expect(await makeKitchen(SIN_PUNTO, withLine.api)).toEqual({ kitchenId: 'new-kitchen', missing: ['address', 'directions'] });
    const alone = calls(['firstPlace']);
    expect(await makeKitchen({ ...SIN_PUNTO, directions: '' }, alone.api)).toEqual({ kitchenId: 'new-kitchen', missing: ['address'] });
  });
});

describe('the made kitchen joins her list at once — the guard takes her there without a re-read', () => {
  it('appended once, with her trade unless it failed', () => {
    const made = { kitchenId: 'new-kitchen', missing: [] as const };
    expect(withKitchen([], made, DRAFT)).toEqual([{ id: 'new-kitchen', displayName: 'Fonda Doña Lupe', giroPrincipal: 'giro-fonda' }]);
    expect(withKitchen(undefined, { kitchenId: 'new-kitchen', missing: ['giro'] }, DRAFT)[0].giroPrincipal).toBeNull();
    const already = [{ id: 'new-kitchen', displayName: 'Fonda Doña Lupe', giroPrincipal: 'giro-fonda' }];
    expect(withKitchen(already, made, DRAFT)).toHaveLength(1);
  });

  it('wired so: the list on success, a re-read either way, and no write waits on a re-read', () => {
    const hooks = code('api/hooks.ts');
    expect(hooks).toMatch(/onSuccess: \(made, draft\) => \{\s*queries\.setQueryData<Kitchen\[\]>\(kitchensKey\(userId\), \(kitchens\) => withKitchen\(kitchens, made, draft\)\);/);
    expect(hooks).toMatch(/onSettled: \(\) => \{\s*void queries\.invalidateQueries\(\{ queryKey: PLACES_KEY \}\);\s*void queries\.invalidateQueries\(\{ queryKey: KITCHENS_KEY \}\);/);
    expect(hooks).not.toMatch(/await queries\.invalidateQueries/);
  });

  it('and the address screen’s button stays busy after a success — a second tap would be a second kitchen', () => {
    const donde = code('app/(onboarding)/donde.tsx');
    expect(donde).toMatch(/if \(problem === null\) setHecho\(true\)/);
    expect(donde).toMatch(/busy=\{busy \|\| hecho\}/);
    expect(donde).not.toMatch(/router\.(replace|push|navigate)\('\/'\)/);
    // ⚠️ `10.4h`: *Ajusta el punto* writes nothing in the sign-up — her point waits for that button.
    expect(code('app/(onboarding)/punto.tsx')).not.toMatch(/useMakeKitchen|make\(/);
  });
});

describe('what the sign-up asks, in the screens’ order', () => {
  const FILLED = { ...BORRADOR_VACIO, name: 'Fonda Doña Lupe', giro: 'giro-fonda', address: ADDRESS };

  it('starts empty, her trade unchosen and no point — a proposal must not look decided', () => {
    expect(BORRADOR_VACIO).toEqual({ name: '', giro: null, address: EMPTY_ADDRESS, directions: '', punto: null });
  });

  it('the first screen asks the name, then the trade — and nothing of her address', () => {
    expect(pasoUno(BORRADOR_VACIO)).toBe('name');
    expect(pasoUno({ ...FILLED, giro: null })).toBe('giro');
    expect(pasoUno({ ...FILLED, address: EMPTY_ADDRESS })).toBeNull();
  });

  it('then the address box by box', () => {
    expect(formIssue(BORRADOR_VACIO)).toBe('name');
    expect(formIssue({ ...FILLED, giro: null })).toBe('giro');
    expect(formIssue({ ...FILLED, address: { ...ADDRESS, city: '' } })).toBe('city');
    expect(formIssue(FILLED)).toBeNull();
  });

  it('⚠️ *Registrar mi cocina* sends a whole draft with no point — her address alone — the name trimmed', () => {
    expect(draftFrom({ ...FILLED, address: { ...ADDRESS, number: '' } })).toBeNull();
    expect(draftFrom({ ...FILLED, name: '  Fonda Doña Lupe ' })).toEqual({
      name: 'Fonda Doña Lupe',
      giro: 'giro-fonda',
      address: ADDRESS,
      pin: null,
      directions: '',
    });
  });

  it('and her own point only while it belongs to the street and number in the boxes', () => {
    const pin = { latitude: 19.45, longitude: -99.15 };
    const conPunto = { ...FILLED, punto: puntoEn(pin, ADDRESS) };
    expect(draftFrom(conPunto)?.pin).toEqual(pin);
    expect(draftFrom({ ...conPunto, address: { ...ADDRESS, number: '47' } })?.pin).toBeNull();
    expect(draftFrom({ ...conPunto, address: { ...ADDRESS, colonia: 'Santa María la Ribera' } })?.pin).toEqual(pin);
  });

  it('refuses a blank name and nothing else — every other name is somebody’s kitchen', () => {
    expect(checkKitchenName('   ')).toBeNull();
    expect(checkKitchenName(' La 5ta ')).toBe('La 5ta');
    expect(checkKitchenName('El 7')).toBe('El 7');
  });
});

describe('the kitchen and her trade, as the app sends them', () => {
  it('`onboard_workspace` with two of its names, the kind a kitchen', () => {
    expect(ONBOARD_WORKSPACE).toBe('onboard_workspace');
    expect(onboardArgs('  Fonda Doña Lupe ')).toEqual({ p_display_name: 'Fonda Doña Lupe', p_kind: COCINA_KIND });
    expect(code('api/calls.ts')).toMatch(/supabase\.rpc\(ONBOARD_WORKSPACE, args\)/);
  });

  it('the trades from the kitchens’ own door, in its order, a broken row dropped', () => {
    expect(KITCHEN_GIROS).toBe('kitchen_giros');
    expect(code('api/calls.ts')).toMatch(/supabase\.rpc\(KITCHEN_GIROS\)/);
    expect(
      girosFrom([
        { code: 'giro-fonda', label: 'Fonda o cocina económica' },
        { code: '', label: 'Sin código' },
        { code: 'giro-x' },
        null,
        { code: 'giro-taqueria', label: ' Taquería ' },
      ]),
    ).toEqual([
      { code: 'giro-fonda', label: 'Fonda o cocina económica' },
      { code: 'giro-taqueria', label: 'Taquería' },
    ]);
    expect(girosFrom(null)).toEqual([]);
    expect(girosFrom({ code: 'giro-fonda' })).toEqual([]);
  });

  it('her trade named from the list, or not named', () => {
    const list = [{ code: 'giro-fonda', label: 'Fonda o cocina económica' }];
    expect(giroLabel(list, 'giro-fonda')).toBe('Fonda o cocina económica');
    expect(giroLabel(list, 'giro-gone')).toBeNull();
    expect(giroLabel(undefined, 'giro-fonda')).toBeNull();
    expect(giroLabel(list, null)).toBeNull();
  });

  it('written by the owner’s plain update that asks for the row back — a refusal is not a silent “saved”', () => {
    expect(GIRO_COLUMN).toBe('giro_principal');
    expect(code('api/calls.ts')).toMatch(
      /\.from\(WORKSPACE_TABLE\)\s*\.update\(\{ \[GIRO_COLUMN\]: giro \}\)\s*\.eq\('id', kitchenId\)\s*\.select\('id'\)\s*\.single\(\)/,
    );
  });
});

describe('what she is told when a call fails', () => {
  it('a dead link, a session gone, and “not yours” each have their sentence; the rest is the catch-all', () => {
    expect(apiErrorKey(new TypeError('Network request failed'))).toBe('offline');
    expect(apiErrorKey({ name: 'AuthRetryableFetchError' })).toBe('offline');
    expect(apiErrorKey({ code: '42501' })).toBe('sessionEnded');
    expect(apiErrorKey({ code: 'TD012' })).toBe('ownerOnly');
    expect(apiErrorKey({ code: 'PGRST116' })).toBe('ownerOnly');
    // ⚠️ `10.4b-iv-a`: a value the database would not take has its own sentence
    // since publishing — a form left open past its window, or a clock that is off.
    expect(apiErrorKey({ code: '22023' })).toBe('revisar');
    expect(apiErrorKey({ code: '23505' })).toBe('unknown');
    expect(apiErrorKey('boom')).toBe('unknown');
    for (const known of KNOWN_API_CODES) expect(apiErrorKey({ code: known })).not.toBe('unknown');
  });

  it('never in English, and in Wera’s words where Wera says the same', () => {
    expect(apiErrorMessage(new Error('duplicate key value'))).toBe(ES.api.errors.unknown);
    for (const key of ['sessionEnded', 'offline', 'unknown'] as const) {
      expect(ES.api.errors[key], key).toBe(WERA.api.errors[key]);
    }
  });
});
