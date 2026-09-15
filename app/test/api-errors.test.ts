import { describe, expect, it } from 'vitest';

import { KNOWN_API_CODES, apiErrorKey, apiErrorMessage, isContractMismatch } from '@/api/errors';
import { ES } from '@/strings';

// ============================================================================
// WHAT A FAILED CALL BECOMES ON A SHOPKEEPER'S SCREEN. Plan task 5b-i.
//
// ⚠️ EVERY CODE ASSERTED HERE WAS MEASURED AGAINST THE APPLIED SCHEMA ON
// 2026-09-14, over HTTP, not recalled from what PostgREST usually does:
//
//     23514     `{"code":"23514","message":"workspace display name is required"}`  400
//     42501     `{"code":"42501","message":"permission denied for function onboard_workspace"}` 401
//     PGRST202  `Could not find the function public.onboard_workspace(display_name)` 404
//     PGRST301  `{"code":"PGRST301","message":"JWT cryptographic operation failed"}` 401
//
// That matters because a table of codes is exactly the kind of thing that is
// plausible and wrong: `42501` for a missing grant is a guess anyone would make
// and it happens to be right, and `PGRST202` for a wrong ARGUMENT NAME rather
// than a missing function is the one nobody guesses.
// ============================================================================

describe('nothing PostgREST says ever reaches a shopkeeper', () => {
  it('answers with a sentence from ES.api.errors and nothing else', () => {
    const sentences = Object.values(ES.api.errors);
    for (const error of [
      { code: '23514', message: 'workspace display name is required' },
      { code: '42501', message: 'permission denied for function onboard_workspace' },
      { code: 'PGRST301', message: 'JWT cryptographic operation failed' },
      { code: 'PGRST202', message: 'Could not find the function public.onboard_workspace' },
      new TypeError('Network request failed'),
      { nothing: 'recognisable' },
      null,
      'a string somebody threw',
    ]) {
      expect(sentences).toContain(apiErrorMessage(error));
    }
  });

  it('never puts the English message on the screen', () => {
    const english = 'permission denied for function onboard_workspace';
    expect(apiErrorMessage({ code: '42501', message: english })).not.toContain(english);
  });
});

describe('the codes that were measured', () => {
  it('reads a blank shop name as the thing to fix', () => {
    expect(apiErrorKey({ code: '23514' })).toBe('nameMissing');
  });

  // ⚠️ THE GRANT ON `onboard_workspace` IS TO `authenticated` ONLY (0001), so a
  // session that has gone is a PERMISSION error from Postgres and not an auth
  // error from GoTrue. It is the one API failure with a next step a person can
  // take, which is why it is the one that names it.
  it('reads both spellings of a session that is gone as the same event', () => {
    expect(apiErrorKey({ code: '42501' })).toBe('sessionEnded');
    expect(apiErrorKey({ code: 'PGRST301' })).toBe('sessionEnded');
    expect(apiErrorMessage({ code: '42501' })).toBe(ES.api.errors.sessionEnded);
  });

  // ⚠️ THE PILOT STORE IS OFFLINE A LOT — offline is the normal write path here,
  // not the exception — so a call made with no signal must say so rather than
  // fall to the catch-all a person can do nothing with.
  it('recognises no signal in both shapes it arrives in', () => {
    expect(apiErrorKey(new TypeError('Network request failed'))).toBe('offline');
    expect(apiErrorKey({ message: 'fetch failed' })).toBe('offline');
    expect(apiErrorKey({ name: 'AuthRetryableFetchError' })).toBe('offline');
  });

  it('admits it does not know, rather than inventing a cause', () => {
    expect(apiErrorKey({ code: '23505', message: 'duplicate key value' })).toBe('unknown');
    expect(apiErrorKey(null)).toBe('unknown');
    expect(apiErrorKey(undefined)).toBe('unknown');
    expect(apiErrorKey('a string somebody threw')).toBe('unknown');
  });

  it('knows exactly the codes it claims to know', () => {
    expect([...KNOWN_API_CODES].sort()).toEqual(['23514', '42501', 'PGRST301']);
  });
});

// ============================================================================
// ⚠️⚠️ THE ONE THAT IS NOT A SHOPKEEPER'S PROBLEM. `PGRST202` means this app and
// the database disagree about what an RPC is called or what its arguments are —
// OUR mistake, deployed. It must read as the honest catch-all on the screen and
// as a named failure in the console, because it is the one class of error that
// must be FIXED rather than retried, and a helpful Spanish sentence would hide
// exactly that.
// ============================================================================
describe('the app and the database disagreeing', () => {
  it('is recognised as ours, from either spelling', () => {
    expect(isContractMismatch({ code: 'PGRST202' })).toBe(true);
    expect(isContractMismatch({ code: 'PGRST204' })).toBe(true);
  });

  it('is not confused with anything a shopkeeper caused', () => {
    expect(isContractMismatch({ code: '23514' })).toBe(false);
    expect(isContractMismatch({ code: '42501' })).toBe(false);
    expect(isContractMismatch(new TypeError('Network request failed'))).toBe(false);
    expect(isContractMismatch(null)).toBe(false);
  });

  it('still says the honest nothing on the screen', () => {
    expect(apiErrorMessage({ code: 'PGRST202' })).toBe(ES.api.errors.unknown);
  });
});
