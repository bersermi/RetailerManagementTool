import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ES } from '@/strings';

// ============================================================================
// THREE THINGS THE OWNER FOUND OR ASKED FOR ON HIS PHONE, 2026-10-14.
//
// (1) Onboarding showed a checklist of every product of a giro; he ruled giros
//     alone, and that a product brought from the catalog can be retired later
//     (`0054`). (2) `Agregar Variante`, `Editar` and `Costos` looked missing on a
//     big family: they were under its 126th row. (3) A price set from Vender.
//
// §2.11 keeps rendering out of this suite, so each screen is read as TEXT for the
// one wiring that carries the ruling — `apple.test.ts`'s and `api-persist.test.ts`'s
// shape. ⚠️ What no check here can see (R9): how any of it looks at the counter.
// The owner's phone is the instrument.
// ============================================================================

function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
}

describe('onboarding asks for giros, and only Agregar del catálogo shows the list', () => {
  it('the welcome screen draws the picker without its product list', () => {
    expect(read('../src/app/(onboarding)/bienvenida.tsx')).toMatch(/products=\{false\}/);
  });

  it('Agregar del catálogo keeps the list', () => {
    expect(read('../src/app/catalogo.tsx')).toMatch(/\n\s+products\n\s+\/>/);
  });

  it('the picker draws no group of products when told not to', () => {
    expect(read('../src/ui/SelectorCatalogo.tsx')).toMatch(
      /products \? offeredGroups\(template, chosen, holding\) : \[\]/,
    );
  });

  it('no screen promises any more that a catalog product cannot be removed', () => {
    expect(ES.starter.hint).not.toContain('no quitarlos');
    expect(ES.starter.hintGiros).toContain('Productos');
  });
});

describe('a family of any length shows its three controls', () => {
  const familia = read('../src/app/familia/[id].tsx');

  it('draws the controls after the scrolling list, not inside it', () => {
    const scrollEnds = familia.indexOf('</ScrollView>');
    const controls = familia.indexOf('<Acciones familyId');
    expect(scrollEnds).toBeGreaterThan(0);
    expect(controls).toBeGreaterThan(scrollEnds);
  });

  it('opens the list at the row he tapped', () => {
    expect(familia).toMatch(/entry\.id === variante\s*\n?\s*\? \(event\) => scrollToArrival/);
  });
});

describe('a price set from Vender', () => {
  const vender = read('../src/app/(tabs)/vender.tsx');

  it('is offered to the owner and a manager only — the catalog fence', () => {
    expect(vender).toMatch(/const mayPrice = canWriteCatalog\(useMyRole\(\)\);/);
    // ⚠️ `8g` (2026-10-15): the sheet now also opens from the Carrito's price
    // chip and from `+` on a product with no price — the same fence on both.
    const fenced = vender.match(/onPrice=\{mayPrice \? openPricing : null\}/g) ?? [];
    expect(fenced, 'the list and the Carrito each fence the price sheet').toHaveLength(2);
    expect(vender).not.toMatch(/onPrice=\{openPricing\}/);
  });

  it('writes through the edit screen’s own path, never a second one', () => {
    expect(vender).toMatch(/checkEdit\(entry\.id, form, typed, entries, factors, entry\.priceUnit\)/);
    expect(vender).toMatch(/editPlan\(/);
    expect(vender).toMatch(/await save\(plan\)/);
  });

  it('offers no Guardar until the price rows have landed, nor when they failed', () => {
    expect(vender).toMatch(/const ready = !loading && !pricesFailed;/);
    expect(vender).toMatch(/if \(!ready \|\| working\) return;/);
  });

  it('says what a cashier still reads, and what the owner reads instead', () => {
    expect(ES.sell.noPrice).toBe('Sin precio');
    expect(ES.sell.setPrice).toBe('Poner precio');
    expect(ES.sell.priceSheet.needsSignal).toContain('conexión');
  });
});
