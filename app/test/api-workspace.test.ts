import { describe, expect, it } from 'vitest';

import {
  MY_WORKSPACES_KEY,
  ONBOARD_WORKSPACE,
  WORKSPACE_COLUMNS,
  checkShopName,
  membershipFrom,
  onboardArgs,
  toWorkspace,
  type Workspace,
  type WorkspaceRow,
} from '@/api/workspace';
import { ES } from '@/strings';

// ============================================================================
// THE SHOP'S CONTRACT WITH POSTGRES. Plan task 5b-i.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR, AND WHAT IT CANNOT DO, STATED TOGETHER BECAUSE
// THE SECOND IS THE MORE IMPORTANT HALF. Every assertion below pins a STRING
// this app sends to PostgREST — an argument name, a column list, an RPC name.
// It can prove the app is consistent with itself. IT CANNOT PROVE THE DATABASE
// AGREES, because nothing in TypeScript has ever read `0027`: rename an
// argument here and every line below still passes, while the real call 404s
// with `PGRST202` on a phone in a shop.
//
// THAT is `docs/checks/5b-i-api-contract.sh`, which posts these exact values to
// a reset database over HTTP and reads what comes back. This suite is the cheap
// half, it runs in CI on every app commit, and it is what turns a wrong name
// into a red diff rather than a silent rewrite of the one thing the other check
// is watching.
// ============================================================================

const ROW: WorkspaceRow = {
  id: '4ce770b6-5a3b-4e76-bb8d-ec7e611c3d09',
  display_name: 'Abarrotes La Probe',
  prices_include_tax: true,
  code: 'NFFABMNA',
};

describe('the names PostgREST matches an RPC by', () => {
  // ⚠️ THE `p_` PREFIXES, WRITTEN OUT. PostgREST resolves a function by its
  // PARAMETER NAMES, so `display_name` does not fail the call — it fails to
  // FIND the function, 404, "Could not find the function
  // public.onboard_workspace(display_name) in the schema cache". Measured
  // against the applied schema on 2026-09-14, not recalled.
  it('spells all three arguments the way 0027 declares them', () => {
    expect(Object.keys(onboardArgs({ displayName: 'x', pricesIncludeTax: true })).sort()).toEqual([
      'p_display_name',
      'p_location_name',
      'p_prices_include_tax',
    ]);
  });

  it('names the function and the columns it reads', () => {
    expect(ONBOARD_WORKSPACE).toBe('onboard_workspace');
    expect(WORKSPACE_COLUMNS).toBe('id,display_name,prices_include_tax,code');
  });

  // A `select=*` ships every column a later migration adds to a phone, and
  // promises this app will keep parsing them.
  it('asks for named columns and never for everything', () => {
    expect(WORKSPACE_COLUMNS).not.toContain('*');
  });
});

describe('what is actually sent', () => {
  it('sends the trimmed name, because the stored name is the trimmed one', () => {
    expect(onboardArgs({ displayName: '  Abarrotes La Probe  ', pricesIncludeTax: true }))
      .toEqual({
        p_display_name: 'Abarrotes La Probe',
        p_prices_include_tax: true,
        p_location_name: null,
      });
  });

  // ⚠️ NULL AND NEVER THE EMPTY STRING. `0027`'s branch is
  // `coalesce(p_location_name, p_display_name)` — it reads NULL, not blank — so
  // `''` would name the shop's first store the empty string and pass every
  // constraint on the way there.
  it('turns a blank location into null, so the shop names its own first store', () => {
    for (const locationName of [undefined, null, '', '   ']) {
      expect(onboardArgs({ displayName: 'Tienda', pricesIncludeTax: true, locationName }))
        .toHaveProperty('p_location_name', null);
    }
  });

  it('passes a real location name through, trimmed', () => {
    expect(onboardArgs({ displayName: 'Tienda', pricesIncludeTax: true, locationName: ' Centro ' }))
      .toHaveProperty('p_location_name', 'Centro');
  });

  // C1.7. The answer is a boolean either way and it is never dropped — a
  // missing `p_prices_include_tax` would take the column default, which is
  // `true`, and quietly overrule the one person who said no.
  it('carries C1.7 as a boolean, both ways', () => {
    expect(onboardArgs({ displayName: 'T', pricesIncludeTax: true }).p_prices_include_tax).toBe(true);
    expect(onboardArgs({ displayName: 'T', pricesIncludeTax: false }).p_prices_include_tax).toBe(false);
  });
});

describe('does this person belong to a shop', () => {
  // ⚠️ THE ONE THAT MATTERS. `unknown` is the absence of an answer, not a third
  // answer, and collapsing it into `none` offers a shopkeeper of six months the
  // screen that creates a shop — which, tapped, creates a SECOND one.
  it('calls a read that has not come back unknown, and never none', () => {
    expect(membershipFrom(null)).toBe('unknown');
    expect(membershipFrom(undefined)).toBe('unknown');
  });

  it('reads an empty array as belonging nowhere, which is a real state', () => {
    expect(membershipFrom([])).toBe('none');
  });

  it('reads any row at all as belonging', () => {
    expect(membershipFrom([toWorkspace(ROW)])).toBe('member');
  });
});

describe('the row, renamed once', () => {
  it('maps every column of the select and invents none', () => {
    const expected: Workspace = {
      id: '4ce770b6-5a3b-4e76-bb8d-ec7e611c3d09',
      displayName: 'Abarrotes La Probe',
      pricesIncludeTax: true,
      code: 'NFFABMNA',
    };
    expect(toWorkspace(ROW)).toEqual(expected);
  });

  // The column list and the parser are two copies of one claim four lines
  // apart, which is the shape this repository has recorded eleven times.
  it('parses exactly the columns it asked for', () => {
    expect(WORKSPACE_COLUMNS.split(',').sort()).toEqual(Object.keys(ROW).sort());
  });

  it('caches under a key that says what it holds', () => {
    expect(MY_WORKSPACES_KEY).toEqual(['workspace', 'mine']);
  });
});

describe('the name the screen refuses to send', () => {
  it('refuses blank, which is the one case 0027 also refuses', () => {
    for (const blank of ['', '   ', '\t\n']) {
      const checked = checkShopName(blank);
      expect(checked.ok).toBe(false);
      if (!checked.ok) expect(checked.message).toBe(ES.api.errors.nameMissing);
    }
  });

  // ⚠️ EVERY OTHER NAME IS SOMEBODY'S REAL SHOP. A client-side rule about length
  // or characters would be this app deciding what a shop may be called, which is
  // not a decision it has been given.
  it('accepts the names real shops have', () => {
    for (const name of ['El 7', 'La 5ta', 'Doña Mary', 'X', 'Abarrotes "El Buen Precio"']) {
      expect(checkShopName(name).ok).toBe(true);
    }
  });

  it('hands back the trimmed name, so the check and the call agree', () => {
    const checked = checkShopName('  Doña Mary  ');
    expect(checked.ok).toBe(true);
    if (checked.ok) {
      expect(checked.displayName).toBe('Doña Mary');
      expect(onboardArgs({ displayName: checked.displayName, pricesIncludeTax: true }).p_display_name)
        .toBe('Doña Mary');
    }
  });
});
