import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NINGUNA, guardada } from '@/api/fotos';
import type { Kitchen } from '@/api/kitchen';
import { emptyLine, type LineDraft } from '@/api/listing';
import { EMPTY_PAGE } from '@/api/pagina';
import { OFERTA_PREVIA, platilloPrevio, previaDe, recienTomadas } from '@/lib/vistaPrevia';
import { ES } from '@/strings';
import { precioTexto, quedanTexto } from '@/vecinos/lista';

// ============================================================================
// THE CARD AT THE FOOT OF *TU OFERTA DE HOY* — plan task `10.5-v-d`. What it shows for each
// line as she types: her figures, the drawing's hints until she writes them, never a saving
// Itacate would not draw. ⚠️ WHAT THIS CANNOT SEE: that the card draws and fills in (ADR-035
// §2.11) — the emulator and his phones are its instruments.
// ============================================================================

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const code = (path: string) => readFileSync(join(ROOT, 'src', path), 'utf8').replace(/^\s*\/\/.*$/gm, '');

const line = (patch: Partial<LineDraft> = {}): LineDraft => ({ ...emptyLine('k1'), ...patch });
const kitchen: Kitchen = { id: '11111111-2222-4333-8444-555555555555', displayName: 'Fonda Doña Mari', giroPrincipal: 'giro-fonda' };

describe('until she types, the drawing’s hints — the same her boxes show', () => {
  it('a dish: its hint’s name, $60, $120 struck through and its saving; no count, no photo', () => {
    const platillo = platilloPrevio(line(), 0);
    expect(platillo).toEqual({
      lineNo: 1,
      name: ES.publicar.nombreEjemplo.platillo,
      description: null,
      tags: [],
      priceCentavos: 6000,
      count: null,
      surprise: false,
      usualCentavos: 12000,
      photo: null,
    });
    expect(precioTexto(platillo)).toEqual({ precio: '$60', vale: '$120', ahorro: '−50%' });
    expect(quedanTexto(platillo)).toBeNull();
  });

  it('a bag: the bag’s hint', () => {
    expect(platilloPrevio(line({ surprise: true }), 2)).toMatchObject({ lineNo: 3, name: ES.publicar.nombreEjemplo.bolsa, surprise: true });
  });

  it('and the hints are the boxes’ own', () => {
    expect([ES.publicar.precioEjemplo, ES.publicar.valeEjemplo]).toEqual(['60', '120']);
    const renglon = code('ui/Renglon.tsx');
    expect(renglon).toMatch(/placeholder=\{ES\.publicar\.precioEjemplo\}/);
    expect(renglon).toMatch(/placeholder=\{ES\.publicar\.valeEjemplo\}/);
  });
});

describe('as she types, hers', () => {
  it('her name, her figures, how many, her tags, trimmed', () => {
    const platillo = platilloPrevio(
      line({ name: '  Enchiladas verdes ', description: ' Con crema ', price: '$55', usual: '1,10', count: '6', tags: ['pica'] }),
      0,
    );
    expect(platillo).toMatchObject({ name: 'Enchiladas verdes', description: 'Con crema', priceCentavos: 5500, count: 6, tags: ['pica'] });
    expect(quedanTexto(platillo)).toBe('Quedan 6');
  });

  it('a usual price she is still typing, or one not above the price, draws no saving — as Itacate draws none', () => {
    const corto = platilloPrevio(line({ price: '80', usual: '1' }), 0);
    expect(corto.usualCentavos).toBe(100);
    expect(precioTexto(corto)).toEqual({ precio: '$80', vale: null, ahorro: null });
    expect(platilloPrevio(line({ price: '80', usual: 'mucho' }), 0).usualCentavos).toBeNull();
    expect(precioTexto(platilloPrevio(line({ price: '80', usual: '120' }), 0))).toEqual({ precio: '$80', vale: '$120', ahorro: '−33%' });
  });

  it('a price not yet a price keeps the hint’s, so the card never draws $0', () => {
    expect(platilloPrevio(line({ price: '0' }), 0).priceCentavos).toBe(6000);
    expect(platilloPrevio(line({ price: 'abc' }), 0).priceCentavos).toBe(6000);
    expect(platilloPrevio(line({ count: '0' }), 0).count).toBeNull();
  });
});

describe('her photo, before it is sent', () => {
  const path = `${kitchen.id}/66666666-7777-4888-9999-aaaaaaaaaaaa`;
  const nueva = { kind: 'nueva', path, archivos: [{ name: '720.jpg', uri: 'file:///720.jpg', base64: '' }] } as const;

  it('the card names it by the path it will be saved under, and the form hands the file over by that path', () => {
    expect(platilloPrevio(line({ foto: nueva }), 0).photo).toBe(path);
    expect(recienTomadas([line({ foto: nueva }), line({ foto: guardada('k/vieja') }), line({ foto: NINGUNA })])).toEqual(new Map([[path, nueva]]));
  });
});

describe('the card’s kitchen and offer', () => {
  it('her kitchen as *Ver como la ven* makes it; the offer is the form’s window, one dish per line', () => {
    const ventana = { start: new Date('2026-11-07T23:00:00Z'), end: new Date('2026-11-08T01:00:00Z') };
    const previa = previaDe({ kitchen, place: null, page: EMPTY_PAGE, lines: [line(), line({ key: 'k2', surprise: true })], ventana, now: new Date('2026-11-07T22:00:00Z') });
    expect(previa.cocina).toMatchObject({ id: kitchen.id, name: 'Fonda Doña Mari', giro: 'giro-fonda', offers: [] });
    expect(previa.oferta).toEqual({ id: OFERTA_PREVIA, start: ventana.start, end: ventana.end, dishes: previa.platillos });
    expect(previa.platillos.map((p) => p.lineNo)).toEqual([1, 2]);
  });
});

describe('the form draws it — read as text', () => {
  const screen = code('app/(cocina)/publicar.tsx');

  it('Itacate’s card, one per line, under *Así la verán en Itacate*, between the hours and *Publicar*', () => {
    expect(ES.publicar.asiLaVeran).toBe('Así la verán en Itacate');
    expect(screen).toMatch(/import \{ TarjetaPlatillo \} from '@\/vecinos\/ui\/TarjetaPlatillo';/);
    const horas = screen.indexOf('<Horario');
    const titulo = screen.indexOf('{ES.publicar.asiLaVeran}');
    const tarjeta = screen.indexOf('<TarjetaPlatillo');
    const boton = screen.indexOf('label={ES.publicar.publicar}');
    expect(horas).toBeGreaterThan(-1);
    expect(titulo).toBeGreaterThan(horas);
    expect(tarjeta).toBeGreaterThan(titulo);
    expect(boton).toBeGreaterThan(tarjeta);
  });

  it('made from what she typed, her new photos handed over, opening nothing and measuring no distance', () => {
    expect(screen).toMatch(/previaDe\(\{ kitchen, place, page: page\.data \?\? EMPTY_PAGE, lines, ventana, now: ahora \}\)/);
    expect(screen).toMatch(/<RecienTomadas\.Provider value=\{recienTomadas\(lines\)\}>/);
    expect(screen).toMatch(/<View pointerEvents="none"/);
    expect(screen).toMatch(/<TarjetaPlatillo[\s\S]*?distancia=\{null\}[\s\S]*?onPress=\{\(\) => \{\}\}/);
  });
});
