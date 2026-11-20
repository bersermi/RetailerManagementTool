import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { diaTexto } from '@/api/apartados';
import {
  CAMPOS_DEL_SELLO,
  KITCHEN_SEAL_KEYS,
  QUINCE_MINUTOS_MS,
  SELLO_FORMA,
  SELLO_KEY,
  leerSello,
  llavesFrom,
  macDe,
  reservaDeSello,
  revisarSello,
  sealKeysArgs,
  selloKey,
  versionNueva,
  type LlaveDeSello,
} from '@/api/sello';
import { ordenDeSello } from '@/lib/apartados';

// ============================================================================
// HER TICKET'S SEAL, CHECKED ON THE FONDA'S PHONE. Plan task `10.9j-ii-b` (`@/api/sello`; the owner's J2 of
// 2026-11-20). ⚠️ HELD TO THE DATABASE TWO WAYS: (1) a seal `0088` ITSELF MADE (`sello-de-la-base.json`, its
// `made_by`), with the secret the database handed a helper's phone — the app must read it field for field and
// its MAC must fit; and (2) the shape, read out of whichever migration defines `reservation_seal` last (a later
// shape is a new migration, and `cocina-itacate.yml` fires on every migration). The HMAC itself is held to RFC
// 2202's published value, as `@/lib/codigo`'s is to RFC 4226's.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const BASE = JSON.parse(readFileSync(new URL('./sello-de-la-base.json', import.meta.url), 'utf8')) as {
  seal: string;
  secret: string;
  kitchen: string;
  reservation: string;
  code: string;
  pickup_at: string;
  dish: string;
};

/** A function's text as the LAST migration defining it has it. */
function definicion(nombre: string): string {
  const archivos = readdirSync(MIGRATIONS).filter((n) => /^\d{4}_.*\.sql$/.test(n)).sort().reverse();
  for (const archivo of archivos) {
    const sql = readFileSync(join(MIGRATIONS, archivo), 'utf8');
    const at = sql.search(new RegExp(`create (or replace )?function ${nombre.replace('.', '\\.')}\\(`));
    if (at >= 0) return sql.slice(at, sql.indexOf('$$;', sql.indexOf('$$', at) + 2));
  }
  throw new Error(`no migration defines ${nombre}`);
}

const AHORA = new Date(BASE.pickup_at);
const LLAVE: LlaveDeSello = { version: 1, secreto: BASE.secret, hasta: null };

describe('a seal the database made, read and checked by this phone', () => {
  it('read field for field: her reservation, her kitchen, the code, her hour, how she pays and eats, the dish and its price', () => {
    const leido = leerSello(BASE.seal);
    expect(leido).not.toBeNull();
    expect(leido).toMatchObject({
      reservaId: BASE.reservation,
      cocinaId: BASE.kitchen,
      version: 1,
      codigo: BASE.code,
      pago: 'efectivo',
      comer: 'llevar',
      cantidad: 1,
      precioCentavos: 8500,
      desechableCentavos: 500,
      sorpresa: false,
      nombre: BASE.dish,
    });
    expect(leido?.hora.toISOString()).toBe(new Date(BASE.pickup_at).toISOString());
  });

  it('⚠️ its MAC fits under the secret her kitchen’s phone was handed — on this phone, with no signal', () => {
    const leido = leerSello(BASE.seal);
    expect(leido).not.toBeNull();
    expect(macDe(leido!.firmado, BASE.secret)).toBe(leido!.mac);
    expect(revisarSello(leido!, BASE.kitchen, [LLAVE], AHORA)).toBe('valido');
  });

  it('one character changed — the price, the dish, the code — and it is no ticket of hers', () => {
    for (const [de, a] of [['|85.00|', '|65.00|'], ['|647|', '|648|'], ['Pozole', 'Posole'], ['|efectivo|', '|tarjeta|']]) {
      const alterado = leerSello(BASE.seal.replace(de, a));
      expect(alterado, de).not.toBeNull();
      expect(revisarSello(alterado!, BASE.kitchen, [LLAVE], AHORA), de).toBe('noEsSuyo');
    }
  });

  it('another kitchen’s, another secret, a version this phone holds no secret for, or a secret past its day: not hers', () => {
    const leido = leerSello(BASE.seal)!;
    expect(revisarSello(leido, '00000000-0000-4000-8000-000000000000', [LLAVE], AHORA)).toBe('noEsSuyo');
    expect(revisarSello(leido, BASE.kitchen, [{ ...LLAVE, secreto: 'ab'.repeat(20) }], AHORA)).toBe('noEsSuyo');
    expect(revisarSello(leido, BASE.kitchen, [{ ...LLAVE, version: 2 }], AHORA)).toBe('noEsSuyo');
    expect(revisarSello(leido, BASE.kitchen, [], AHORA)).toBe('noEsSuyo');
    const retirada = { ...LLAVE, hasta: new Date(AHORA.getTime() + 60_000) };
    expect(revisarSello(leido, BASE.kitchen, [retirada], AHORA)).toBe('valido');
    expect(revisarSello(leido, BASE.kitchen, [retirada], new Date(AHORA.getTime() + 60_001))).toBe('noEsSuyo');
  });

  it('a version newer than every one this phone holds is one to read again for; an older one is not', () => {
    const leido = leerSello(BASE.seal)!;
    expect(versionNueva(leido, [])).toBe(true);
    expect(versionNueva({ ...leido, version: 3 }, [{ ...LLAVE, version: 2 }])).toBe(true);
    expect(versionNueva(leido, [{ ...LLAVE, version: 2 }])).toBe(false);
    expect(versionNueva(leido, [LLAVE])).toBe(false);
  });
});

describe('what is no seal at all', () => {
  it('another QR, a later shape, a missing field, an id that is not one, a way she cannot pay, an encoding that breaks', () => {
    const f = BASE.seal.split('|');
    const con = (i: number, v: string) => f.map((x, j) => (j === i ? v : x)).join('|');
    for (const texto of [
      'WERA1:v:0085aaaa-0000-4000-8000-000000000001:482190',
      'https://tu-wera.com/cocina/?k=1',
      BASE.seal.replace(/^s1\|/, 's2|'),
      f.slice(0, 13).join('|'),
      `${BASE.seal}|extra`,
      con(1, '0088CCCC000040008000000000000001'),
      con(4, '64'),
      con(5, 'mañana'),
      con(6, 'vales'),
      con(7, 'domicilio'),
      con(8, '1.500'),
      con(9, '0.00'),
      con(11, '2'),
      con(12, 'Pozole%E2%80'),
      con(12, ''),
      con(13, 'zz88b661bce0ff67483c'),
      BASE.seal.replace('Pozole', 'Pozóle'),
      '',
    ]) {
      expect(leerSello(texto), texto).toBeNull();
    }
    expect(leerSello(42)).toBeNull();
    expect(leerSello(null)).toBeNull();
  });

  it('a container price empty is none — a plate eaten there', () => {
    const f = BASE.seal.split('|');
    const aqui = f.map((x, j) => (j === 7 ? 'aqui' : j === 10 ? '' : x)).join('|');
    expect(leerSello(aqui)).toMatchObject({ comer: 'aqui', desechableCentavos: null });
  });
});

describe('the shape, as the migration that defines it last writes it', () => {
  const sql = definicion('servicio.reservation_seal');

  it('`s1` first, then the thirteen fields in `0088`’s order, the name percent-encoded and cut, the MAC its first 10 bytes', () => {
    expect(SELLO_FORMA).toBe('s1');
    expect(CAMPOS_DEL_SELLO).toBe(14);
    const orden = [
      "'s1'",
      "replace(r.id::text, '-', '')",
      "replace(r.workspace_id::text, '-', '')",
      'k.version::text',
      'r.code::text',
      'extract(epoch from r.pickup_at)::bigint::text',
      'r.payment',
      'r.eat',
      'l.quantity::text',
      'l.unit_price::text',
      "coalesce(l.container_price::text, '')",
      "case when l.surprise then '1' else '0' end",
      'servicio.seal_name(l.name)',
    ];
    let desde = sql.indexOf("concat_ws('|',");
    expect(desde).toBeGreaterThan(0);
    for (const parte of orden) {
      const at = sql.indexOf(parte, desde);
      expect(at, parte).toBeGreaterThan(desde);
      desde = at;
    }
    expect(sql).toMatch(/encode\(substring\(extensions\.hmac\(convert_to\(p\.payload, 'UTF8'\), p\.secret, 'sha1'\) from 1 for 10\), 'hex'\)/);
  });

  it('the name: printable ASCII as itself but % and |, every other UTF-8 byte as %XX, at most 120 encoded', () => {
    expect(definicion('servicio.seal_text')).toMatch(/b\.byte between 32 and 126 and b\.byte not in \(37, 124\)/);
    expect(definicion('servicio.seal_name')).toMatch(/c\.run <= 120/);
  });
});

describe('her kitchen’s secrets — `kitchen_seal_keys`, by the database’s names', () => {
  it('the function, its argument and every key read are in the migration that defines it', () => {
    const fn = definicion(`public.${KITCHEN_SEAL_KEYS}`);
    expect(fn).toMatch(/kitchen_seal_keys\(p_workspace_id uuid\)/);
    expect(Object.keys(sealKeysArgs('k'))).toEqual(['p_workspace_id']);
    for (const key of ['workspace_id', 'keys', 'version', 'secret', 'until']) expect(fn, key).toContain(`'${key}'`);
  });

  it('read as the phone keeps them: a key it cannot read left out, never the answer', () => {
    const llaves = llavesFrom({
      workspace_id: BASE.kitchen,
      keys: [
        { version: 2, secret: BASE.secret.toUpperCase(), until: null },
        { version: 1, secret: BASE.secret, until: '2026-11-21T10:00:00+00:00' },
        { version: 0, secret: BASE.secret, until: null },
        { version: 3, secret: 'nope', until: null },
        { version: 4, secret: BASE.secret, until: 'mañana' },
      ],
    });
    expect(llaves).toEqual([
      { version: 2, secreto: BASE.secret, hasta: null },
      { version: 1, secreto: BASE.secret, hasta: new Date('2026-11-21T10:00:00Z') },
    ]);
    expect(llavesFrom(null)).toEqual([]);
    expect(llavesFrom({ keys: 'x' })).toEqual([]);
  });

  it('kept on the phone under the login and the kitchen', () => {
    expect(selloKey('u1', 'k1')).toEqual([...SELLO_KEY, 'u1', 'k1']);
    expect(selloKey('u1', 'k1')).not.toEqual(selloKey('u2', 'k1'));
  });
});

describe('HMAC-SHA1, cut to 10 bytes — RFC 2202’s published values', () => {
  it('test case 1 — a 20-byte key over printable ASCII, the only shape a seal has', () => {
    // RFC 2202 §3, case 1: key 0x0b × 20, "Hi There" → b617318655057264e28bc0b6fb378c8ef146be00.
    expect(macDe('Hi There', '0b'.repeat(20))).toBe('b617318655057264e28b');
    expect(macDe('Hi There', 'nope')).toBeNull();
  });
});

describe('the order a seal says, for an order this phone never read', () => {
  it('what to prepare and charge: the plate and its desechable taken away; none eaten there', () => {
    const leido = leerSello(BASE.seal)!;
    const reserva = reservaDeSello(leido, diaTexto);
    expect(reserva).toMatchObject({
      id: BASE.reservation,
      codigo: BASE.code,
      pago: 'efectivo',
      comer: 'llevar',
      cobroCentavos: 9000,
      desechablesCentavos: 500,
      entregadaEn: null,
      canceladaEn: null,
    });
    expect(reserva.platos).toEqual([{ lineaDeOferta: 0, nombre: BASE.dish, sorpresa: false, cantidad: 1, precioCentavos: 8500, desechableCentavos: 500 }]);
    expect(reserva.guardadaHasta.getTime() - reserva.hora.getTime()).toBe(QUINCE_MINUTOS_MS);
    const aqui = reservaDeSello({ ...leido, comer: 'aqui', desechableCentavos: null }, diaTexto);
    expect(aqui).toMatchObject({ cobroCentavos: 8500, desechablesCentavos: 0 });
  });

  it('still to hand over, or handed over here at its moment — nobody’s name, no thumb', () => {
    const reserva = reservaDeSello(leerSello(BASE.seal)!, diaTexto);
    expect(ordenDeSello(reserva, null)).toMatchObject({ estado: 'apartado', entregadaEn: null, vecino: null, pulgar: null });
    const at = new Date('2026-11-20T15:20:00Z');
    expect(ordenDeSello(reserva, at)).toMatchObject({ estado: 'recogido', entregadaEn: at, entregaEn: at, vecino: null });
  });
});
