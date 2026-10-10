import { describe, expect, it } from 'vitest';

import {
  DELETE_MY_ACCOUNT,
  NAME_MISMATCH_CODE,
  deleteArgs,
  deleteErrorMessage,
  deletedFrom,
  deletionFrom,
  formerMemberName,
  shopNameMatches,
} from '@/api/account';
import type { RosterEntry } from '@/api/members';
import { ES } from '@/strings';

// `5R-c`. What the screen must decide before the tap: which warning, whether the
// typed name matches, and what is sent. The server decides again (`0053`), and
// `docs/checks/5R-c-account-deletion-contract.sh` drives that over HTTP.

function entry(userId: string, role: RosterEntry['role'], isSelf: boolean, text: string): RosterEntry {
  return { userId, role, isSelf, identity: { kind: isSelf ? 'self' : 'name', text } };
}

const ME_OWNER = entry('u1', 'owner', true, ES.members.you);
const ME_STAFF = entry('u1', 'staff', true, ES.members.you);
const ANA = entry('u2', 'manager', false, 'Ana');
const BETO = entry('u3', 'staff', false, 'Beto');
const CO_OWNER = entry('u4', 'owner', false, 'Chela');

describe('which warning', () => {
  it('knows nothing while the roster is out — no warning is better than the wrong one', () => {
    expect(deletionFrom([ME_OWNER, ANA], true)).toEqual({ kind: 'unknown' });
  });

  it('knows nothing when the caller is not in the list', () => {
    expect(deletionFrom([ANA, BETO], false)).toEqual({ kind: 'unknown' });
  });

  it('a cashier or a manager leaves; the shop stays', () => {
    expect(deletionFrom([ME_STAFF, ANA], false)).toEqual({ kind: 'leaves' });
  });

  it('a co-owner leaves; the other owner keeps the shop', () => {
    expect(deletionFrom([ME_OWNER, CO_OWNER, BETO], false)).toEqual({ kind: 'leaves' });
  });

  it('the only owner takes the shop with them, and is shown who loses access', () => {
    expect(deletionFrom([ME_OWNER, ANA, BETO], false)).toEqual({
      kind: 'deletesShop',
      losesAccess: ['Ana', 'Beto'],
    });
  });

  it('the only owner alone in the shop is told nobody else loses access', () => {
    expect(deletionFrom([ME_OWNER], false)).toEqual({ kind: 'deletesShop', losesAccess: [] });
  });
});

describe('the typed shop name', () => {
  it('matches the way normalize_name compares — case and spacing fold', () => {
    expect(shopNameMatches('  tienda   DOÑA lupe ', 'Tienda Doña Lupe')).toBe(true);
  });

  it('does not fold accents, exactly as the server does not', () => {
    expect(shopNameMatches('Tienda Dona Lupe', 'Tienda Doña Lupe')).toBe(false);
  });

  it('refuses an empty box, whatever the shop is called', () => {
    expect(shopNameMatches('   ', 'Tienda Doña Lupe')).toBe(false);
  });
});

describe('what is sent', () => {
  it('names the RPC 0053 created', () => {
    expect(DELETE_MY_ACCOUNT).toBe('delete_my_account');
  });

  it('sends the typed name only when the shop goes with the account', () => {
    expect(deleteArgs({ kind: 'deletesShop', losesAccess: [] }, 'Tienda')).toEqual({ p_shop_name: 'Tienda' });
    expect(deleteArgs({ kind: 'leaves' }, 'Tienda')).toEqual({ p_shop_name: null });
  });

  it('reads the answer, and zeros for anything that is not it', () => {
    expect(deletedFrom({ shops_deleted: 1, shops_left: 0 })).toEqual({ shopsDeleted: 1, shopsLeft: 0 });
    expect(deletedFrom(null)).toEqual({ shopsDeleted: 0, shopsLeft: 0 });
  });
});

describe('what she is told', () => {
  it('a wrong shop name is its own sentence, not "something broke"', () => {
    expect(NAME_MISMATCH_CODE).toBe('TD007');
    expect(deleteErrorMessage({ code: 'TD007', message: 'x' })).toBe(ES.account.errors.nameMismatch);
  });

  it('anything else falls to the app-wide table', () => {
    expect(deleteErrorMessage({ code: '42501', message: 'x' })).toBe(ES.api.errors.sessionEnded);
  });
});

describe('a former member, wherever the records name them', () => {
  it('keeps the name and says they left', () => {
    expect(formerMemberName('María')).toBe('María (ex-miembro)');
  });

  it('says a person did it even with no name', () => {
    expect(formerMemberName(null)).toBe('Ex-miembro');
    expect(formerMemberName('  ')).toBe('Ex-miembro');
  });
});
