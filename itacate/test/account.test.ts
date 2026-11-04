import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  APPLE_CLIENT_ID,
  APPLE_REVOKE,
  APPLE_REVOKE_REGION,
  APPLE_REVOKE_TIMEOUT_MS,
  DELETE_MY_ACCOUNT,
  NAME_MISMATCH_CODE,
  OWNERS_KEY,
  OWNER_ACTIVE_COLUMN,
  OWNER_COLUMNS,
  OWNER_ROLE,
  OWNER_ROLE_COLUMN,
  OWNERS_TABLE,
  businessesThatGo,
  confirmWords,
  deleteArgs,
  deleteErrorMessage,
  deletedFrom,
  deletionFrom,
  nameMatches,
  namesReady,
  normalizedName,
  ownersKey,
  revokeBody,
  takesAShop,
  typedLabel,
  type Business,
  type OwnerRow,
} from '@/api/account';
import { KNOWN_API_CODES, apiErrorKey, apiErrorMessage } from '@/api/errors';
import { APPLE_PROVIDER, asksAppleFirst, hasAppleIdentity, releaseStep } from '@/auth/apple';
import { ES } from '@/strings';
import { ES as WERA } from '../../app/src/strings';
import { ES as COCINA } from '../../cocina/src/strings';

// ============================================================================
// HER WAY OUT. Plan task `10.5-iii-b`.
//
// ⚠️ ITACATE'S COPIES OF WERA COCINA'S RULES (`cocina/src/api/account.ts`, pinned
// by `cocina/test/account.test.ts`; `cocina/src/auth/apple.ts` the same), which
// are Wera's (`app/src/api/account.ts`, `app/test/api-account.test.ts`), cut to
// an app where no business is open — the owner's ruling of 2026-11-04, *Wera
// Cocina's way, cut to Itacate*. What must not drift between the three apps is
// held here AGAINST WERA'S FILES, as Wera Cocina holds its own: the words (one
// login, one deletion), and the function's name and region (one function).
//
// ⚠️ WHAT ONLY A REAL DATABASE AND THE REAL FUNCTION CAN SAY — that the owners
// read and the deletion's names reach the schema as this app sends them, and
// that `apple-revoke` signs for this app's id — is
// `docs/checks/10.4b-iii-a-cocina-contract.sh` (its first group holds every one
// of these names to Wera Cocina's, whose requests it asks a real PostgREST) and
// `docs/checks/5R-k-apple-revoke-contract.sh`, which read them out of
// `src/api/account.ts`. What no check can see: Apple's sheet on an iPhone, and
// Apple accepting the trade — Itacate has no iPhone build yet.
// ============================================================================

const here = (path: string) => new URL(`../${path}`, import.meta.url);
const read = (path: string) => readFileSync(here(path), 'utf8');
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const wera = (path: string) => readFileSync(new URL(`../../app/src/${path}`, import.meta.url), 'utf8');
const weraConst = (name: string) =>
  new RegExp(`export const ${name} = ('[^']*'|\\d+);`).exec(wera('api/account.ts'))?.[1].replace(/'/g, '');

const ME = 'u-lupe';
const OTHER = 'u-socia';
const row = (workspace: string, user: string, name: string | null, kind = 'cocina'): OwnerRow => ({
  workspace_id: workspace,
  user_id: user,
  workspace: name === null ? null : { display_name: name, kind },
});
const kitchen = (id: string, name: string): Business => ({ id, name, kind: 'cocina' });
const shop = (id: string, name: string): Business => ({ id, name, kind: 'tienda' });

describe('what goes with her account', () => {
  it('a neighbour belongs to no business: nothing goes but the login', () => {
    expect(businessesThatGo([], ME)).toEqual([]);
    expect(deletionFrom(businessesThatGo([], ME))).toEqual({ kind: 'leaves' });
  });

  it('every business she alone owns, of either kind — kitchens first, then shops, each by name', () => {
    const rows = [
      row('t1', ME, 'Tienda Lupe', 'tienda'),
      row('k2', ME, 'Fonda Zapata'),
      row('k1', ME, 'Antojitos Lupe'),
    ];
    expect(businessesThatGo(rows, ME)).toEqual([
      kitchen('k1', 'Antojitos Lupe'),
      kitchen('k2', 'Fonda Zapata'),
      shop('t1', 'Tienda Lupe'),
    ]);
  });

  it('a business with another owner stays — she leaves it', () => {
    const rows = [row('k1', ME, 'Fonda Lupe'), row('t1', ME, 'Tienda', 'tienda'), row('t1', OTHER, 'Tienda', 'tienda')];
    expect(businessesThatGo(rows, ME)).toEqual([kitchen('k1', 'Fonda Lupe')]);
  });

  it('a business she works in but does not own is not hers to delete', () => {
    expect(businessesThatGo([row('t1', OTHER, 'Tienda de su jefa', 'tienda')], ME)).toEqual([]);
  });

  it('no answer yet is not “nothing goes”, and a name it cannot read is no guess', () => {
    expect(businessesThatGo(undefined, ME)).toBeNull();
    expect(businessesThatGo(null, ME)).toBeNull();
    expect(businessesThatGo([row('k1', ME, 'Fonda')], null)).toBeNull();
    expect(businessesThatGo([row('k1', ME, null)], ME)).toBeNull();
  });
});

describe('what the deletion does', () => {
  const lupe = kitchen('k1', 'Fonda Lupe');
  const store = shop('t1', 'Tienda Lupe');

  it('nothing known, nothing offered; nothing hers, only the login goes', () => {
    expect(deletionFrom(null)).toEqual({ kind: 'unknown' });
    expect(deletionFrom([])).toEqual({ kind: 'leaves' });
  });

  it('no business is open here, so they are named in the order they were read: kitchens, then shops', () => {
    expect(deletionFrom([lupe, store])).toEqual({ kind: 'deletes', businesses: [lupe, store] });
    expect(deletionFrom(businessesThatGo([row('t1', ME, 'Tienda Lupe', 'tienda'), row('k1', ME, 'Fonda Lupe')], ME))).toEqual({
      kind: 'deletes',
      businesses: [lupe, store],
    });
  });

  it('compares names as `normalize_name` does: case and spaces fold, accents do not', () => {
    expect(normalizedName('  Fonda   DOÑA  Lupe ')).toBe('fonda doña lupe');
    expect(nameMatches(' fonda doña LUPE', 'Fonda Doña Lupe')).toBe(true);
    expect(nameMatches('Fonda Dona Lupe', 'Fonda Doña Lupe')).toBe(false);
    expect(nameMatches('   ', '   ')).toBe(false);
  });

  it('the button waits for every name, and the body carries one per business in the screen’s order', () => {
    const deletes = deletionFrom([lupe, store]);
    expect(namesReady(deletes, { k1: 'fonda lupe' })).toBe(false);
    expect(namesReady(deletes, { k1: 'fonda lupe', t1: 'TIENDA LUPE' })).toBe(true);
    expect(deleteArgs(deletes, { k1: 'fonda lupe', t1: 'TIENDA LUPE' })).toEqual({
      p_business_names: ['fonda lupe', 'TIENDA LUPE'],
    });
  });

  it('a neighbour types nothing and an empty list is sent; nothing while unknown', () => {
    expect(namesReady({ kind: 'leaves' }, {})).toBe(true);
    expect(deleteArgs({ kind: 'leaves' }, {})).toEqual({ p_business_names: [] });
    expect(namesReady({ kind: 'unknown' }, {})).toBe(false);
  });

  it('the button says what goes', () => {
    expect(confirmWords({ kind: 'leaves' })).toBe(ES.account.confirm);
    expect(confirmWords(deletionFrom([lupe]))).toBe(ES.account.confirmKitchen);
    expect(confirmWords(deletionFrom([store]))).toBe(ES.account.confirmShop);
    expect(confirmWords(deletionFrom([lupe, store]))).toBe(ES.account.confirmBusinesses);
  });

  it('each box is labelled with its business, and a shop sends her to Wera for its records first', () => {
    expect(typedLabel(lupe)).toBe(ES.account.typeKitchenName('Fonda Lupe'));
    expect(typedLabel(store)).toBe(ES.account.typeShopName('Tienda Lupe'));
    expect(takesAShop(deletionFrom([lupe, store]))).toBe(true);
    expect(takesAShop(deletionFrom([lupe]))).toBe(false);
    expect(takesAShop({ kind: 'leaves' })).toBe(false);
  });

  it('reads the server’s answer, and says a refusal in Spanish — TD007 is always the list moving', () => {
    expect(deletedFrom({ shops_deleted: 0, shops_left: 0 })).toEqual({ businessesDeleted: 0, businessesLeft: 0 });
    expect(deletedFrom({ shops_deleted: 2, shops_left: 1 })).toEqual({ businessesDeleted: 2, businessesLeft: 1 });
    expect(deletedFrom(null)).toEqual({ businessesDeleted: 0, businessesLeft: 0 });
    expect(NAME_MISMATCH_CODE).toBe('TD007');
    expect(deleteErrorMessage({ code: 'TD007', message: 'a business name typed does not match' })).toBe(
      ES.account.errors.listChanged,
    );
    expect(deleteErrorMessage(new TypeError('Network request failed'))).toBe(ES.api.errors.offline);
    expect(deleteErrorMessage({ code: '42501' })).toBe(ES.api.errors.sessionEnded);
  });
});

describe('what she is told when a call fails', () => {
  it('a session gone has a step she can take; a dead link is said as one; anything else is no English', () => {
    expect(KNOWN_API_CODES).toEqual(['42501', 'PGRST301']);
    expect(apiErrorKey({ code: 'PGRST301' })).toBe('sessionEnded');
    expect(apiErrorKey({ name: 'AuthRetryableFetchError' })).toBe('offline');
    expect(apiErrorKey(new TypeError('fetch failed'))).toBe('offline');
    expect(apiErrorKey({ code: 'P0001', message: 'something in English' })).toBe('unknown');
    expect(apiErrorKey(null)).toBe('unknown');
    expect(apiErrorMessage({ code: 'XX000' })).toBe(ES.api.errors.unknown);
  });

  it('in Wera Cocina’s words', () => {
    for (const [key, sentence] of Object.entries(ES.api.errors)) {
      expect(COCINA.api.errors[key as keyof typeof COCINA.api.errors], key).toBe(sentence);
    }
  });
});

describe('the read and the call, by the names the database answers', () => {
  it('names the owners read and the deletion once, as Wera does', () => {
    expect(OWNERS_TABLE).toBe('workspace_member');
    expect(OWNER_COLUMNS).toBe('workspace_id,user_id,workspace(display_name,kind)');
    expect([OWNER_ROLE_COLUMN, OWNER_ROLE, OWNER_ACTIVE_COLUMN]).toEqual(['role', 'owner', 'is_active']);
    expect(DELETE_MY_ACCOUNT).toBe('delete_my_account');
    for (const name of ['OWNERS_TABLE', 'OWNER_COLUMNS', 'OWNER_ROLE', 'DELETE_MY_ACCOUNT', 'NAME_MISMATCH_CODE']) {
      expect(weraConst(name), name).toBeTruthy();
    }
    expect(weraConst('OWNER_COLUMNS')).toBe(OWNER_COLUMNS);
    expect(weraConst('DELETE_MY_ACCOUNT')).toBe(DELETE_MY_ACCOUNT);
  });

  it('the read sends exactly those filters, and caches under the login', () => {
    const calls = code('src/api/calls.ts');
    expect(calls).toMatch(/\.from\(OWNERS_TABLE\)\s*\.select\(OWNER_COLUMNS\)\s*\.eq\(OWNER_ROLE_COLUMN, OWNER_ROLE\)\s*\.eq\(OWNER_ACTIVE_COLUMN, true\)/);
    expect(calls).toMatch(/supabase\.rpc\(DELETE_MY_ACCOUNT, args\)/);
    expect(ownersKey('u-1')).toEqual([...OWNERS_KEY, 'u-1']);
    expect(ownersKey('u-1')).not.toEqual(ownersKey('u-2'));
    const hooks = code('src/api/hooks.ts');
    expect(hooks).toMatch(/queryKey: ownersKey\(userId\)/);
    expect(hooks).toMatch(/invalidateQueries\(\{ queryKey: OWNERS_KEY \}\)/);
  });
});

describe('Apple is told, and told it is Itacate', () => {
  it('one function for every app: its name, region and patience are Wera’s', () => {
    expect(APPLE_REVOKE).toBe(weraConst('APPLE_REVOKE'));
    expect(APPLE_REVOKE_REGION).toBe(weraConst('APPLE_REVOKE_REGION'));
    expect(String(APPLE_REVOKE_TIMEOUT_MS)).toBe(weraConst('APPLE_REVOKE_TIMEOUT_MS'));
  });

  it('the body names this app’s bundle id — the one Apple issued the code to', () => {
    const app = JSON.parse(read('app.json')).expo;
    expect(APPLE_CLIENT_ID).toBe('mx.wera.vecino');
    expect(APPLE_CLIENT_ID).toBe(app.ios.bundleIdentifier);
    expect(revokeBody('c-123')).toEqual({ code: 'c-123', client_id: APPLE_CLIENT_ID });
    // ⚠️ The code first, then the app: `5R-k-apple-revoke-contract.sh` reads the
    // interface's keys in that order to build the body it puts on the wire.
    const declared = /export interface RevokeBody \{([\s\S]*?)\n\}/.exec(read('src/api/account.ts'))?.[1] ?? '';
    expect([...declared.matchAll(/readonly (\w+):/g)].map((m) => m[1])).toEqual(['code', 'client_id']);
    expect(Object.keys(revokeBody('c-123'))).toEqual(['code', 'client_id']);
    expect(code('src/api/calls.ts')).toMatch(/functions\.invoke\(APPLE_REVOKE, \{\s*body: revokeBody\(code\)/);
  });

  it('a login with an Apple link stops at the sheet — on an iPhone; Android has none', () => {
    const linked = { identities: [{ provider: 'google' }, { provider: APPLE_PROVIDER }] };
    expect(hasAppleIdentity(linked)).toBe(true);
    expect(hasAppleIdentity({ app_metadata: { providers: ['email', 'apple'] } })).toBe(true);
    expect(hasAppleIdentity({ identities: [{ provider: 'google' }], app_metadata: { providers: 'apple' } })).toBe(false);
    expect(hasAppleIdentity(null)).toBe(false);
    expect(asksAppleFirst(linked, true)).toBe(true);
    expect(asksAppleFirst(linked, false)).toBe(false);
  });

  it('only closing the sheet stops a deletion', () => {
    expect(releaseStep(null)).toEqual({ kind: 'delete' });
    expect(releaseStep({ kind: 'cancelled' })).toEqual({ kind: 'stop' });
    expect(releaseStep({ kind: 'token', identityToken: 't', authorizationCode: 'c', fullName: null })).toEqual({
      kind: 'revoke',
      code: 'c',
    });
    expect(releaseStep({ kind: 'token', identityToken: 't', authorizationCode: null, fullName: null })).toEqual({
      kind: 'delete',
    });
    expect(releaseStep({ kind: 'failed', detail: 'no apple account' })).toEqual({ kind: 'delete' });
  });

  // No suite can load the provider or the hook; the order is the mistake that
  // would be silent everywhere else.
  it('the sheet is asked only when the login has a link and the phone a sheet, and Apple is told before the account goes', () => {
    const provider = code('src/auth/AuthProvider.tsx');
    expect(provider).toMatch(/if \(!asksAppleFirst\(session\?\.user, appleAvailable\)\) return null;/);
    expect(provider).toMatch(/return appleOutcome\(await AppleAuthentication\.signInAsync\(\)\);/);
    const all = code('src/api/hooks.ts');
    const hooks = all.slice(all.indexOf('export function useDeleteMyAccount'));
    const asked = hooks.indexOf('releaseStep(await askAppleAgain())');
    const told = hooks.indexOf('await revokeApple(step.code)');
    const deleted = hooks.indexOf('await mutation.mutateAsync(args)');
    const gone = hooks.indexOf('await signOut()');
    expect(asked).toBeGreaterThan(-1);
    expect([asked < told, told < deleted, deleted < gone]).toEqual([true, true, true]);
    expect(hooks).toMatch(/if \(step\.kind === 'stop'\) return null;/);
  });
});

describe('the words: Wera’s, word for word', () => {
  const WORDS = ['open', 'aloneWarning', 'typeShopName', 'typeKitchenName', 'confirm', 'confirmShop', 'confirmKitchen', 'confirmBusinesses', 'working', 'cancel'] as const;

  it('every sentence the three deletions share', () => {
    for (const key of WORDS) {
      const ours = ES.account[key];
      const theirs = WERA.account[key];
      if (typeof ours === 'function' && typeof theirs === 'function') {
        expect(ours('Fonda Doña Lupe'), key).toBe(theirs('Fonda Doña Lupe'));
      } else {
        expect(ours, key).toBe(theirs);
      }
    }
    expect(ES.account.businessesWarning(1)).toBe(WERA.account.businessesWarning(1));
    expect(ES.account.businessesWarning(2)).toBe(WERA.account.businessesWarning(2));
    expect(ES.account.errors.listChanged).toBe(WERA.account.errors.listChanged);
  });

  it('and where each business lives is said as the twin that is not its home says it', () => {
    // A kitchen is in Wera Cocina — Wera's line; a shop is in Wera — Wera Cocina's.
    expect(ES.account.businessLine('Fonda Lupe', 'cocina')).toBe(WERA.account.businessLine('Fonda Lupe', 'cocina'));
    expect(ES.account.businessLine('Tienda Lupe', 'tienda')).toBe(COCINA.account.businessLine('Tienda Lupe', 'tienda'));
    expect(ES.account.businessLine('Fonda Lupe', 'cocina')).toBe('Fonda Lupe: tu cocina en Wera Cocina');
    expect(ES.account.businessLine('Tienda Lupe', 'tienda')).toBe('Tienda Lupe: tu tienda en Wera');
    expect(ES.account.shopRecords).toBe(COCINA.account.shopRecords);
    expect(ES.account.shopRecords).toContain(WERA.monthExport.heading);
  });
});

describe('the one screen a signed-in neighbour stands on has the way out', () => {
  it('at its foot, in a form that keeps the box being typed in above the keyboard', () => {
    const screen = code('src/app/(vecino)/index.tsx');
    expect(screen).toMatch(/<Salidas \/>/);
    expect(screen).toMatch(/<Formulario[\s\S]*<Salidas \/>[\s\S]*<\/Formulario>/);
    // *Cerrar sesión* is the block's now: one sign-out on the screen, not two.
    expect(screen).not.toMatch(/signOut/);
  });

  it('and the block reads what goes, asks each name, and sends what the rules build', () => {
    const block = code('src/ui/Salidas.tsx');
    expect(block).toMatch(/const goes = useBusinessesThatGo\(\);/);
    expect(block).toMatch(/deletionFrom\(goes\)/);
    expect(block).toMatch(/remove\(deleteArgs\(deletion, typed\)\)/);
    expect(block).toMatch(/disabled=\{removing \|\| !ready\}/);
    expect(block).toMatch(/label=\{ES\.auth\.signOut\}/);
    // Offered once what goes is known.
    expect(block).toMatch(/deletion\.kind !== 'unknown' && \(/);
  });
});
