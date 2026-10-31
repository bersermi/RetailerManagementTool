// ============================================================================
// THE NONCE FOR APPLE'S SHEET, AND THE IDS THE PHONE MAKES. Plan tasks
// `10.4b-iii-a` (the nonce) and `10.4b-iv-a` (a publication's id).
//
// ⚠️ ITS OWN MODULE because `expo-crypto` is native and throws under node: kept
// alone, everything that decides about Apple (`@/auth/apple`) and about a
// publication (`@/api/listing`, which is handed the id) stays loadable by the
// suite — Wera's split (`app/src/lib/ids.ts`).
//
// ⚠️⚠️ THE TWO HALVES GO TO DIFFERENT PLACES. Apple is given the HASH and signs
// it into the token; Supabase is given the RAW string, hashes it itself and
// compares (GoTrue formats that hash as lower-case hex, which is what this digest
// returns). Swap them and every Apple sign-in is refused as a nonce mismatch, on
// a path no check here can drive — it needs a token Apple signed.
// `test/sign-in.test.ts` reads `AuthProvider` as text for the order.
// ============================================================================

import * as Crypto from 'expo-crypto';

/**
 * A new id for a row the phone names — a publication (`publish_listing` takes
 * the phone's id, so a retry is the same row; `10.4b-iv-a`). Version 4, the
 * kind Postgres's `uuid` takes.
 */
export function newId(): string {
  return Crypto.randomUUID();
}

/** A nonce and its SHA-256: `hashed` for Apple, `raw` for Supabase. */
export async function newNoncePair(): Promise<{ readonly raw: string; readonly hashed: string }> {
  const raw = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}
