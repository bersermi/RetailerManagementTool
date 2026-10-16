import { describe, expect, it } from 'vitest';
import { sellGate } from '@/cart/gate';

// `8g`, the owner's ruling of 2026-10-15: an unpriced product never enters a
// sale's basket. See `@/cart/gate` for the argument.
describe('8g — a product with no price never enters the basket', () => {
  it('lets a priced product in, whoever is at the counter', () => {
    expect(sellGate(4500, true, false)).toBe('open');
    expect(sellGate(4500, false, false)).toBe('open');
  });

  it('treats a zero price as a price, not as none', () => {
    // `centavos === 0` is a product the shop gives away; `null` is no price.
    expect(sellGate(0, false, false)).toBe('open');
  });

  it('asks the owner or a manager for the price first', () => {
    expect(sellGate(null, true, false)).toBe('priceFirst');
  });

  it('refuses a cashier, who may not set a price (2026-09-23)', () => {
    expect(sellGate(null, false, false)).toBe('refused');
  });

  it('leaves a line already in the basket countable down, priced or not', () => {
    expect(sellGate(null, false, true)).toBe('open');
    expect(sellGate(null, true, true)).toBe('open');
  });
});
