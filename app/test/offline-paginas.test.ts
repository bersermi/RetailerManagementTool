// ============================================================================
// THE PAGES, WITH NO SIGNAL — `8g`, 2026-10-20, the offline report's round 3 (the
// owner's *"Do all the fixes"*). `@/offline/senal`'s one rule, applied page by
// page: a read with NOTHING to draw and no signal says `ES.offline.whenSignal` in
// place of a spinner that cannot stop or a *nothing* that is not true; a read with
// something to draw shows it, whatever its last attempt said. With a signal every
// line below is the sentence it was before.
//
// ⚠️ `online` IS `true`, `false` OR `null`, AND `null` IS UNKNOWN — never offline.
// Every page is asked all three where it matters, because a launch that has not
// read the network yet must not tell a shop with wifi that it has none.
// ⚠️ `catalogLine`, `pricesLine` and `providerLine` are read where they always
// were (`api-catalog`, `api-prices`, `api-provider-directory`).
// ============================================================================

import { describe, expect, it } from 'vitest';

import { queueLine } from '@/api/approvals';
import { addressLine, type StoreAddress } from '@/api/collection';
import { costsLine, costsSpin } from '@/api/costs';
import { costNoneLine, weekDrawn, weekNoneLine } from '@/api/productPage';
import { monthFigure, supplierPageLine, type Activity } from '@/api/providerPage';
import { providerPickLine } from '@/api/providers';
import { ES } from '@/strings';

const EVERY = [true, false, null] as const;

describe('Costos — no endless spinner, and a note read stays read', () => {
  it('says *Se ve cuando haya señal* and stops spinning with nothing read and no signal', () => {
    expect(costsLine('unknown', null, false)).toBe(ES.offline.whenSignal);
    expect(costsLine('unknown', 'offline', false)).toBe(ES.offline.whenSignal);
    expect(costsSpin('unknown', false)).toBe(false);
  });

  it('spins with a signal, and says a failure beside the spinner as before', () => {
    expect(costsSpin('unknown', true)).toBe(true);
    expect(costsSpin('unknown', null)).toBe(true);
    expect(costsLine('unknown', null, true)).toBe('');
    expect(costsLine('unknown', 'offline', true)).toBe(ES.api.errors.offline);
    expect(costsLine('unknown', 'unknown', null)).toBe(ES.api.errors.unknown);
  });

  // ⚠️⚠️ THE FLIP: a failure used to win over every state, so a true note under a
  // chart became *Sin conexión* the moment a refresh missed.
  it('lets what was read win over a failed refresh, on any signal', () => {
    for (const online of EVERY) {
      expect(costsLine('nothing', 'offline', online)).toBe(ES.costs.nothing);
      expect(costsLine('single', 'offline', online)).toBe(ES.costs.single);
      expect(costsLine('unlinked', 'unknown', online)).toBe(ES.costs.unlinked);
      expect(costsLine('series', 'offline', online)).toBe('');
      expect(costsSpin('series', online)).toBe(false);
    }
  });
});

describe('Solicitudes — *Un momento…* only while it is true', () => {
  it('waits for the signal rather than for ever', () => {
    expect(queueLine(null, false)).toBe(ES.offline.whenSignal);
    expect(queueLine('offline', false)).toBe(ES.offline.whenSignal);
  });

  it('says the failure it used to swallow, with a signal', () => {
    expect(queueLine('unknown', true)).toBe(ES.api.errors.unknown);
    expect(queueLine('offline', null)).toBe(ES.api.errors.offline);
  });

  it('is still *Un momento…* while the read is out', () => {
    expect(queueLine(null, true)).toBe(ES.approvals.loading);
    expect(queueLine(null, null)).toBe(ES.approvals.loading);
  });
});

describe('Comprar — the blue card and the picker with no supplier list', () => {
  it('says *Se ve cuando haya señal* where *Cargando proveedores…* never ended', () => {
    expect(providerPickLine(true, null, false)).toBe(ES.offline.whenSignal);
    expect(providerPickLine(true, 'offline', false)).toBe(ES.offline.whenSignal);
  });

  it('says a failure with a signal, and loading only while it is', () => {
    expect(providerPickLine(true, 'unknown', true)).toBe(ES.api.errors.unknown);
    expect(providerPickLine(true, null, true)).toBe(ES.buy.loadingProviders);
    expect(providerPickLine(true, null, null)).toBe(ES.buy.loadingProviders);
  });

  // ⚠️ A list in hand with no provider named yet is the one render before the
  // generic row is chosen — the old words, whatever the signal or the memory said.
  it('keeps the old words when the list is in hand', () => {
    for (const online of EVERY) {
      expect(providerPickLine(false, 'offline', online)).toBe(ES.buy.loadingProviders);
    }
  });
});

describe('La ficha — never *never* about a read that did not arrive', () => {
  it('says *Se ve cuando haya señal* for Te cuesta and the week, offline with nothing read', () => {
    expect(costNoneLine('unknown', false)).toBe(ES.offline.whenSignal);
    expect(weekNoneLine('unknown', false)).toBe(ES.offline.whenSignal);
    // ⚠️ AND NO BARS: seven flat stubs are a picture of a week that sold nothing.
    expect(weekDrawn('unknown', false)).toBe(false);
  });

  it('says *never bought* and *not sold this week* only when the read said so', () => {
    for (const online of EVERY) {
      expect(costNoneLine('nothing', online)).toBe(ES.products.page.costNone);
      expect(weekNoneLine('nothing', online)).toBe(ES.products.page.weekNone);
      expect(weekNoneLine('sales', online)).toBe(ES.products.page.weekNone);
      expect(weekDrawn('sales', online)).toBe(true);
    }
  });

  it('is unchanged with a signal or before the network is known', () => {
    for (const online of [true, null] as const) {
      expect(costNoneLine('unknown', online)).toBe(ES.products.page.costNone);
      expect(weekNoneLine('unknown', online)).toBe(ES.products.page.weekNone);
      expect(weekDrawn('unknown', online)).toBe(true);
    }
  });
});

describe('A supplier\'s page — her row and her month', () => {
  it('waits for the signal when her row never arrived', () => {
    expect(supplierPageLine(true, null, false)).toBe(ES.offline.whenSignal);
    expect(supplierPageLine(false, 'offline', false)).toBe(ES.offline.whenSignal);
  });

  it('keeps the three facts in their order with a signal', () => {
    expect(supplierPageLine(true, 'unknown', true)).toBe(ES.api.errors.unknown);
    expect(supplierPageLine(true, null, true)).toBe(ES.providers.empty.loading);
    expect(supplierPageLine(true, null, null)).toBe(ES.providers.empty.loading);
    expect(supplierPageLine(false, null, true)).toBe(ES.providers.errors.missing);
  });

  // ⚠️ *She is gone* came back from the database — it is a fact, not a wait, and
  // the signal does not change it.
  it('says she is gone when the read said so, offline too', () => {
    expect(supplierPageLine(false, null, false)).toBe(ES.providers.errors.missing);
  });

  const amount = (centavos: number) => `$${centavos / 100}`;
  const came: Activity = { lastDay: '2026-10-13', monthCentavos: 303_000, monthDeliveries: 2 };

  it('says *Se ve cuando haya señal* for Este mes when the deliveries never arrived', () => {
    expect(monthFigure(false, undefined, false, amount)).toBe(ES.offline.whenSignal);
  });

  it('says *Nada este mes* only when the deliveries arrived and she brought none', () => {
    for (const online of EVERY) {
      expect(monthFigure(true, undefined, online, amount)).toBe(ES.providers.page.monthNone);
      expect(monthFigure(true, { lastDay: '2026-09-02', monthCentavos: 0, monthDeliveries: 0 }, online, amount)).toBe(
        ES.providers.page.monthNone,
      );
      expect(monthFigure(true, came, online, amount)).toBe('$3030');
    }
  });

  it('is unchanged with a signal or before the network is known', () => {
    expect(monthFigure(false, undefined, true, amount)).toBe(ES.providers.page.monthNone);
    expect(monthFigure(false, undefined, null, amount)).toBe(ES.providers.page.monthNone);
  });
});

describe('Ajustes — the store\'s address after an offline start', () => {
  const STORE: StoreAddress = {
    locationId: 'loc-1',
    storeName: 'Tienda',
    street: 'Juárez',
    number: '12',
    colonia: '',
    city: 'Coyoacán',
    postalCode: '04000',
  };

  it('says *Se ve cuando haya señal*, never *Sin dirección*, when the read never arrived', () => {
    expect(addressLine(null, false, false)).toBe(ES.offline.whenSignal);
  });

  it('reads the address back once it is known, whatever the signal', () => {
    for (const online of EVERY) {
      expect(addressLine(STORE, true, online)).toBe(ES.address.line('Juárez', '12', '', 'Coyoacán', '04000'));
    }
  });

  it('says *Sin dirección* when the read said there is none', () => {
    for (const online of EVERY) {
      expect(addressLine(null, true, online)).toBe(ES.address.none);
      expect(addressLine({ ...STORE, street: '' }, true, online)).toBe(ES.address.none);
    }
  });

  it('is unchanged with a signal or before the network is known', () => {
    expect(addressLine(null, false, true)).toBe(ES.address.none);
    expect(addressLine(null, false, null)).toBe(ES.address.none);
  });
});
