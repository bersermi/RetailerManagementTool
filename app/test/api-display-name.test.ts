import { describe, expect, it } from 'vitest';

import {
  NOT_A_MEMBER_MARKER,
  SET_MY_DISPLAY_NAME,
  checkDisplayName,
  nameErrorMessage,
  setMyDisplayNameArgs,
  storedNameFrom,
} from '@/api/displayName';
import { MEMBER_COLUMNS, nameOf, nonBlank, type MemberRow } from '@/api/members';
import { ES } from '@/strings';

// ============================================================================
// A PERSON FIXES HER OWN NAME. Plan task 5b.8-iii-b.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER because
// the second half is the more important one — the sentence every `api-*` suite
// here opens with. Every assertion below pins a STRING this app sends to
// PostgREST or a DECISION about what the sheet renders. It proves the app is
// consistent with itself.
//
// IT CANNOT PROVE `0035` AGREES. Nothing in TypeScript has ever read a
// migration: rename `p_display_name` here and every line below stays green
// while a real call comes back `PGRST202` — HTTP 404 — and reaches a cashier as
// a Guardar button that does nothing. THAT is
// `docs/checks/5b.8-iii-b-name-contract.sh`, which puts these exact strings in
// front of a reset database over HTTP with four real people.
//
// ⚠️⚠️ AND ONE THING BELOW IS A COPY OF SOMEBODY ELSE'S PROSE, WHICH IS NORMALLY
// A DEFECT HERE. `NOT_A_MEMBER_MARKER` is matched against a sentence `0035`
// raises, because that migration uses ONE SQLSTATE for two different refusals
// and this screen has to tell them apart. Nothing in this file can notice the
// migration being reworded — assertion 7 of the contract check drives the
// refusal for real and is the only instrument that can.
//
// ⚠️ AND IT CANNOT SEE THE SHEET. §2.11 refuses suites over rendering, so that
// `ajustes.tsx` renders the RETURNED name rather than the text box's contents,
// and that the section is drawn for every role, are the owner's own phone
// (`R9`). The decisions those rest on are here, where an assertion reaches them.
// ============================================================================

const ME = '11111111-1111-4111-8111-111111111111';
const SOMEBODY_ELSE = '22222222-2222-4222-8222-222222222222';

function member(
  user_id: string,
  role: string,
  is_active = true,
  display_name: string | null = null,
): MemberRow {
  return { user_id, role, is_active, display_name };
}

/** A PostgREST error as supabase-js hands it over — code and message, no more. */
function refusal(code: string, message: string): unknown {
  return { code, message, details: null, hint: null };
}

describe('the RPC this app calls, written once', () => {
  it('is set_my_display_name', () => {
    expect(SET_MY_DISPLAY_NAME).toBe('set_my_display_name');
  });

  // ⚠️ THE ONE ASSERTION IN THIS FILE THAT GUARDS A 404 RATHER THAN A SENTENCE.
  // PostgREST matches a function BY ITS PARAMETER NAMES, so these two spellings
  // are a contract and not a convenience. The check that can see the other side
  // of it reads them out of the interface rather than out of this file.
  it('sends the two `p_` names 0035 declared, and nothing else', () => {
    const args = setMyDisplayNameArgs('ws-1', 'Ana');
    expect(Object.keys(args).sort()).toEqual(['p_display_name', 'p_workspace_id']);
  });
});

describe('what the box refuses before it calls', () => {
  it('refuses an empty name', () => {
    expect(checkDisplayName('')).toBe('missing');
  });

  // ⚠️ THE ONE `0035`'s CHECK CONSTRAINT WOULD LET THROUGH AND ITS `btrim` WOULD
  // NOT. `workspace_member_display_name_not_blank` refuses `''` and accepts
  // `' '`; the migration trims first and refuses after, and this is that same
  // rule on this side of the wire.
  it('refuses a name that is only spaces', () => {
    expect(checkDisplayName('   ')).toBe('missing');
  });

  it('accepts a name', () => {
    expect(checkDisplayName('Ana María Rodríguez Gómez')).toBeNull();
  });

  // ⚠️⚠️ THE RULE THIS APP DELIBERATELY DOES NOT HAVE. `display_name` is `text`
  // with a not-blank CHECK and no length limit, so a client rule stricter than
  // the database refuses a name Postgres would have stored — and every suite in
  // this repository would agree with it, because the app and its tests would be
  // wrong together. `5b-ii-b-1`'s check says the same sentence about
  // `locationMissing`.
  it('does not invent a length limit the database does not have', () => {
    expect(checkDisplayName('A'.repeat(500))).toBeNull();
  });
});

describe('the string that was checked is the string that is sent', () => {
  // `redeemArgs`'s rule: normalise on the way in, so a draft that passed the
  // local check cannot be a different value on the wire.
  it('sends the trimmed name', () => {
    expect(setMyDisplayNameArgs('ws-1', '  Ana María  ').p_display_name).toBe('Ana María');
  });

  it('sends the workspace it was given, untouched', () => {
    expect(setMyDisplayNameArgs('ws-1', 'Ana').p_workspace_id).toBe('ws-1');
  });

  // ⚠️ UNREACHABLE FROM THE SHEET, WHICH CALLS `checkDisplayName` FIRST — and
  // written anyway, because the alternative when somebody forgets is the literal
  // word `undefined` stored as a person's name. `''` is the one string `0035`
  // is guaranteed to refuse.
  it('sends the empty string rather than nothing when the name is blank', () => {
    expect(setMyDisplayNameArgs('ws-1', '   ').p_display_name).toBe('');
  });

  // ⚠️ ONE NORMALISER FOR ONE COLUMN. `0035`'s own comment says why: *"two
  // normalisation rules for one column is how the blank gets in by the door the
  // CHECK is not watching."* This is the write side and the read side agreeing
  // by IMPORT rather than by copy, and this assertion is what would notice a
  // second copy appearing.
  it('normalises with the same rule the roster reads names by', () => {
    expect(setMyDisplayNameArgs('ws-1', '  Ana  ').p_display_name).toBe(nonBlank('  Ana  '));
  });
});

describe('what came back is what is rendered', () => {
  it('takes the stored name off the result', () => {
    expect(storedNameFrom('Ana María')).toBe('Ana María');
  });

  // ⚠️⚠️ IT THROWS RATHER THAN FALLING BACK TO WHAT WAS TYPED, and that is the
  // whole reason `0035` returns a value at all (its decision 2). A fallback is
  // the divergence the return exists to prevent, and it is silent: she sees her
  // correction, the shop sees the old name, and nothing disagrees out loud.
  it('refuses a result it cannot parse', () => {
    expect(() => storedNameFrom(null)).toThrow(/expected the stored name/);
    expect(() => storedNameFrom(undefined)).toThrow(/expected the stored name/);
    expect(() => storedNameFrom({ display_name: 'Ana' })).toThrow(/expected the stored name/);
    expect(() => storedNameFrom('')).toThrow(/expected the stored name/);
  });
});

describe('the two SQLSTATEs that mean something else on this call', () => {
  // ⚠️⚠️ `23514` IS `ES.api.errors.nameMissing` APP-WIDE, WHICH IS THE SHOP'S
  // NAME. `0027` raises it on a blank shop name and `0035` raises it on a blank
  // person's name, and telling a cashier to write her shop's name is the app
  // talking about a screen she is not on.
  it('tells a person to write HER name, not her shop\'s', () => {
    const said = nameErrorMessage(refusal('23514', 'a name is required'));
    expect(said).toBe(ES.myName.errors.nameMissing);
    expect(said).not.toBe(ES.api.errors.nameMissing);
  });

  // ⚠️⚠️ BOTH OF `0035`'s REFUSALS ARE `insufficient_privilege`, AND THE MARKER
  // IS THE ONLY THING THAT SEPARATES THEM. This is the distinction the plan row
  // for `5b.8-iii-a` named as this task's job: *"sign in again"* is not *"this
  // is not your shop."*
  it('reads the marker as "you are not in this shop"', () => {
    const said = nameErrorMessage(
      refusal('42501', 'you are not an active member of this shop'),
    );
    expect(said).toBe(ES.myName.errors.notAMember);
  });

  // ⚠️⚠️ AND THE DEFAULT GOES THE OTHER WAY ON PURPOSE. `0035`'s `auth.uid() is
  // null` guard and PostgREST's own grant refusal both raise `42501` with no
  // marker in them. Guessing wrong towards "sign in again" costs one confusing
  // sentence that the next launch corrects; guessing wrong towards "you are not
  // in this shop" tells somebody standing behind her own till that she has been
  // removed from it.
  it('reads a bare 42501 as the session, which is what it is everywhere else', () => {
    const said = nameErrorMessage(
      refusal('42501', 'set_my_display_name requires an authenticated caller'),
    );
    expect(said).toBe(ES.api.errors.sessionEnded);
    expect(said).not.toBe(ES.myName.errors.notAMember);
  });

  it('reads a permission denied from PostgREST as the session too', () => {
    const said = nameErrorMessage(
      refusal('42501', 'permission denied for function set_my_display_name'),
    );
    expect(said).toBe(ES.api.errors.sessionEnded);
  });

  // The marker is a substring and not the sentence, so a migration may reword
  // around it. This is what says it still IS a substring of what `0035` raises —
  // the wire half is assertion 7 of the contract check.
  it('matches a marker that is a substring of the refusal it appears in', () => {
    expect('you are not an active member of this shop').toContain(NOT_A_MEMBER_MARKER);
  });

  // ⚠️ OFFLINE IS THE PILOT STORE'S NORMAL WRITE PATH, so the one sentence a
  // person is most likely to read on this call is the one every other screen
  // gives. Everything unmapped still falls to `@/api/errors`.
  it('leaves everything else to the sentence every other screen gives', () => {
    expect(nameErrorMessage({ message: 'Network request failed' })).toBe(
      ES.api.errors.offline,
    );
    expect(nameErrorMessage(new Error('who knows'))).toBe(ES.api.errors.unknown);
    expect(nameErrorMessage(null)).toBe(ES.api.errors.unknown);
  });
});

describe('the name the section shows is read off the row already in hand', () => {
  it('finds my own stored name', () => {
    const rows = [member(ME, 'staff', true, 'Ana María'), member(SOMEBODY_ELSE, 'owner')];
    expect(nameOf(rows, ME)).toBe('Ana María');
  });

  it('is null when the column is null — the gap this task exists to close', () => {
    expect(nameOf([member(ME, 'staff')], ME)).toBeNull();
  });

  // `0034`'s CHECK makes `''` unreachable from the database. This is the other
  // way in: a cache written by an older build, or a later migration relaxing it.
  it('treats a blank as no name, the way the roster does', () => {
    expect(nameOf([member(ME, 'staff', true, '   ')], ME)).toBeNull();
  });

  it('trims what it returns, so the box is prefilled with what is stored', () => {
    expect(nameOf([member(ME, 'staff', true, '  Ana  ')], ME)).toBe('Ana');
  });

  // ⚠️ A MEMBERSHIP THAT HAS ENDED IS NOT MINE, which is `roleOf`'s rule and
  // `0035`'s: the RPC's own `where` clause carries `and wm.is_active`, so a
  // section prefilled off a deactivated row would offer an edit the database
  // will refuse.
  it('ignores a membership that has ended', () => {
    expect(nameOf([member(ME, 'staff', false, 'Ana')], ME)).toBeNull();
  });

  it('never reads somebody else\'s name', () => {
    expect(nameOf([member(SOMEBODY_ELSE, 'owner', true, 'Rosa')], ME)).toBeNull();
  });

  it('is null while the read is out, and null with no session', () => {
    expect(nameOf(undefined, ME)).toBeNull();
    expect(nameOf(null, ME)).toBeNull();
    expect(nameOf([member(ME, 'staff', true, 'Ana')], null)).toBeNull();
  });

  // ⚠️ THE SECTION MAKES NO READ OF ITS OWN, and this is what says it does not
  // need one: the column it renders is already in the list every member asks
  // for. A read added here would be a second question with the same answer, on
  // a connection the pilot store loses routinely.
  it('needs no column the roster was not already reading', () => {
    expect(MEMBER_COLUMNS.split(',')).toContain('display_name');
  });
});

describe('every word this section says is in ES.myName', () => {
  // R4, and the half of it a typecheck cannot reach: a key that exists but is
  // empty renders a blank line rather than failing to compile.
  it('has a sentence behind every key the screen uses', () => {
    const said = [
      ES.myName.section,
      ES.myName.hint,
      ES.myName.empty,
      ES.myName.edit,
      ES.myName.label,
      ES.myName.placeholder,
      ES.myName.save,
      ES.myName.working,
      ES.myName.cancel,
      ES.myName.issues.missing,
      ES.myName.errors.nameMissing,
      ES.myName.errors.notAMember,
    ];
    for (const sentence of said) expect(sentence.trim().length).toBeGreaterThan(0);
  });

  // ⚠️ THE HINT IS WHERE THE WORKSPACE-SCOPING OF `0035` REACHES A PERSON. The
  // function fixes the name in ONE shop; *"en esta tienda"* is the only honest
  // way to say so to somebody who does not do book-keeping. If the RPC ever fans
  // out over `my_workspaces()`, this sentence is what has to change with it.
  it('says where the name is fixed, because the RPC fixes it in one shop', () => {
    expect(ES.myName.hint).toContain('en esta tienda');
  });
});
