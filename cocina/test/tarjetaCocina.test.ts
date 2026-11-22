import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';

import type { CardRow, KitchenCardRow, TodayRow } from '@/api/tarjeta';
import { cartelHtml, direccionDeCocina, escapar, NOMBRE_EN_ENLACE, qrSvg, RUTA_DE_COCINA, SITIO, type DatosDelCartel } from '@/lib/cartel';
import { codigoEn, secretoDe, textoDelQR } from '@/lib/codigo';
import { guardarLlave, leerLlave, LLAVES_KEY } from '@/lib/llave';
import { MARGEN_QR, matrizQR } from '@/lib/qr';
import {
  SELLOS,
  avisoAlEliminar,
  borradorDe,
  cambiaEn,
  condicionesDe,
  conTarjeta,
  cuentasDe,
  deHoy,
  momentoDeLaLlamada,
  dio,
  diasDeTexto,
  diasQueCaben,
  direccionCorta,
  diaDeTexto,
  ejemploDeDias,
  empujarDias,
  enVivoDe,
  esOtro,
  escaneoDe,
  escaneoId,
  fichaDeDias,
  lineaDe,
  premiosDe,
  previaDe,
  resultadoDe,
  resumenDe,
  revisarBorrador,
  seLee,
  soloDigitos,
  tarjetaErrorMessage,
  tarjetaGuardada,
  tarjetaViva,
  tecleadoDe,
  textoDeDias,
} from '@/lib/tarjeta';
import type { DeviceStore } from '@/lib/store';
import { ES } from '@/strings';
import { NADA } from '@/api/servicios';
import { cocinaDelEnlace, RUTA_DE_COCINA as RUTA_DE_ITACATE, SITIO as SITIO_DE_ITACATE } from '../../itacate/src/lib/enlaces';

// ============================================================================
// THE LOYALTY CARD IN WERA COCINA — EVERY RULE ITS SCREENS DRAW. Plan task `10.9e-ii`, on `0085`'s
// answers. The screens themselves no check can see (ADR-035 §2.11); what they say is here, in Mexico
// City's zone (the dates a kitchen reads).
// ============================================================================

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const code = (rel: string) => readFileSync(join(ROOT, 'src', rel), 'utf8');
const require = createRequire(import.meta.url);

let antes: string | undefined;
beforeAll(async () => {
  antes = process.env.TZ;
  process.env.TZ = 'America/Mexico_City';
  const wasm = readFileSync(require.resolve('zxing-wasm/reader/zxing_reader.wasm'));
  await prepareZXingModule({ overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) }, fireImmediately: true });
});
afterAll(() => {
  if (antes === undefined) delete process.env.TZ;
  else process.env.TZ = antes;
});

const AHORA = new Date('2026-11-19T23:00:00Z'); // 17:00 in Mexico City
const TERMS = { reward: 'Una comida corrida', stamps: 8, expiry_days: 30, since: '2026-11-19T18:00:00Z' };

function card(over: Partial<KitchenCardRow> = {}): KitchenCardRow {
  return { terms: TERMS, open: true, closed_at: null, kept_until: null, cards: 23, stamps_today: 6, rewards_to_give: 0, today: [], ...over };
}

function memoria(): DeviceStore & { readonly datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return { datos, getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => void datos.set(k, v), removeItem: (k) => void datos.delete(k) };
}

const KEY = '0b0e4c3a-5d8e-4f1a-9c2b-7e6d5c4b3a21';
const PREMIO = '7f3e2d1c-0b9a-4876-a543-210fedcba987';
const COCINA = '11111111-2222-4333-8444-555555555555';

describe('the setup — on one screen, nothing pre-chosen (G34)', () => {
  it('4 to 12 stamps; a first setup is empty, a change starts from the terms the card has', () => {
    expect(SELLOS).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(borradorDe(null)).toEqual({ premio: '', sellos: null, dias: null });
    expect(borradorDe(TERMS)).toEqual({ premio: 'Una comida corrida', sellos: 8, dias: 30 });
    // *Nunca* is the database's null, the phone's 0.
    expect(borradorDe({ ...TERMS, expiry_days: null }).dias).toBe(0);
  });

  it('asks what is missing in the order the screen asks it — the page’s three sentences', () => {
    expect(revisarBorrador({ premio: '  ', sellos: 8, dias: 0 })).toBe('Escribe qué les das al completarla.');
    expect(revisarBorrador({ premio: 'x'.repeat(61), sellos: 8, dias: 0 })).toBe('Escribe qué les das al completarla.');
    expect(revisarBorrador({ premio: 'Un café', sellos: null, dias: 0 })).toBe('Elige cuántos sellos.');
    expect(revisarBorrador({ premio: 'Un café', sellos: 13, dias: 0 })).toBe('Elige cuántos sellos.');
    expect(revisarBorrador({ premio: 'Un café', sellos: 6, dias: null })).toBe('Elige cuándo se borran sus sellos.');
    expect(revisarBorrador({ premio: 'Un café', sellos: 6, dias: 0 })).toBeNull();
  });

  it('the preview draws a hint until she chooses — 8 and *Tu premio*, never sent', () => {
    expect(previaDe({ premio: '', sellos: null, dias: null })).toEqual({ premio: 'Tu premio', sellos: 8, dias: 0 });
    expect(previaDe({ premio: ' Un café ', sellos: 5, dias: 15 })).toEqual({ premio: 'Un café', sellos: 5, dias: 15 });
  });

  it('the conditions name the kitchen as the one who promises, with its address (G12, G41)', () => {
    expect(condicionesDe('Fonda Doña Mari', 'Sabino 52, Santa María la Ribera', 8, 'Una comida corrida', 30)).toBe(
      'Junta 8 sellos en Fonda Doña Mari y te dan una comida corrida. Un sello por visita, uno al día. ' +
        'Tus sellos se borran si pasa un mes sin que vengas. La promesa es de Fonda Doña Mari, Sabino 52, Santa María la Ribera.',
    );
    expect(condicionesDe('Fonda Doña Mari', null, 6, 'Un café', 0)).toContain('Tus sellos no se borran. La promesa es de Fonda Doña Mari.');
    expect(direccionCorta({ street: ' Sabino ', number: '52', colonia: 'Santa María la Ribera' })).toBe('Sabino 52, Santa María la Ribera');
    expect(direccionCorta({ street: '', number: '', colonia: 'X' })).toBeNull();
  });
});

describe('when her stamps are erased — the chips and *Otro…*, typed (`10.9k`, the owner’s rulings of 2026-11-19)', () => {
  it('the chips, nothing pre-chosen: Nunca · 2 semanas · 1 mes · 2 meses · 3 meses, kept as 0, 14, 30, 60, 90 — then Otro…', () => {
    expect([0, 14, 30, 60, 90].map(textoDeDias)).toEqual(['Nunca', '2 semanas', '1 mes', '2 meses', '3 meses']);
    expect(ES.prepararTarjeta.otro).toBe('Otro…');
    expect(borradorDe(null).dias).toBeNull();
    expect(fichaDeDias(null)).toBeNull();
    expect(esOtro(null)).toBe(false);
  });

  it('a typed 14, 30, 60 or 90 chooses its own chip; any other number is Otro…, reading *21 días*, chosen', () => {
    for (const d of [0, 14, 30, 60, 90]) {
      expect(fichaDeDias(d)).toBe(d);
      expect(esOtro(d)).toBe(false);
    }
    expect(fichaDeDias(21)).toBeNull();
    expect(esOtro(21)).toBe(true);
    expect(textoDeDias(21)).toBe('21 días');
    expect(textoDeDias(365)).toBe('365 días');
  });

  it('a card set up on 15 or 45 days before `10.9k` reopens as Otro…, its days kept; days out of range are none chosen', () => {
    expect(borradorDe({ ...TERMS, expiry_days: 45 }).dias).toBe(45);
    expect(esOtro(borradorDe({ ...TERMS, expiry_days: 15 }).dias)).toBe(true);
    expect(textoDeDias(15)).toBe('15 días');
    expect(borradorDe({ ...TERMS, expiry_days: 7 }).dias).toBeNull();
    expect(revisarBorrador({ premio: 'Un café', sellos: 6, dias: 21 })).toBeNull();
    expect(revisarBorrador({ premio: 'Un café', sellos: 6, dias: 13 })).toBe('Elige cuándo se borran sus sellos.');
  });

  it('the box: digits only, three at most, no decimals or sign; empty is none', () => {
    expect(soloDigitos('21')).toBe('21');
    expect(soloDigitos('2.5')).toBe('25');
    expect(soloDigitos('-14')).toBe('14');
    expect(soloDigitos('1234')).toBe('123');
    expect(soloDigitos(' 3 0 ')).toBe('30');
    expect(diasDeTexto('')).toBeNull();
    expect(diasDeTexto('021')).toBe(21);
  });

  it('Listo waits until it fits: 14 to 365; out of range is said in words', () => {
    expect([13, 14, 365, 366].map(diasQueCaben)).toEqual([false, true, true, false]);
    expect(diasQueCaben(null)).toBe(false);
    expect(ES.prepararTarjeta.hojaDias.rango(14, 365)).toBe('Elige de 14 a 365 días.');
    expect(ES.prepararTarjeta.hojaDias.titulo).toBe('¿Cuántos días sin venir?');
  });

  it('− / + nudge by one day, held to 14…365; from an empty box, the shortest', () => {
    expect(empujarDias(21, 1)).toBe(22);
    expect(empujarDias(21, -1)).toBe(20);
    expect(empujarDias(14, -1)).toBe(14);
    expect(empujarDias(365, 1)).toBe(365);
    expect(empujarDias(null, 1)).toBe(14);
    expect(empujarDias(null, -1)).toBe(14);
    expect(empujarDias(3, 1)).toBe(14);
    expect(empujarDias(999, -1)).toBe(365);
  });

  it('the live line and the example date, as drawn: 21 days from 19 November is 10 December', () => {
    const vivo = ES.prepararTarjeta.hojaDias.vivo(21);
    expect(`${vivo.antes}${vivo.cuanto}${vivo.despues}`).toBe('Se borran si pasan 21 días sin venir.');
    expect(vivo.cuanto).toBe('21 días');
    const mes = ES.prepararTarjeta.hojaDias.vivo(30);
    expect(`${mes.antes}${mes.cuanto}${mes.despues}`).toBe('Se borran si pasa un mes sin venir.');
    expect(ejemploDeDias(21, new Date('2026-11-19T18:00:00Z'))).toBe('Si su último sello fuera hoy, se borrarían el 10 de diciembre.');
    // Late at night in Mexico City it is still the 19th there.
    expect(ejemploDeDias(14, new Date('2026-11-20T05:30:00Z'))).toBe('Si su último sello fuera hoy, se borrarían el 3 de diciembre.');
    expect(ejemploDeDias(365, new Date('2026-11-19T18:00:00Z'))).toBe('Si su último sello fuera hoy, se borrarían el 19 de noviembre.');
  });

  it('what a neighbour reads, for each choice — the conditions and the card’s line', () => {
    expect(ES.condiciones.seBorran(14)).toBe('Tus sellos se borran si pasan 2 semanas sin que vengas.');
    expect(ES.condiciones.seBorran(30)).toBe('Tus sellos se borran si pasa un mes sin que vengas.');
    expect(ES.condiciones.seBorran(60)).toBe('Tus sellos se borran si pasan 2 meses sin que vengas.');
    expect(ES.condiciones.seBorran(90)).toBe('Tus sellos se borran si pasan 3 meses sin que vengas.');
    expect(ES.condiciones.seBorran(21)).toBe('Tus sellos se borran si pasan 21 días sin que vengas.');
    expect(ES.condiciones.seBorran(45)).toBe('Tus sellos se borran si pasan 45 días sin que vengas.');
    expect(ES.tarjeta.venceSiNoVienen(21)).toBe('Los sellos se borran si pasan 21 días sin venir');
    expect(ES.tarjeta.venceSiNoVienen(30)).toBe('Los sellos se borran si pasa un mes sin venir');
    expect(ES.tarjeta.venceSiNoVienen(14)).toBe('Los sellos se borran si pasan 2 semanas sin venir');
  });
});

describe('the card’s state — its tile, its counts, closed and kept (G12)', () => {
  it('read while Wera offers it, or before what Wera offers is read', () => {
    expect(seLee(undefined)).toBe(true);
    expect(seLee(NADA)).toBe(false);
    expect(seLee({ ...NADA, ofrecidos: ['tarjeta'] })).toBe(true);
  });

  it('the tile: stamps today, then the rewards to give with its dot, else the cards going', () => {
    expect(enVivoDe(card(), AHORA)).toEqual({ valor: '6 sellos hoy', detalle: '23 tarjetas activas', porHacer: false });
    expect(enVivoDe(card({ stamps_today: 1, rewards_to_give: 2 }), AHORA)).toEqual({ valor: '1 sello hoy', detalle: '2 premios por entregar', porHacer: true });
    expect(enVivoDe(card({ cards: 1 }), AHORA)?.detalle).toBe('1 tarjeta activa');
    // Not set up, or unread: the first-time state.
    expect(enVivoDe(card({ terms: null }), AHORA)).toBeNull();
    expect(enVivoDe(undefined, AHORA)).toBeNull();
  });

  it('⚠️ closed, it stays while its 30 days run — then it is over', () => {
    const cerrada = card({ open: false, closed_at: '2026-11-18T18:00:00Z', kept_until: '2026-12-18T18:00:00Z' });
    expect(tarjetaGuardada(cerrada, AHORA)).toBe(true);
    expect(tarjetaViva(cerrada, AHORA)).toBe(true);
    expect(enVivoDe(cerrada, AHORA)).toEqual({ valor: '6 sellos hoy', detalle: 'Cerrada · la completan hasta el 18 de diciembre', porHacer: false });
    const pasada = new Date('2026-12-19T00:00:00Z');
    expect(tarjetaGuardada(cerrada, pasada)).toBe(false);
    expect(enVivoDe(cerrada, pasada)).toBeNull();
    expect(tarjetaGuardada(card(), AHORA)).toBe(false);
  });

  it('three counts, each word in its number', () => {
    expect(cuentasDe(card({ cards: 1, stamps_today: 0, rewards_to_give: 2 }))).toEqual([
      { n: 1, que: 'tarjeta activa' },
      { n: 0, que: 'sellos hoy' },
      { n: 2, que: 'premios por entregar' },
    ]);
  });

  it('⚠️ G23: before deleting the kitchen, who holds her card — and nothing with nobody', () => {
    expect(avisoAlEliminar(card({ cards: 0, rewards_to_give: 0 }))).toBeNull();
    expect(avisoAlEliminar(undefined)).toBeNull();
    expect(avisoAlEliminar(card({ cards: 5, rewards_to_give: 1 }))).toBe(
      '5 vecinos juntan sellos en tu tarjeta y hay 1 premio por entregar. Con la cocina se borran sus sellos y sus premios.',
    );
    expect(avisoAlEliminar(card({ cards: 0, rewards_to_give: 2 }))).toBe('Hay 2 premios por entregar. Con la cocina se borran sus sellos y sus premios.');
  });

  it('a day she reads: an instant, or the kitchen’s `YYYY-MM-DD` as that very day', () => {
    expect(diaDeTexto('2026-12-18')).toBe('18 de diciembre');
    expect(diaDeTexto('2026-12-01T05:00:00Z')).toBe('30 de noviembre'); // 23:00 the night before in Mexico City
    expect(diaDeTexto(null)).toBeNull();
    expect(diaDeTexto('nada')).toBeNull();
  });
});

describe('Sellar — its code and today’s lines (G16, G19)', () => {
  it('*Cambia en 0:42*, and *1:00* at the minute’s first second', () => {
    expect(cambiaEn(Date.parse('2026-11-19T23:00:18Z'))).toBe('0:42');
    expect(cambiaEn(Date.parse('2026-11-19T23:00:00Z'))).toBe('1:00');
    expect(cambiaEn(Date.parse('2026-11-19T23:00:59Z'))).toBe('0:01');
  });

  it('each line as the page draws it — who, what, the hour; a reward claimed says *entrégaselo*', () => {
    const base: TodayRow = { at: '2026-11-19T23:12:00Z', kind: 'sello', name: 'Ana R.', stamps: 3, of: 8, reward: null, via: 'su_codigo' };
    expect(lineaDe(base)).toMatchObject({ quien: 'Ana R.', que: 'sello 3 de 8', detalle: '17:12', entregar: false });
    expect(lineaDe({ ...base, kind: 'gano', stamps: 8 })).toMatchObject({ que: 'completó su tarjeta' });
    expect(lineaDe({ ...base, kind: 'cobro', reward: 'Una comida corrida', via: 'codigo_cocina' })).toMatchObject({
      que: 'cobra su premio: una comida corrida',
      detalle: '17:12 · entrégaselo',
      entregar: true,
    });
    expect(lineaDe({ ...base, via: 'entrega' }).detalle).toBe('17:12 · al entregar su apartado');
    // Her account deleted: the database sends no name.
    expect(lineaDe({ ...base, name: null }).quien).toBe('Alguien');
  });

  it('the screen works its code out on the phone — the QR names this phone and side, the digits change every minute', () => {
    const sellar = code('app/(cocina)/sellar.tsx');
    expect(sellar).toContain("textoDelQR('c', estado.llave.key, codigo)");
    expect(sellar).toContain('codigoEn(secreto, ahora.getTime())');
    expect(sellar).toContain('useAhora(1_000)');
    // Read every five seconds only while it is the screen in front (the review of `10.9e-ii`).
    expect(sellar).toContain('vivo: enFrente');
    expect(sellar).toMatch(/if \(enFrente && reciente && /);
  });
});

describe('a scan — her code, or six digits typed (G10, G16)', () => {
  const EN = new Date('2026-11-19T23:00:05Z');

  it('a neighbour’s QR, with the reward her *Cobras: …* names; a kitchen’s code, or anything else, is none', () => {
    expect(escaneoDe(textoDelQR('v', KEY, '731904'), EN)).toEqual({ code: '731904', key: KEY, premio: null, en: EN });
    expect(escaneoDe(textoDelQR('v', KEY, '731904', PREMIO), EN)).toEqual({ code: '731904', key: KEY, premio: PREMIO, en: EN });
    expect(escaneoDe(textoDelQR('c', KEY, '482190'), EN)).toBeNull();
    expect(escaneoDe('https://tu-wera.com/cocina/?k=x', EN)).toBeNull();
    // A reward is a neighbour's alone: a kitchen's code never carries one.
    expect(textoDelQR('c', KEY, '482190', PREMIO)).toBe(`WERA1:c:${KEY}:482190`);
  });

  it('six digits typed name no phone and no reward', () => {
    expect(tecleadoDe('731 904', EN)).toEqual({ code: '731904', key: null, premio: null, en: EN });
    expect(tecleadoDe('7319', EN)).toBeNull();
  });

  it('⚠️ one send per scan: the same code read twice is one; a reward names its reward', () => {
    const a = escaneoDe(textoDelQR('v', KEY, '731904'), EN)!;
    expect(escaneoId(a)).toBe(escaneoId({ ...a, en: new Date(EN.getTime() + 2_000) }));
    expect(escaneoId(a)).not.toBe(escaneoId({ ...a, premio: PREMIO }));
    expect(escaneoId(tecleadoDe('731904', EN)!)).toBe('tecleado:731904:sello');
  });

  it('*Ana R. · 5 de 8 · 2 premios*, and her rewards to pick from, newest first', () => {
    const suya: CardRow = {
      result: 'suya',
      name: 'Ana R.',
      stamps: 5,
      of: 8,
      rewards: [
        { id: 'r2', reward: 'Una comida corrida', won_at: '2026-11-05T22:00:00Z' },
        { id: 'r1', reward: 'Un agua fresca', won_at: '2026-10-28T22:00:00Z' },
      ],
    };
    expect(resumenDe(suya)).toBe('5 de 8 · 2 premios');
    expect(resumenDe({ ...suya, rewards: [] })).toBe('5 de 8');
    expect(premiosDe(suya)).toEqual([
      { id: 'r2', que: 'Una comida corrida', cuando: 'Ganado el 5 de noviembre' },
      { id: 'r1', que: 'Un agua fresca', cuando: 'Ganado el 28 de octubre' },
    ]);
  });

  it('every answer `0085` writes, in words — and which gave what the scan was for', () => {
    const r = (over: Partial<CardRow>): CardRow => ({ result: 'sello', name: 'Ana R.', stamps: 6, of: 8, ...over });
    expect(resultadoDe(r({ result: 'suya' }))).toBeNull();
    expect(resultadoDe(r({ result: 'primer', stamps: 1 }))).toEqual({ texto: 'Primer sello de Ana R. aquí · 1 de 8', tono: 'bien' });
    expect(resultadoDe(r({}))).toEqual({ texto: 'Sello para Ana R. · 6 de 8', tono: 'bien' });
    expect(resultadoDe(r({ result: 'gano', stamps: 0, rewards: [{ id: 'x', reward: 'Una comida corrida', won_at: '2026-11-19T23:00:00Z' }] }))).toEqual({
      texto: 'Ana R. completó su tarjeta: ganó una comida corrida',
      tono: 'bien',
    });
    expect(resultadoDe(r({ result: 'ya_hoy' }))?.tono).toBe('nada');
    expect(resultadoDe(r({ result: 'cobrado', claimed: 'Una comida corrida' }))?.texto).toBe('Le diste una comida corrida a Ana R.');
    expect(resultadoDe(r({ result: 'ya_usado' }))?.texto).toContain('próximo minuto');
    for (const result of ['cerrada', 'propia', 'no_valido', 'repite'] as const) expect(resultadoDe(r({ result }))?.tono).toBe('mal');
    expect(dio(r({}))).toBe(true);
    expect(dio(r({ result: 'ya_hoy' }))).toBe(false);
    expect(dio(r({ result: 'ya_cobrado' }))).toBe(true);
    // Her card stays on the screen unless the code named nobody she can be shown as.
    expect(conTarjeta(r({ result: 'no_valido' }))).toBe(false);
    expect(conTarjeta(r({ result: 'propia' }))).toBe(false);
    expect(conTarjeta(r({ result: 'cerrada' }))).toBe(true);
  });

  it('a refusal in words — `22023` read by what was sent', () => {
    expect(tarjetaErrorMessage({ code: 'TD028' })).toBe(ES.tarjetaErrores.demasiados);
    expect(tarjetaErrorMessage({ code: 'TD024' })).toBe(ES.tarjetaErrores.noDisponible);
    expect(tarjetaErrorMessage({ code: 'TD027' })).toBe(ES.tarjetaErrores.noEsSuPremio);
    expect(tarjetaErrorMessage({ code: '22023', message: 'set_card_terms: 4 to 12 stamps' }, 'terminos')).toBe(ES.tarjetaErrores.terminos);
    expect(tarjetaErrorMessage({ code: '22023', message: 'give_stamp: a scan more than 7 days old' })).toBe(ES.tarjetaErrores.viejo);
    expect(tarjetaErrorMessage({ code: '22023', message: 'give_stamp: a code is six digits' })).toBe(ES.tarjetaErrores.codigo);
    expect(tarjetaErrorMessage({ code: '42501', message: "set_card_terms: only the kitchen's owner sets its card" })).toBe(ES.tarjetaErrores.soloLaDuena);
  });

  it('⚠️ every call is at the scan’s moment, and a scan with no signal goes to the queue (`@/api/hooks`)', () => {
    const hooks = code('api/hooks.ts');
    expect(hooks).toContain('giveStamp(stampArgs(kitchenId as string, e.code, e.key, momentoDeLaLlamada(e, new Date())))');
    expect(hooks).toContain('giveReward(rewardArgs(kitchenId as string, e.code, premio, e.key, momentoDeLaLlamada(e, new Date())))');
    expect(hooks).toContain("hacer: () => encolarEnvio({ tipo: 'sello', ...base(e), codigo: e.code, llave: e.key })");
    // The same scan again with no signal: never queued twice, and a reward not handed over again.
    expect(hooks).toContain("if (cola.envios.some((e) => e.usuario === userId && e.reserva === encolar.id)) return { tipo: 'yaEnCola' };");
    // Whose code it is cannot be read with no signal: no queue for it.
    expect(hooks).toContain('buscar: (e: Escaneo) => llamar(() => cardOfCode(codeArgs(kitchenId as string, e.code, e.key)), null)');
    // Her *Cobras: …* code: that reward, at once.
    const escanear = code('app/(cocina)/escanear.tsx');
    expect(escanear).toContain('if (escaneo.premio !== null) return despues(t, escaneo, await darPremio(escaneo, escaneo.premio)');
    // One neighbour at a time: an answer that comes back after *Escanear a otro cliente* is dropped.
    expect(escanear).toContain("if (t !== turno.current || r.tipo === 'ocupado') return;");
    // One reward a scan: once given, *Entregar premio* goes.
    expect(escanear).toContain('{premios.length > 0 && !paso.premioDado && (');
  });

  it('⚠️ `p_at` with signal: the database’s clock within a minute of the scan, the scan’s moment after', () => {
    const e = tecleadoDe('731904', EN)!;
    expect(momentoDeLaLlamada(e, new Date(EN.getTime() + 59_000))).toBeNull();
    expect(momentoDeLaLlamada(e, new Date(EN.getTime() + 60_000))).toBe(EN.toISOString());
  });

  it('⚠️ a copy read on another day says nothing of today — no stamps, no lines', () => {
    const leida = card({ stamps_today: 6, today: [{ at: '2026-11-19T23:12:00Z', kind: 'sello', name: 'Ana R.', stamps: 3, of: 8, reward: null, via: 'su_codigo' }] });
    const hoy = new Date('2026-11-19T23:30:00Z');
    expect(deHoy(leida, Date.parse('2026-11-19T23:20:00Z'), hoy)).toBe(leida);
    // Read at 23:50 Mexico City yesterday, opened at 00:10 today:
    const manana = new Date('2026-11-20T06:10:00Z');
    expect(deHoy(leida, Date.parse('2026-11-20T05:50:00Z'), manana)).toMatchObject({ stamps_today: 0, today: [], cards: 23 });
    expect(deHoy(undefined, null, hoy)).toBeUndefined();
  });
});

describe('this phone’s key — asked once, kept per login and kitchen', () => {
  const row = { key: KEY, secret: '00112233445566778899aabbccddeeff00112233' };

  it('kept and read back; another login, another kitchen, or a broken blob is none', () => {
    const store = memoria();
    expect(leerLlave(store, 'u1', 'k1')).toBeNull();
    expect(guardarLlave(store, 'u1', 'k1', row)).toEqual({ key: KEY, secreto: row.secret });
    expect(leerLlave(store, 'u1', 'k1')).toEqual({ key: KEY, secreto: row.secret });
    expect(leerLlave(store, 'u2', 'k1')).toBeNull();
    expect(leerLlave(store, 'u1', 'k2')).toBeNull();
    guardarLlave(store, 'u1', 'k2', { ...row, key: PREMIO });
    expect(leerLlave(store, 'u1', 'k1')?.key).toBe(KEY);
    store.datos.set(LLAVES_KEY, '{');
    expect(leerLlave(store, 'u1', 'k1')).toBeNull();
    store.datos.set(LLAVES_KEY, JSON.stringify({ 'u1:k1': { key: KEY, secreto: 'corto' } }));
    expect(leerLlave(store, 'u1', 'k1')).toBeNull();
    expect(leerLlave(undefined, 'u1', 'k1')).toBeNull();
  });

  it('the kept secret works the same code the database would (RFC 6238 over the minute)', () => {
    const secreto = secretoDe(row.secret) as Uint8Array;
    // RFC 6238's appendix B, SHA-1, at 59 s with a 30 s step is 94287082; ours is six digits over 60 s — held in `codigo.test.ts`.
    expect(codigoEn(secreto, 59_000)).toMatch(/^\d{6}$/);
  });

  it('⚠️ asked once — never on each open, which would drop her other phones’ codes (`0085` keeps three)', () => {
    const hooks = code('api/hooks.ts');
    expect(hooks).toMatch(/const kept = leerLlave\(deviceStore\(\), userId, kitchenId\);\s*if \(kept !== null\) \{\s*setLlave\(kept\);\s*return;\s*\}/);
  });
});

describe('the counter poster (G35) — her kitchen’s, its QR her address on tu-wera.com', () => {
  const datos: DatosDelCartel = {
    id: COCINA,
    nombre: 'Fonda Doña <Mari> & "hijas"',
    iniciales: 'DM',
    color: '#B23A2B',
    logo: null,
    direccion: 'Sabino 52, Santa María la Ribera',
    tarjeta: { sellos: 8, premio: 'Una comida corrida' },
  };

  it('⚠️ the address `10.9c` ruled — and Itacate reads her id back out of it', () => {
    expect(SITIO).toBe(SITIO_DE_ITACATE);
    expect(RUTA_DE_COCINA).toBe(RUTA_DE_ITACATE);
    const enlace = direccionDeCocina(COCINA, 'Fonda Doña Mari');
    expect(enlace).toBe(`https://tu-wera.com/cocina/?k=${COCINA}&n=Fonda%20Do%C3%B1a%20Mari`);
    expect(cocinaDelEnlace(enlace)).toBe(COCINA);
    expect(decodeURIComponent(direccionDeCocina(COCINA, 'x'.repeat(80)).split('&n=')[1])).toHaveLength(NOMBRE_EN_ENLACE);
  });

  it('its QR, read back out of the SVG’s rectangles, is the grid — and a real reader decodes it', async () => {
    const enlace = direccionDeCocina(COCINA, 'Fonda Doña Mari');
    const svg = qrSvg(enlace, 288);
    const matriz = matrizQR(enlace);
    const n = matriz.length + MARGEN_QR * 2;
    const pintado = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
    for (const m of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/g)) {
      const [x, y, w] = [Number(m[1]), Number(m[2]), Number(m[3])];
      for (let i = 0; i < w; i += 1) pintado[y][x + i] = true;
    }
    for (let f = 0; f < n; f += 1)
      for (let c = 0; c < n; c += 1) {
        const dentro = f >= MARGEN_QR && c >= MARGEN_QR && f < n - MARGEN_QR && c < n - MARGEN_QR;
        expect(pintado[f][c]).toBe(dentro ? matriz[f - MARGEN_QR][c - MARGEN_QR] : false);
      }
    const px = 4;
    const data = new Uint8ClampedArray(n * px * n * px * 4).fill(255);
    for (let y = 0; y < n * px; y += 1)
      for (let x = 0; x < n * px; x += 1)
        if (pintado[Math.floor(y / px)][Math.floor(x / px)]) {
          const i = (y * n * px + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
    const leidos = await readBarcodes({ data, width: n * px, height: n * px, colorSpace: 'srgb' } as unknown as ImageData, { formats: ['QRCode'], tryHarder: true });
    expect(leidos.filter((r) => r.isValid).map((r) => r.text)).toEqual([enlace]);
  });

  // ⚠️ `13.2`: G35's *"minimize the exposure of wera"* met the owner's ruling of 2026-11-22 (*Itacate se vuelve
  // Wera*): the small line that named the neighbours' app now names it as *Wera* — once, small, and nowhere else.
  it('her name, her terms, her address and *en Wera* — escaped, and the word *Wera* once, in that small line', () => {
    const html = cartelHtml(datos);
    // Written out by hand, never by the function under test.
    expect(html).toContain('Fonda Doña &lt;Mari&gt; &amp; &quot;hijas&quot;');
    expect(html).not.toMatch(/<Mari|Mari>/);
    expect(escapar(`<a href='x'>&`)).toBe('&lt;a href=&#39;x&#39;&gt;&amp;');
    expect(html).toContain('Junta 8 sellos y llévate una comida corrida');
    expect(html).toContain('Escanéalo con tu cámara');
    expect(html).toContain('Sabino 52, Santa María la Ribera');
    expect(html).toContain('<div class="itacate">en Wera</div>');
    expect(html).toContain('background: #B23A2B');
    expect(html.match(/wera/gi)).toEqual(['Wera']);
    // Her initials with no logo; her logo, a data URI only.
    expect(html).toContain('<div class="logo ini">DM</div>');
    expect(cartelHtml({ ...datos, logo: 'data:image/jpeg;base64,AAAA' })).toContain('<img class="logo" src="data:image/jpeg;base64,AAAA"');
    expect(cartelHtml({ ...datos, logo: 'https://otro.sitio/x.png' })).not.toContain('otro.sitio');
    // Closed or not set up: no card on it.
    expect(cartelHtml({ ...datos, tarjeta: null })).toContain('Mira lo que hay hoy');
    // A colour that is not a hue is not written into the style.
    expect(cartelHtml({ ...datos, color: 'red;}body{display:none' })).not.toContain('display:none');
  });
});
