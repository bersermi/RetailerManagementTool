// ============================================================================
// THE NONCE FOR APPLE'S SHEET. Plan task `10.4b-iii-a`.
//
// ⚠️ ITS OWN MODULE because `expo-crypto` is native and throws under node: kept
// alone, everything that decides about Apple (`@/auth/apple`) stays loadable by
// the suite — Wera's split (`app/src/lib/ids.ts`).
//
// ⚠️⚠️ THE TWO HALVES GO TO DIFFERENT PLACES. Apple is given the HASH and signs
// it into the token; Supabase is given the RAW string, hashes it itself and
// compares (GoTrue formats that hash as lower-case hex, which is what this digest
// returns). Swap them and every Apple sign-in is refused as a nonce mismatch, on
// a path no check here can drive — it needs a token Apple signed.
// `test/apple.test.ts` reads `AuthProvider` as text for the order.
// ============================================================================

import * as Crypto from 'expo-crypto';

/** A nonce and its SHA-256: `hashed` for Apple, `raw` for Supabase. */
export async function newNoncePair(): Promise<{ readonly raw: string; readonly hashed: string }> {
  const raw = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}
