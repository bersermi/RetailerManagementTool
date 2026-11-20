import { describe, expect, it } from 'vitest';

import { tarjetaOf, type Kitchen } from '@/api/cocinas';
import type { Apartado } from '@/api/apartados';
import type { MyCardRow, RewardRow, ScanRow } from '@/api/tarjeta';
import { festejados, marcarFestejados } from '@/lib/festejado';
import { guardarLlave, leerLlave, LLAVE_KEY } from '@/lib/llave';
import type { DeviceStore } from '@/lib/store';
import {
  alEliminarDe,
  bitsDeTarjeta,
  cardDeEscaneo,
  ayudaDeTarjeta,
  cocinaDeTarjeta,
  cocinaDelEscaneo,
  codigoDeCocinaDe,
  colorDeTarjeta,
  condicionesDeCocina,
  condicionesDeSuTarjeta,
  conPremios,
  desenlaceDe,
  dio,
  festejoDe,
  hayTarjetas,
  loQueVenDe,
  marcaDeCocina,
  novedadDe,
  porCocina,
  preguntarCobro,
  premiosDe,
  premiosTexto,
  tarjetaErrorMessage,
  tecleadoDe,
  terminaElCobro,
  tituloDe,
  vistaDe,
} from '@/lib/tarjeta';
import { ES } from '@/strings';

// ============================================================================
// THE LOYALTY CARD IN ITACATE — EVERY RULE `@/lib/tarjeta` DRAWS BY. Plan task `10.9e-iii` (G4–G17, G38,
// G41, G42 of 2026-11-16 and 17, as the family-shell page draws stage 3). What only a real PostgREST can say
// is `docs/checks/10.9e-i-card-contract.sh`'s; that the copies of Wera Cocina's files are its files is
// `test/gemelos.test.ts`'. Here: what each answer becomes on her screen, and what her phone keeps.
// ⚠️ NO CHECK HERE SEES A SCREEN (ADR-035 §2.11) — the emulator's walk and the owner's look are their evidence.
// ============================================================================

const MARI = 'aaaaaaaa-0000-4000-8000-00000000000a';
const ESPIGA = 'bbbbbbbb-0000-4000-8000-00000000000b';
const LLAVE = '0085aaaa-0000-4000-8000-000000000001';
const SECRETO = '00112233445566778899aabbccddeeff00112233';

function premio(id: string, wonAt = '2026-11-19T18:20:00Z', reward = 'Una comida corrida'): RewardRow {
  return { id, reward, won_at: wonAt };
}

function card(over: Partial<MyCardRow> = {}): MyCardRow {
  return {
    id: MARI,
    name: 'Fonda Doña Mari',
    colonia: 'Santa María la Ribera',
    page: { color: 'nopal', logo_path: null },
    stamps: 3,
    of: 8,
    reward: 'Una comida corrida',
    expiry_days: 30,
    expires_on: '2026-12-19',
    stamped_today: false,
    rewards: [],
    open: true,
    kept_until: null,
    ...over,
  };
}

function kitchen(over: Partial<Kitchen> = {}): Kitchen {
  return {
    id: MARI,
    name: 'Fonda Doña Mari',
    giro: 'fonda',
    address: { street: 'Sabino', number: '52', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postalCode: '06400' },
    directions: null,
    point: null,
    page: { sentence: null, color: 'chile', cover: null, logo: 'aaaaaaaa/logo.jpg', mapsLink: null },
    offers: [],
    summary: { weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: null, repeats: [] },
    pagos: ['efectivo'],
    comeres: ['llevar'],
    minScore: null,
    estrellas: null,
    servicios: [],
    tarjeta: null,
    promociones: [],
    ...over,
  };
}

function memoria(): DeviceStore & { readonly datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

describe('the door’s `card` — the terms a first stamp starts on (`tarjetaOf`)', () => {
  it('reads the reward, the stamps and the days; *Nunca* is null in the door and 0 here', () => {
    expect(tarjetaOf({ reward: 'Una comida corrida', stamps: 8, expiry_days: 30 })).toEqual({ premio: 'Una comida corrida', sellos: 8, dias: 30 });
    expect(tarjetaOf({ reward: 'Un pan', stamps: 4, expiry_days: null })).toEqual({ premio: 'Un pan', sellos: 4, dias: 0 });
  });

  it('`10.9k`: any whole number of days from 14 to 365 — the chips’ 14, 30, 60, 90, *Otro…*’s 21, and 0085’s 15 and 45', () => {
    for (const dias of [14, 15, 21, 30, 45, 60, 90, 365]) {
      expect(tarjetaOf({ reward: 'Pan', stamps: 8, expiry_days: dias }), String(dias)).toEqual({ premio: 'Pan', sellos: 8, dias });
    }
  });

  it('terms it cannot read are none — no invitation, never an error', () => {
    for (const bad of [null, undefined, 'x', [], { reward: '', stamps: 8, expiry_days: 30 }, { reward: 'x'.repeat(61), stamps: 8, expiry_days: 30 },
      { reward: 'Pan', stamps: 3, expiry_days: 30 }, { reward: 'Pan', stamps: 13, expiry_days: 30 }, { reward: 'Pan', stamps: 8.5, expiry_days: 30 },
      { reward: 'Pan', stamps: 8, expiry_days: 13 }, { reward: 'Pan', stamps: 8, expiry_days: 366 }, { reward: 'Pan', stamps: 8, expiry_days: 20.5 },
      { reward: 'Pan', stamps: 8, expiry_days: 0.5 }, { reward: 'Pan', stamps: 8, expiry_days: -21 }, { reward: 'Pan', stamps: 8, expiry_days: '21' },
      { reward: 'Pan', stamps: 8 }]) {
      expect(tarjetaOf(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('her card, as drawn (G41)', () => {
  it('wears the kitchen’s colour — the door’s, with its logo — else what `my_cards` says, else a default', () => {
    expect(colorDeTarjeta(card(), kitchen())).toBe('chile');
    expect(colorDeTarjeta(card(), null)).toBe('nopal');
    expect(colorDeTarjeta(card({ page: { color: 'not-a-colour', logo_path: null } }), null)).toMatch(/^[a-z]+$/);
    expect(vistaDe(card(), kitchen())?.logo).toBe('aaaaaaaa/logo.jpg');
    expect(vistaDe(card({ page: { color: null, logo_path: 'aaaaaaaa/l.jpg' } }), null)?.logo).toBe('aaaaaaaa/l.jpg');
  });

  it('*3 de 8*, her card’s own terms, *Vence el … si no vienes* only with stamps going and days set', () => {
    const vista = vistaDe(card(), null);
    expect(vista).toMatchObject({ sellos: 3, de: 8, premio: 'Una comida corrida', vence: 'Vence el 19 de diciembre si no vienes', cerradaHasta: null });
    expect(vistaDe(card({ expiry_days: null, expires_on: null }), null)?.vence).toBeNull();
    expect(vistaDe(card({ stamps: 0, rewards: [premio('r1')] }), null)?.vence).toBeNull();
  });

  it('a card the kitchen closed says until when she may finish it and claim (G12)', () => {
    expect(vistaDe(card({ open: false, kept_until: '2026-12-18T18:00:00Z' }), null)?.cerradaHasta).toBe('18 de diciembre');
  });

  it('a card with no terms is nothing to draw', () => {
    expect(vistaDe(card({ of: null, reward: null }), null)).toBeNull();
  });

  it('*2 premios por cobrar*, the first one’s words and *y más*; each with *Ganado el …*', () => {
    expect(premiosTexto([])).toBeNull();
    expect(premiosTexto([premio('r1')])).toEqual({ titulo: '1 premio por cobrar', detalle: 'Una comida corrida' });
    expect(premiosTexto([premio('r1'), premio('r2', undefined, 'Un agua')])).toEqual({ titulo: '2 premios por cobrar', detalle: 'Una comida corrida y más' });
    expect(premiosDe([premio('r1', '2026-11-05T18:00:00Z')])).toEqual([{ id: 'r1', que: 'Una comida corrida', cuando: 'Ganado el 5 de noviembre' }]);
  });
});

describe('the invitation and its conditions (G12): the kitchen promises, with its address', () => {
  it('from the door, before her first stamp — Wera Cocina’s words', () => {
    const k = kitchen({ tarjeta: { premio: 'Una comida corrida', sellos: 8, dias: 30 } });
    expect(condicionesDeCocina(k)).toBe(
      'Junta 8 sellos en Fonda Doña Mari y te dan una comida corrida. Un sello por visita, uno al día. Tus sellos se borran si pasa un mes sin que vengas. La promesa es de Fonda Doña Mari, Sabino 52, Santa María la Ribera.',
    );
    expect(condicionesDeCocina(kitchen({ tarjeta: { premio: 'Un pan', sellos: 6, dias: 0 } }))).toContain('Tus sellos no se borran.');
    expect(condicionesDeCocina(kitchen())).toBeNull();
  });

  it('a card she holds: ITS terms, the address from the door when it sends it, else none named', () => {
    expect(condicionesDeSuTarjeta(card({ of: 10, reward: 'Tacos', expiry_days: null }), kitchen())).toBe(
      'Junta 10 sellos en Fonda Doña Mari y te dan tacos. Un sello por visita, uno al día. Tus sellos no se borran. La promesa es de Fonda Doña Mari, Sabino 52, Santa María la Ribera.',
    );
    expect(condicionesDeSuTarjeta(card(), null)).toMatch(/La promesa es de Fonda Doña Mari\.$/);
  });
});

describe('where the card shows at all — with Wera’s switch off, nowhere', () => {
  it('*Escanear* and *Mi código* at the top of *Mis cocinas*: a kitchen with a card, or one she holds', () => {
    expect(hayTarjetas(undefined, undefined)).toBe(false);
    expect(hayTarjetas([kitchen(), kitchen({ id: ESPIGA })], [])).toBe(false);
    expect(hayTarjetas([kitchen({ tarjeta: { premio: 'Pan', sellos: 6, dias: 0 } })], [])).toBe(true);
    expect(hayTarjetas([], [card()])).toBe(true);
  });

  it('with no signal at open nothing is read — a key kept on this phone still shows *Mi código*, which needs none', () => {
    expect(hayTarjetas(undefined, undefined, true)).toBe(true);
    expect(hayTarjetas(undefined, undefined, false)).toBe(false);
  });

  it('*Cerca*’s mark (G38): *3/8* by kitchen id, none with no stamp going', () => {
    const cards = porCocina([card(), card({ id: ESPIGA, stamps: 0, rewards: [premio('r1')] })]);
    expect(marcaDeCocina(cards, MARI)).toEqual({ texto: '3/8', ayuda: '3 de 8 sellos en tu tarjeta' });
    expect(marcaDeCocina(cards, ESPIGA)).toBeNull();
    expect(marcaDeCocina(cards, 'otra')).toBeNull();
  });

  it('*Mis cocinas*: the kitchens with rewards, and a row’s *3/8 · 2 premios*', () => {
    const conDos = card({ rewards: [premio('r1'), premio('r2')] });
    expect(conPremios([card(), conDos]).map((c) => c.rewards.length)).toEqual([2]);
    expect(bitsDeTarjeta(conDos)).toBe('3/8 · 2 premios');
    expect(bitsDeTarjeta(card({ stamps: 0, rewards: [premio('r1')] }))).toBe('1 premio');
    expect(bitsDeTarjeta(undefined)).toBeNull();
    // For a screen reader, never the raw *3/8*.
    expect(ayudaDeTarjeta(conDos)).toBe('3 de 8 sellos, 2 premios por cobrar');
    expect(ayudaDeTarjeta(card())).toBe('3 de 8 sellos');
  });

  it('a kitchen the door no longer sends still has a circle: its name, colonia, colour and logo', () => {
    const k = cocinaDeTarjeta(card({ page: { color: 'jamaica', logo_path: 'aaaaaaaa/l.jpg' } }), null);
    expect(k).toMatchObject({ id: MARI, name: 'Fonda Doña Mari', page: { color: 'jamaica', logo: 'aaaaaaaa/l.jpg' }, tarjeta: null });
    expect(k.address.colonia).toBe('Santa María la Ribera');
    const puerta = kitchen();
    expect(cocinaDeTarjeta(card(), puerta)).toBe(puerta);
  });
});

describe('a scan — what her camera or her thumbs gave', () => {
  it('a kitchen’s *Sellar* QR names its phone; her own code, or anything else, is not one', () => {
    expect(codigoDeCocinaDe(`WERA1:c:${LLAVE}:482190`)).toEqual({ code: '482190', key: LLAVE });
    expect(codigoDeCocinaDe(`WERA1:v:${LLAVE}:482190`)).toBeNull();
    expect(codigoDeCocinaDe('https://tu-wera.com/cocina/?k=x')).toBeNull();
    expect(tecleadoDe('482 190')).toEqual({ code: '482190', key: null });
    expect(tecleadoDe('48219')).toBeNull();
  });
});

describe('what a scan gave, as `0085` answered it', () => {
  const k = { id: MARI, name: 'Fonda Doña Mari' };
  const estado = (over: Partial<MyCardRow> = {}) => {
    const { id: _i, name: _n, colonia: _c, page: _p, ...rest } = card(over);
    return rest;
  };
  const scan = (over: Partial<ScanRow>): ScanRow => ({ result: 'sello', kitchen: k, claimed: null, card: estado(), ...over });

  it('every result says its line — never guessed', () => {
    expect(tituloDe(desenlaceDe(scan({ result: 'primer', card: estado({ stamps: 1 }) })))).toBe('Tu primer sello en Fonda Doña Mari');
    expect(tituloDe(desenlaceDe(scan({ result: 'sello' })))).toBe('Sello en Fonda Doña Mari · 3 de 8');
    expect(tituloDe(desenlaceDe(scan({ result: 'gano', card: estado({ stamps: 0, rewards: [premio('r1')] }) })))).toBe('Completaste tu tarjeta en Fonda Doña Mari');
    expect(tituloDe(desenlaceDe(scan({ result: 'ya_hoy' })))).toBe('Hoy ya tienes tu sello en Fonda Doña Mari');
    expect(tituloDe(desenlaceDe(scan({ result: 'cobrado', claimed: 'Una comida corrida' })))).toBe('Cobraste una comida corrida en Fonda Doña Mari. Pídeselo.');
    expect(tituloDe(desenlaceDe(scan({ result: 'ya_cobrado', claimed: 'Una comida corrida' })))).toBe('Ya habías cobrado una comida corrida.');
    expect(tituloDe(desenlaceDe(scan({ result: 'cerrada', card: null })))).toBe('Fonda Doña Mari no tiene tarjeta de lealtad ahora.');
    expect(tituloDe(desenlaceDe({ result: 'cerrada', kitchen: null, claimed: null, card: null }))).toBe(ES.escanear.resultado.cerradaSin);
    expect(tituloDe(desenlaceDe(scan({ result: 'propia', card: null })))).toBe(ES.escanear.resultado.propia);
    expect(tituloDe(desenlaceDe({ result: 'no_valido', kitchen: null, claimed: null, card: null }))).toBe(ES.escanear.resultado.noValido);
    expect(tituloDe(desenlaceDe({ result: 'repite', kitchen: null, claimed: null, card: null }))).toBe(ES.escanear.resultado.repite);
  });

  it('what gave her what she came for, and what did not', () => {
    expect(['primer', 'sello', 'gano', 'cobrado'].every((r) => dio(desenlaceDe(scan({ result: r as ScanRow['result'], claimed: 'x' }))))).toBe(true);
    expect(['ya_hoy', 'ya_cobrado', 'cerrada', 'no_valido'].some((r) => dio(desenlaceDe(scan({ result: r as ScanRow['result'], claimed: 'x' }))))).toBe(false);
  });

  it('*¿Cobrar tu premio ahora?* after a stamp where she has a reward — never after the last stamp (the celebration first)', () => {
    const conPremio = estado({ rewards: [premio('r1')] });
    expect(preguntarCobro(desenlaceDe(scan({ result: 'sello', card: conPremio })))).toHaveLength(1);
    expect(preguntarCobro(desenlaceDe(scan({ result: 'ya_hoy', card: conPremio })))).toHaveLength(1);
    expect(preguntarCobro(desenlaceDe(scan({ result: 'primer', card: conPremio })))).toHaveLength(1);
    expect(preguntarCobro(desenlaceDe(scan({ result: 'gano', card: conPremio })))).toHaveLength(0);
    expect(preguntarCobro(desenlaceDe(scan({ result: 'sello' })))).toHaveLength(0);
  });

  it('a scan’s card draws as her card there', () => {
    const c = cardDeEscaneo(k, estado());
    expect(vistaDe(c, kitchen())).toMatchObject({ cocinaId: MARI, sellos: 3, de: 8, color: 'chile' });
  });

  it('a refusal in words, by `0085`’s codes', () => {
    expect(tarjetaErrorMessage({ code: 'TD024' })).toBe(ES.tarjeta.errores.noDisponible);
    expect(tarjetaErrorMessage({ code: 'TD028' })).toBe(ES.tarjeta.errores.demasiados);
    expect(tarjetaErrorMessage({ code: 'TD027' })).toBe(ES.tarjeta.errores.noEsTuPremio);
    expect(tarjetaErrorMessage({ code: '22023' })).toBe(ES.tarjeta.errores.codigo);
    expect(tarjetaErrorMessage({ message: 'Network request failed' })).toBe(ES.api.errors.offline);
  });
});

describe('*Mi código*: what the kitchen’s scan did, read from her cards again (`novedadDe`)', () => {
  it('nothing changed: nothing to say', () => {
    expect(novedadDe([card()], [card()])).toBeNull();
    expect(novedadDe([], [])).toBeNull();
  });

  it('a stamp: her count up, or her stamp of today new', () => {
    expect(novedadDe([card()], [card({ stamps: 4, stamped_today: true })])).toMatchObject({ kind: 'sello', cocina: { id: MARI } });
    expect(novedadDe([card({ stamps: 3 })], [card({ stamps: 3, stamped_today: true })])?.kind).toBe('sello');
  });

  it('a kitchen new to her list with stamps: a card she just started — its conditions follow', () => {
    expect(novedadDe([], [card({ stamps: 1, stamped_today: true })])?.kind).toBe('primer');
  });

  it('a reward new to her list was won; a reward gone from it was claimed — the claim said first', () => {
    expect(novedadDe([card({ stamps: 7 })], [card({ stamps: 0, rewards: [premio('r1')] })])).toMatchObject({ kind: 'gano', premio: { id: 'r1' } });
    expect(novedadDe([card({ rewards: [premio('r1')] })], [card()])).toEqual({ kind: 'cobrado', cocina: { id: MARI, name: 'Fonda Doña Mari' }, premio: 'Una comida corrida' });
    // Her last reward claimed at a kitchen where she had no stamps: the kitchen leaves her list.
    expect(novedadDe([card({ stamps: 0, rewards: [premio('r1')] })], [])?.kind).toBe('cobrado');
    expect(novedadDe([card({ rewards: [premio('r1')] })], [card({ stamps: 4, stamped_today: true })])?.kind).toBe('cobrado');
  });
});

describe('the celebration, on the spot or at her next open (G11, G17)', () => {
  const R1 = 'aaaa0001-0000-4000-8000-000000000001';
  const R2 = 'aaaa0002-0000-4000-8000-000000000002';
  const R3 = 'aaaa0003-0000-4000-8000-000000000003';
  const cards = [card({ rewards: [premio(R1, '2026-11-18T18:00:00Z')] }), card({ id: ESPIGA, name: 'La Espiga', rewards: [premio(R2, '2026-11-19T18:00:00Z', 'Un pan')] })];

  it('the newest reward this phone has not celebrated — every new one marked with it', () => {
    expect(festejoDe(cards, new Set([R1]))).toMatchObject({ cocina: { id: ESPIGA }, premio: { id: R2 }, ids: [R2] });
    expect(festejoDe(cards, new Set([R1, R2]))).toBeNull();
    expect(festejoDe(cards, new Set())?.ids).toEqual([R1, R2]);
    expect(festejoDe([], null)).toBeNull();
  });

  it('⚠️ by id, not by moment: a reward synced late, OLDER than one celebrated, is still celebrated', () => {
    const tarde = [...cards, card({ id: 'x', name: 'Tacos', rewards: [premio(R3, '2026-11-12T18:00:00Z', 'Tacos')] })];
    expect(festejoDe(tarde, new Set([R1, R2]))?.premio.id).toBe(R3);
  });

  it('nothing celebrated on this phone yet: her newest, once — and all she holds then marked', () => {
    expect(festejoDe(cards, null)).toMatchObject({ premio: { id: R2 }, ids: [R1, R2] });
  });

  it('the phone keeps the ids, per login, the last 60', () => {
    const store = memoria();
    expect(festejados(store, 'ana')).toBeNull();
    marcarFestejados(store, 'ana', [R1]);
    marcarFestejados(store, 'ana', [R1, R2]);
    marcarFestejados(store, 'luis', [R3]);
    expect([...(festejados(store, 'ana') ?? [])]).toEqual([R1, R2]);
    expect([...(festejados(store, 'luis') ?? [])]).toEqual([R3]);
    marcarFestejados(store, 'ana', ['not an id']);
    expect(festejados(store, 'ana')?.size).toBe(2);
    const muchos = Array.from({ length: 70 }, (_, n) => `bbbb${String(n).padStart(4, '0')}-0000-4000-8000-000000000000`);
    marcarFestejados(store, 'ana', muchos);
    expect(festejados(store, 'ana')?.size).toBe(60);
    expect(festejados(store, 'ana')?.has(muchos[69])).toBe(true);
    // A phone with no store (node, a full disk) keeps nothing — never a screen that fails; `@/lib/Festejos` guards in memory.
    expect(() => marcarFestejados(undefined, 'ana', [R1])).not.toThrow();
  });
});

describe('a scan’s two rules on *Escanear* (the review of `10.9e-iii`)', () => {
  it('six digits typed are narrowed to the page’s kitchen; a QR, which names its phone, never is', () => {
    expect(cocinaDelEscaneo({ code: '482190', key: null }, MARI)).toBe(MARI);
    expect(cocinaDelEscaneo({ code: '482190', key: LLAVE }, MARI)).toBeNull();
    expect(cocinaDelEscaneo({ code: '482190', key: null }, null)).toBeNull();
  });

  it('a claim ends with any answer but a code that did not fit', () => {
    expect(['cobrado', 'ya_cobrado', 'cerrada', 'propia'].every((r) => terminaElCobro(r as ScanRow['result']))).toBe(true);
    expect(terminaElCobro('no_valido')).toBe(false);
    expect(terminaElCobro('repite')).toBe(false);
  });
});

describe('her phone’s *Mi código* key — one per login, kept on the phone', () => {
  it('kept and read back per login; another login on the phone has its own', () => {
    const store = memoria();
    expect(leerLlave(store, 'ana')).toBeNull();
    guardarLlave(store, 'ana', { key: LLAVE, secret: SECRETO });
    guardarLlave(store, 'luis', { key: '0085bbbb-0000-4000-8000-000000000002', secret: SECRETO });
    expect(leerLlave(store, 'ana')).toEqual({ key: LLAVE, secreto: SECRETO });
    expect(leerLlave(store, 'luis')?.key).toBe('0085bbbb-0000-4000-8000-000000000002');
  });

  it('anything the phone cannot read is none — and a new one is asked', () => {
    const store = memoria();
    store.setItem(LLAVE_KEY, 'not json');
    expect(leerLlave(store, 'ana')).toBeNull();
    store.setItem(LLAVE_KEY, JSON.stringify({ ana: { key: 'not-a-uuid', secreto: SECRETO } }));
    expect(leerLlave(store, 'ana')).toBeNull();
    store.setItem(LLAVE_KEY, JSON.stringify({ ana: { key: LLAVE, secreto: 'short' } }));
    expect(leerLlave(store, 'ana')).toBeNull();
  });
});

describe('*Lo que cada cocina ve de ti* (G42) — what is true today, and no *nunca*', () => {
  const apartado = (id: string, nombre: string) => ({ cocina: { id, nombre } }) as unknown as Apartado;

  it('each kitchen where she reserved or holds a card, cards first; what reaches each', () => {
    const lista = loQueVenDe([apartado(ESPIGA, 'La Espiga'), apartado(MARI, 'Fonda Doña Mari'), apartado(ESPIGA, 'La Espiga')], [card()]);
    expect(lista.map((k) => k.nombre)).toEqual(['Fonda Doña Mari', 'La Espiga']);
    const L = ES.loQueVen;
    // ⚠️ `10.9f`: her visits in its numbers, at every kitchen — where she reserves and where she holds a card; and since
    // `10.9l` her stamps in them too.
    expect(L.cuentas).toBe('Tus visitas y tus sellos, en las cuentas que ve su dueña, sin tu nombre');
    expect(lista[0].lineas).toEqual([L.nombreAmbos, L.calificacion, L.sellos, L.cuentas, L.sigues, L.ubicacion]);
    expect(lista[1].lineas).toEqual([L.nombreApartas, L.calificacion, L.cuentas, L.sigues, L.ubicacion]);
    expect(loQueVenDe([], [card()])[0].lineas).toEqual([L.nombreSello, L.sellos, L.cuentas, L.sigues, L.ubicacion]);
    expect(loQueVenDe(undefined, undefined)).toEqual([]);
  });

  it('no line promises *nunca* (his words of 2026-11-17)', () => {
    for (const texto of Object.values(ES.loQueVen)) expect(texto.toLowerCase()).not.toContain('nunca');
  });
});

describe('before *Eliminar mi cuenta*: what goes of the card', () => {
  it('her rewards still to claim, by kitchen, then her stamps — none, nothing said', () => {
    expect(alEliminarDe([])).toBeNull();
    expect(alEliminarDe([card()])).toBe('Con tu cuenta se borran tus sellos en Fonda Doña Mari.');
    expect(alEliminarDe([card({ stamps: 0, rewards: [premio('r1')] })])).toBe('Con tu cuenta se borra tu premio por cobrar en Fonda Doña Mari.');
    // Stamps where she also has a reward are named too (the review of `10.9e-iii`).
    expect(alEliminarDe([card({ rewards: [premio('r1')] })])).toBe('Con tu cuenta se borra tu premio por cobrar en Fonda Doña Mari. Y tus sellos en Fonda Doña Mari.');
    expect(alEliminarDe([card({ rewards: [premio('r1'), premio('r2')] }), card({ id: ESPIGA, name: 'La Espiga', rewards: [premio('r3')] }), card({ id: 'x', name: 'Tacos El Güero' })])).toBe(
      'Con tu cuenta se borran tus 3 premios por cobrar en Fonda Doña Mari y La Espiga. Y tus sellos en Fonda Doña Mari, La Espiga y Tacos El Güero.',
    );
  });
});
