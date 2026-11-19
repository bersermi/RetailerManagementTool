import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DIGITOS,
  SEGUNDOS_POR_CODIGO,
  codigoEn,
  comoSeLee,
  digitosDe,
  hmacSha1,
  hotp,
  leerQR,
  pasoDe,
  secretoDe,
  segundosQueQuedan,
  sha1,
  textoDelQR,
} from '@/lib/codigo';

// ============================================================================
// THE LOYALTY CARD'S CODES, AS WERA COCINA WORKS THEM OUT. Plan task `10.9e-i`, on `0085`.
//
// ⚠️ THREE IMPLEMENTATIONS, ONE ALGORITHM: this file's, Itacate's copy, and `0085`'s
// `servicio.hotp`. None is held to another's output written here — each is held to the RFCs'
// published values (the database by its suite's check 1.5), and to the same two values Postgres
// worked out for the 60-second step. What only a phone can say — that the code on the screen is
// the one a scan reads — is the phone's (ADR-035 §2.11).
// ============================================================================

const bytes = (text: string) => new TextEncoder().encode(text);
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const RFC_SECRET = bytes('12345678901234567890');

describe('SHA-1 and HMAC, against their standards', () => {
  it('SHA-1 of "abc", of nothing, and of a message longer than one block (FIPS 180-4, RFC 3174)', () => {
    expect(hex(sha1(bytes('abc')))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(hex(sha1(bytes('')))).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(hex(sha1(bytes('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '84983e441c3bd26ebaae4aa1f95129e5e54670f1',
    );
  });

  it('HMAC-SHA1, RFC 2202 test cases 1, 2 and 6 (a key longer than a block)', () => {
    expect(hex(hmacSha1(new Uint8Array(20).fill(0x0b), bytes('Hi There')))).toBe(
      'b617318655057264e28bc0b6fb378c8ef146be00',
    );
    expect(hex(hmacSha1(bytes('Jefe'), bytes('what do ya want for nothing?')))).toBe(
      'effcdf6ae5eb2fa2d27416d5f184df9c259a7c79',
    );
    expect(
      hex(hmacSha1(new Uint8Array(80).fill(0xaa), bytes('Test Using Larger Than Block-Size Key - Hash Key First'))),
    ).toBe('aa4ae5e15272d00e95705637ce8a3b55ed402112');
  });
});

describe('HOTP and the minute, against the RFCs', () => {
  it('RFC 4226 appendix D: its ten values for the secret 12345678901234567890', () => {
    const want = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
    expect(want.map((_, counter) => hotp(RFC_SECRET, counter))).toEqual(want);
  });

  it('RFC 6238 appendix B, SHA-1, its 30-second step: the last six of its eight digits', () => {
    const rows: Array<[number, string]> = [
      [59, '94287082'],
      [1111111109, '07081804'],
      [1111111111, '14050471'],
      [1234567890, '89005924'],
      [2000000000, '69279037'],
      [20000000000, '65353130'],
    ];
    for (const [seconds, eight] of rows) expect(codigoEn(RFC_SECRET, seconds * 1000, 30), String(seconds)).toBe(eight.slice(2));
  });

  it('our step is one minute, six digits — and Postgres worked out the same two codes (`0085`)', () => {
    expect(SEGUNDOS_POR_CODIGO).toBe(60);
    expect(DIGITOS).toBe(6);
    expect(pasoDe(Date.parse('2026-11-19T00:00:30Z'))).toBe(29917440);
    expect(codigoEn(RFC_SECRET, Date.parse('2026-11-19T00:00:30Z'))).toBe('948991');
    const other = secretoDe('00112233445566778899aabbccddeeff00112233');
    expect(other).not.toBeNull();
    expect(pasoDe(Date.parse('2026-12-01T18:45:59Z'))).toBe(29935845);
    expect(codigoEn(other as Uint8Array, Date.parse('2026-12-01T18:45:59Z'))).toBe('680972');
  });

  it('a minute is one code from its first second to its last; the next second is the next code', () => {
    const start = Date.parse('2026-11-19T17:20:00Z');
    expect(codigoEn(RFC_SECRET, start + 59_999)).toBe(codigoEn(RFC_SECRET, start));
    expect(pasoDe(start + 60_000)).toBe(pasoDe(start) + 1);
    expect(segundosQueQuedan(start)).toBe(60);
    expect(segundosQueQuedan(start + 18_000)).toBe(42);
    expect(segundosQueQuedan(start + 59_999)).toBe(1);
  });
});

describe('what the phone is handed, shows, and reads', () => {
  it('the secret: exactly 40 lower-case hex characters, else nothing', () => {
    expect(secretoDe('3132333435363738393031323334353637383930')).toEqual(RFC_SECRET);
    for (const bad of ['', '31323334', 'ZZ32333435363738393031323334353637383930', null, 42]) {
      expect(secretoDe(bad), String(bad)).toBeNull();
    }
    expect(secretoDe('00112233445566778899aabbccddeeff00112233'.toUpperCase())).toBeNull();
  });

  it('six digits shown as *482 190*, and typed back with or without the space', () => {
    expect(comoSeLee('482190')).toBe('482 190');
    expect(digitosDe(' 482 190 ')).toBe('482190');
    expect(digitosDe('482190')).toBe('482190');
    for (const bad of ['48219', '4821900', '48a190', '']) expect(digitosDe(bad), bad).toBeNull();
  });

  it('the QR says which side, which phone and the code — and reads back only ours', () => {
    const key = '0085aaaa-0000-4000-8000-000000000001';
    expect(textoDelQR('c', key, '482190')).toBe(`WERA1:c:${key}:482190`);
    expect(leerQR(textoDelQR('v', key, '731904'))).toEqual({ lado: 'v', key, code: '731904' });
    for (const bad of [
      'https://tu-wera.com/cocina/?k=x',
      `WERA1:x:${key}:482190`,
      `WERA1:c:not-a-key:482190`,
      `WERA1:c:${key}:48219`,
      `WERA2:c:${key}:482190`,
    ]) {
      expect(leerQR(bad), bad).toBeNull();
    }
  });
});

describe('held to `0085`’s text', () => {
  const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));
  const file = readdirSync(MIGRATIONS).find((f) => f.startsWith('0085_'));
  const sql = readFileSync(join(MIGRATIONS, file as string), 'utf8').replace(/\s+/g, ' ');

  it('the database works its code out the same way: HMAC-SHA1 of the minute, 8 bytes, the low nibble of byte 19, six digits', () => {
    expect(sql).toContain("v_mac bytea := extensions.hmac(int8send(p_counter), p_secret, 'sha1');");
    expect(sql).toContain('v_off integer := get_byte(v_mac, 19) & 15;');
    expect(sql).toContain('% 1000000)::text, 6, \'0\')');
    expect(sql).toContain('select floor(extract(epoch from p_at) / 60)::bigint');
  });

  it('and a code lives its minute and the one before (G16)', () => {
    expect(sql).toContain('select p_code = servicio.hotp(p_secret, servicio.code_minute(p_at))');
    expect(sql).toContain('or p_code = servicio.hotp(p_secret, servicio.code_minute(p_at) - 1)');
  });

  it('a phone is handed 20 bytes as 40 hex characters', () => {
    expect(sql).toContain("extensions.gen_random_bytes(20)");
    expect(sql).toContain("'secret', encode(v_key.secret, 'hex')");
  });
});
