// ============================================================================
// THE LOYALTY CARD'S CODES — six digits that change every minute, worked out on the phone with no
// signal. Plan task `10.9e-i`, on `0085`'s `servicio.hotp` (the owner's rulings G10 and G16 of
// 2026-11-16: QR both ways, the kitchen's code *changing every minute*, working with no signal, a
// code living its minute and the one before, six digits typed when the camera fails).
//
// RFC 4226's HOTP — HMAC-SHA1 of a counter, dynamically truncated to six digits — with the minute
// since the epoch as the counter: RFC 6238's TOTP with a 60-second step. The database checks a code
// with the same algorithm, so this file, its twin in Itacate (`itacate/src/lib/codigo.ts`, held to
// this one by `itacate/test/gemelos.test.ts`) and `0085` are each held to the RFCs' published
// values: if the three agree with the RFCs, they agree with each other.
//
// ⚠️ PLAIN TYPESCRIPT, NO MODULE: SHA-1 and HMAC are written out below, because a crypto package is
// a dependency, and a dependency moves the three apps' shared `node_modules` (the root CLAUDE.md).
// SHA-1 is HOTP's own hash; its weakness to collisions does not reach HMAC.
//
// ⚠️ THE QR CARRIES MORE THAN THE SIX DIGITS: which side shows it, the phone's key and the code
// (`WERA1:c:<key>:<code>` for a kitchen's phone, `WERA1:v:<key>:<code>` for a neighbour's), so a
// scan names its one phone (`p_key`) and six digits typed are tried against every phone of that
// side. ⚠️ `10.9e-ii`: HER *COBRAS: …* CODE NAMES THE REWARD SHE CHOSE as a fifth part
// (`WERA1:v:<key>:<code>:<reward>`, a neighbour's alone), so the kitchen's scan gives that one at
// once (`give_reward`'s `p_reward_id`) — with no signal too, from its queue. Six digits typed name
// no reward: the kitchen picks (*¿Cuál le das?*).
// ============================================================================

/** How long a code lives on the screen: one minute (G16). The database's `code_minute`. */
export const SEGUNDOS_POR_CODIGO = 60;

/** Six digits, as the screen shows them and as a person types them. */
export const DIGITOS = 6;

// ---- SHA-1 (FIPS 180-4) ------------------------------------------------------------------------

function rotl(x: number, n: number): number {
  return (x << n) | (x >>> (32 - n));
}

export function sha1(message: Uint8Array): Uint8Array {
  const length = message.length;
  const total = Math.ceil((length + 9) / 64) * 64;
  const padded = new Uint8Array(total);
  padded.set(message);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = length * 8;
  view.setUint32(total - 8, Math.floor(bits / 0x100000000));
  view.setUint32(total - 4, bits >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let offset = 0; offset < total; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 80; i += 1) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i += 1) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const t = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30) >>> 0;
      b = a;
      a = t;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => outView.setUint32(i * 4, h));
  return out;
}

// ---- HMAC (RFC 2104) ---------------------------------------------------------------------------

export function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const block = new Uint8Array(64);
  block.set(key.length > 64 ? sha1(key) : key);
  const inner = new Uint8Array(64 + message.length);
  const outer = new Uint8Array(64 + 20);
  for (let i = 0; i < 64; i += 1) {
    inner[i] = block[i] ^ 0x36;
    outer[i] = block[i] ^ 0x5c;
  }
  inner.set(message, 64);
  outer.set(sha1(inner), 64);
  return sha1(outer);
}

// ---- HOTP (RFC 4226) and the minute (RFC 6238) ---------------------------------------------------

/** Six digits for a counter: HMAC-SHA1 of its 8 bytes, big-endian; dynamic truncation (RFC 4226 §5.3). */
export function hotp(secret: Uint8Array, counter: number): string {
  const message = new Uint8Array(8);
  const view = new DataView(message.buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const mac = hmacSha1(secret, message);
  const offset = mac[19] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 10 ** DIGITOS).padStart(DIGITOS, '0');
}

/** The counter for a moment, in milliseconds: the step since the epoch (the database's `code_minute`). */
export function pasoDe(ms: number, segundos: number = SEGUNDOS_POR_CODIGO): number {
  return Math.floor(ms / 1000 / segundos);
}

/** The code a phone shows at a moment. */
export function codigoEn(secret: Uint8Array, ms: number, segundos: number = SEGUNDOS_POR_CODIGO): string {
  return hotp(secret, pasoDe(ms, segundos));
}

/** Seconds until the code changes — *Cambia en 0:42*. From 1 to 60. */
export function segundosQueQuedan(ms: number): number {
  const enElPaso = Math.floor(ms / 1000) % SEGUNDOS_POR_CODIGO;
  return SEGUNDOS_POR_CODIGO - enElPaso;
}

/** The secret the database hands a phone once — 40 hex characters — as bytes; null for anything else. */
export function secretoDe(hex: unknown): Uint8Array | null {
  if (typeof hex !== 'string' || !/^[0-9a-f]{40}$/.test(hex)) return null;
  const out = new Uint8Array(20);
  for (let i = 0; i < 20; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Six digits as the screen shows them: *482 190*. */
export function comoSeLee(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** What a person typed, as six digits — spaces allowed between them — or null. */
export function digitosDe(typed: string): string | null {
  const digits = typed.replace(/\s/g, '');
  return /^[0-9]{6}$/.test(digits) ? digits : null;
}

// ---- the QR ------------------------------------------------------------------------------------

/** Which phone shows it: `c` a kitchen's (*Sellar*), `v` a neighbour's (*Mi código*). */
export type Lado = 'c' | 'v';

export interface CodigoLeido {
  readonly lado: Lado;
  readonly key: string;
  readonly code: string;
  /** The reward her *Cobras: …* screen names — a neighbour's QR alone, and only then. */
  readonly premio?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** What the QR says: the side, the phone's key and the code — and, on her *Cobras: …*, the reward she chose. */
export function textoDelQR(lado: Lado, key: string, code: string, premio: string | null = null): string {
  return premio === null || lado !== 'v' ? `WERA1:${lado}:${key}:${code}` : `WERA1:${lado}:${key}:${code}:${premio}`;
}

/** A scanned QR read back; null for anything that is not one of ours. */
export function leerQR(text: string): CodigoLeido | null {
  const parts = text.trim().split(':');
  if ((parts.length !== 4 && parts.length !== 5) || parts[0] !== 'WERA1') return null;
  const [, lado, key, code, premio] = parts;
  if ((lado !== 'c' && lado !== 'v') || !UUID.test(key) || !/^[0-9]{6}$/.test(code)) return null;
  if (premio === undefined) return { lado, key, code };
  if (lado !== 'v' || !UUID.test(premio)) return null;
  return { lado, key, code, premio };
}
