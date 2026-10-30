import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_OWNERS_KEY,
  APPLE_REVOKE,
  APPLE_REVOKE_REGION,
  APPLE_REVOKE_TIMEOUT_MS,
  DELETE_MY_ACCOUNT,
  NAME_MISMATCH_CODE,
  OWNER_COLUMNS,
  OWNER_ROLE,
  OWNERS_TABLE,
  businessesThatGo,
  confirmWords,
  deleteArgs,
  deleteErrorMessage,
  deletedFrom,
  deletionFrom,
  formerMemberName,
  namesReady,
  revokeBody,
  shopNameMatches,
  typedLabel,
  type Business,
  type OwnerRow,
} from '@/api/account';
import type { RosterEntry } from '@/api/members';
import { ES } from '@/strings';

// `5R-c`. What the screen must decide before the tap: which warning, whether the
// typed name matches, and what is sent. The server decides again (`0053`, and
// `0073` since `10.4b-i`), and `docs/checks/5R-c-account-deletion-contract.sh`
// drives that over HTTP.

function entry(userId: string, role: RosterEntry['role'], isSelf: boolean, text: string): RosterEntry {
  return { userId, role, isSelf, identity: { kind: isSelf ? 'self' : 'name', text } };
}

const ME_OWNER = entry('u1', 'owner', true, ES.members.you);
const ME_STAFF = entry('u1', 'staff', true, ES.members.you);
const ANA = entry('u2', 'manager', false, 'Ana');
const BETO = entry('u3', 'staff', false, 'Beto');
const CO_OWNER = entry('u4', 'owner', false, 'Chela');

const SHOP: Business = { id: 'w-shop', name: 'Abarrotes Lupita', kind: 'tienda' };
const KITCHEN: Business = { id: 'w-kitchen', name: 'Fonda Lupita', kind: 'cocina' };

/** The deletion as Ajustes asks it, with the shop `w-shop` open. */
function inAjustes(goes: readonly Business[] | null, roster: readonly RosterEntry[], rosterLoading = false) {
  return deletionFrom({ goes, openShopId: SHOP.id, roster, rosterLoading });
}

describe('which warning', () => {
  it('knows nothing while the read of what goes is out — no warning is better than the wrong one', () => {
    expect(inAjustes(null, [ME_OWNER, ANA])).toEqual({ kind: 'unknown' });
  });

  it('knows nothing while the roster is out, with a shop open', () => {
    expect(inAjustes([SHOP], [ME_OWNER, ANA], true)).toEqual({ kind: 'unknown' });
  });

  it('knows nothing when the caller is not in the shop\'s list', () => {
    expect(inAjustes([SHOP], [ANA, BETO])).toEqual({ kind: 'unknown' });
  });

  it('a cashier or a manager leaves; the shop stays', () => {
    expect(inAjustes([], [ME_STAFF, ANA])).toEqual({ kind: 'leaves' });
  });

  it('a co-owner leaves; the other owner keeps the shop', () => {
    expect(inAjustes([], [ME_OWNER, CO_OWNER, BETO])).toEqual({ kind: 'leaves' });
  });

  it('the only owner takes the shop with them, and is shown who loses access', () => {
    expect(inAjustes([SHOP], [ME_OWNER, ANA, BETO])).toEqual({
      kind: 'deletesShop',
      shop: SHOP,
      losesAccess: ['Ana', 'Beto'],
    });
  });

  it('the only owner alone in the shop is told nobody else loses access', () => {
    expect(inAjustes([SHOP], [ME_OWNER])).toEqual({ kind: 'deletesShop', shop: SHOP, losesAccess: [] });
  });
});

// `10.4b-i` (`0073`), the owner's ruling of 2026-10-29: every business named,
// each one's name typed.
describe('when more than the shop open here goes', () => {
  it('the only owner of the shop and a kitchen: both named, the shop first, its people listed', () => {
    expect(inAjustes([KITCHEN, SHOP], [ME_OWNER, ANA])).toEqual({
      kind: 'deletesBusinesses',
      businesses: [SHOP, KITCHEN],
      losesAccess: ['Ana'],
      leavesHere: false,
    });
  });

  it('a co-owner of the shop who alone owns a kitchen: she leaves the shop, and the kitchen goes', () => {
    expect(inAjustes([KITCHEN], [ME_OWNER, CO_OWNER])).toEqual({
      kind: 'deletesBusinesses',
      businesses: [KITCHEN],
      losesAccess: [],
      leavesHere: true,
    });
  });

  it('on the welcome screen, where no shop is open: a kitchen goes, or nothing does', () => {
    const welcome = (goes: readonly Business[] | null) =>
      deletionFrom({ goes, openShopId: null, roster: [], rosterLoading: false });
    expect(welcome([KITCHEN])).toEqual({
      kind: 'deletesBusinesses',
      businesses: [KITCHEN],
      losesAccess: [],
      leavesHere: false,
    });
    expect(welcome([])).toEqual({ kind: 'leaves' });
    expect(welcome(null)).toEqual({ kind: 'unknown' });
  });
});

describe('what goes with the account, from the owners read', () => {
  const row = (workspace: string, user: string, name: string | null, kind = 'tienda'): OwnerRow => ({
    workspace_id: workspace,
    user_id: user,
    workspace: name === null ? null : { display_name: name, kind },
  });

  it('asks the table, the columns and the role written once here (R13)', () => {
    expect(OWNERS_TABLE).toBe('workspace_member');
    expect(OWNER_COLUMNS).toBe('workspace_id,user_id,workspace(display_name,kind)');
    expect(OWNER_ROLE).toBe('owner');
    expect(ACCOUNT_OWNERS_KEY).toEqual(['account', 'owners']);
  });

  it('is not known while the read is out, or with nobody signed in', () => {
    expect(businessesThatGo(undefined, 'u1')).toBeNull();
    expect(businessesThatGo([], null)).toBeNull();
  });

  it('every business she alone owns, of either kind, shops first — never one she shares or only works in', () => {
    const rows = [
      row('w-kitchen', 'u1', 'Fonda Lupita', 'cocina'),
      row('w-shop', 'u1', 'Abarrotes Lupita'),
      row('w-shared', 'u1', 'Abarrotes Socias'),
      row('w-shared', 'u4', 'Abarrotes Socias'),
      row('w-other', 'u9', 'Tienda de otra'),
    ];
    expect(businessesThatGo(rows, 'u1')).toEqual([SHOP, KITCHEN]);
  });

  it('a business of hers whose name cannot be read makes the answer unknown, never a guess', () => {
    expect(businessesThatGo([row('w-shop', 'u1', null)], 'u1')).toBeNull();
  });
});

describe('the typed names', () => {
  it('match the way normalize_name compares — case and spacing fold', () => {
    expect(shopNameMatches('  tienda   DOÑA lupe ', 'Tienda Doña Lupe')).toBe(true);
  });

  it('do not fold accents, exactly as the server does not', () => {
    expect(shopNameMatches('Tienda Dona Lupe', 'Tienda Doña Lupe')).toBe(false);
  });

  it('refuse an empty box, whatever the shop is called', () => {
    expect(shopNameMatches('   ', 'Tienda Doña Lupe')).toBe(false);
  });

  it('need every box to match its own business before the button is offered', () => {
    const both = inAjustes([SHOP, KITCHEN], [ME_OWNER]);
    expect(namesReady(both, { 'w-shop': 'abarrotes lupita' })).toBe(false);
    expect(namesReady(both, { 'w-shop': 'Fonda Lupita', 'w-kitchen': 'Abarrotes Lupita' })).toBe(false);
    expect(namesReady(both, { 'w-shop': 'abarrotes lupita', 'w-kitchen': ' FONDA lupita' })).toBe(true);
    expect(namesReady({ kind: 'leaves' }, {})).toBe(true);
    expect(namesReady({ kind: 'unknown' }, {})).toBe(false);
  });

  it('are asked for each business by its kind', () => {
    expect(typedLabel(SHOP)).toBe(ES.account.typeShopName('Abarrotes Lupita'));
    expect(typedLabel(KITCHEN)).toBe(ES.account.typeKitchenName('Fonda Lupita'));
  });
});

describe('what is sent', () => {
  it('names the RPC 0053 created', () => {
    expect(DELETE_MY_ACCOUNT).toBe('delete_my_account');
  });

  it('⚠️ a one-shop deletion sends today\'s body, byte for byte — the new list is absent, not null', () => {
    const one = inAjustes([SHOP], [ME_OWNER]);
    expect(deleteArgs(one, { 'w-shop': 'Abarrotes Lupita' })).toStrictEqual({ p_shop_name: 'Abarrotes Lupita' });
    expect(JSON.stringify(deleteArgs(one, { 'w-shop': 'x' }))).toBe('{"p_shop_name":"x"}');
  });

  it('somebody who only leaves sends null, as before', () => {
    expect(deleteArgs({ kind: 'leaves' }, { 'w-shop': 'Tienda' })).toStrictEqual({ p_shop_name: null });
  });

  it('several businesses: one typed name for each, in the order shown, and the old argument empty', () => {
    const both = inAjustes([KITCHEN, SHOP], [ME_OWNER]);
    expect(deleteArgs(both, { 'w-kitchen': 'Fonda Lupita', 'w-shop': 'Abarrotes Lupita' })).toStrictEqual({
      p_shop_name: null,
      p_business_names: ['Abarrotes Lupita', 'Fonda Lupita'],
    });
  });

  it('the button says what goes', () => {
    expect(confirmWords({ kind: 'leaves' })).toBe(ES.account.confirm);
    expect(confirmWords(inAjustes([SHOP], [ME_OWNER]))).toBe(ES.account.confirmShop);
    expect(confirmWords(inAjustes([KITCHEN], [ME_OWNER, CO_OWNER]))).toBe(ES.account.confirmKitchen);
    expect(confirmWords(inAjustes([SHOP, KITCHEN], [ME_OWNER]))).toBe(ES.account.confirmBusinesses);
  });

  it('reads the answer, and zeros for anything that is not it', () => {
    expect(deletedFrom({ shops_deleted: 1, shops_left: 0 })).toEqual({ shopsDeleted: 1, shopsLeft: 0 });
    expect(deletedFrom(null)).toEqual({ shopsDeleted: 0, shopsLeft: 0 });
  });
});

// `5R-k`. The one call that is not to Postgres. This pins what the app SENDS;
// that the function reads the same key is
// `docs/checks/5R-k-apple-revoke-contract.sh`, against the real edge runtime.
describe('telling Apple', () => {
  it('names the function the repository deploys', () => {
    expect(APPLE_REVOKE).toBe('apple-revoke');
  });

  it('sends the code under the one key the function reads', () => {
    expect(revokeBody('c0de')).toEqual({ code: 'c0de' });
  });

  // The aviso says data is handled in the United States, and the database is
  // in us-west-2. An unpinned function runs wherever is nearest the phone.
  it('runs where the database is', () => {
    expect(APPLE_REVOKE_REGION).toBe('us-west-2');
  });

  it('does not hold a deletion up for long', () => {
    expect(APPLE_REVOKE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(APPLE_REVOKE_TIMEOUT_MS).toBeLessThanOrEqual(20000);
  });
});

describe('what she is told', () => {
  it('a wrong shop name is its own sentence, not "something broke"', () => {
    expect(NAME_MISMATCH_CODE).toBe('TD007');
    expect(deleteErrorMessage({ code: 'TD007', message: 'x' })).toBe(ES.account.errors.nameMismatch);
  });

  it('with a name for each business, the same refusal means the list changed', () => {
    const args = { p_shop_name: null, p_business_names: ['Abarrotes Lupita', 'Fonda Lupita'] };
    expect(deleteErrorMessage({ code: 'TD007', message: 'x' }, args)).toBe(ES.account.errors.listChanged);
    expect(deleteErrorMessage({ code: 'TD007', message: 'x' }, { p_shop_name: 'x' })).toBe(
      ES.account.errors.nameMismatch,
    );
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
