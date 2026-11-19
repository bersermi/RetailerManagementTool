import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { NADA, type LoQueUsa } from '@/api/servicios';
import { cuentaDe } from '@/auth/quien';
import { DEL_AYUDANTE, ayudasAqui, conTarjeta, mosaicosPara, quitarTexto } from '@/lib/ayudante';
import type { Mosaico } from '@/lib/loQueUsas';
import { ES } from '@/strings';

// ============================================================================
// WHAT A HELPER SEES, AND WHAT IS THE OWNER'S. Plan task `10.9b-ii`, the owner's rulings of
// 2026-11-16 and 17 (G18, G36) and the family-shell page's *Ayudante*. The rules are pure
// (`@/lib/ayudante`, `@/api/equipo`, `@/lib/empujones`' `duena`); whether each screen asks them is
// read from the screens' source — no check can render them (ADR-035 §2.11), the phone is their
// instrument.
// ============================================================================

const code = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s+/g, ' ');

const usa = (estado: 'on' | 'off'): LoQueUsa => ({
  ...NADA,
  ofrecidos: ['tarjeta'],
  elecciones: { tarjeta: { estado, desde: new Date('2026-11-17T18:00:00Z') } },
});
const tile = (servicio: Mosaico['servicio']): Mosaico => ({ servicio, abre: `/${servicio}` as Mosaico['abre'], vivo: null });

describe('a helper’s Hoy', () => {
  it('every tile is the owner’s but the card’s, which a helper stamps with — and only once set up (`10.9e-ii`)', () => {
    const vivo = { valor: '6 sellos hoy', detalle: '23 tarjetas activas', porHacer: false };
    const todos = [{ ...tile('tarjeta'), vivo }, tile('promociones'), tile('numeros')];
    expect(mosaicosPara(todos, true)).toEqual(todos);
    expect(mosaicosPara(todos, false)).toEqual([{ ...tile('tarjeta'), vivo }]);
    // Its first-time state opens the setup, which is the owner's: a helper never sees it.
    expect(mosaicosPara([tile('tarjeta')], false)).toEqual([]);
    expect(mosaicosPara([tile('tarjeta')], true)).toEqual([tile('tarjeta')]);
    expect(DEL_AYUDANTE).toEqual(['tarjeta']);
  });

  it('the screen asks her role, and draws the owner’s line, tiles, reminder and Cuéntanos for the owner alone', () => {
    const hoy = code('app/(cocina)/(tabs)/index.tsx');
    expect(hoy).toContain('const rol = useSuRol(kitchen.id).data;');
    expect(hoy).toContain('const duena = esDuena(rol);');
    expect(hoy).toContain('paginaCerrada: cerrada, ahora, duena }');
    expect(hoy).toContain('const mosaicos = mosaicosPara(mosaicosDe(servicios.data, vivosDe(tarjetaDeHoy, ahora), PANTALLA_DE, ademasDe(tarjetaDeHoy, ahora)), duena)');
    expect(hoy).toContain('{duena && recordatorio.propuesta !== null && preguntar(');
    expect(hoy).toContain('{duena && cuentanosEnHoy(servicios.data, menuCerrado) && (');
    expect(hoy).toContain('antetitulo={ayudante ? ES.ayudante.antetitulo : (trade ?? ES.cocina.antetitulo)}');
  });

  it('a removed helper’s kitchens are read again — from the tabs’ layout, once', () => {
    expect(code('app/(cocina)/(tabs)/_layout.tsx')).toContain('useSiYaNoEstaAqui(kitchen?.id ?? null);');
    expect(code('api/hooks.ts')).toContain(
      'if (kitchenId !== null && rol === null) void queries.invalidateQueries({ queryKey: KITCHENS_KEY });',
    );
  });
});

describe('her Mi cocina', () => {
  it('the owner’s, a helper’s, or a wheel with her way out — by her role at this kitchen', () => {
    const mi = code('app/(cocina)/(tabs)/mi-cocina.tsx');
    expect(mi).toContain("case 'duena': return <MiCocinaDe kitchen={kitchen} rol={rol.data} />;");
    expect(mi).toContain("case 'ayudante': return <MiCocinaDeAyudante key={kitchen.id} kitchen={kitchen} />;");
    // Quién trabaja aquí is the owner's screen's alone.
    expect(mi.match(/<QuienTrabajaAqui /g)).toHaveLength(1);
    // The helper's screen is the file's last function.
    const ayudante = mi.slice(mi.indexOf('function MiCocinaDeAyudante'));
    expect(ayudante.length).toBeGreaterThan(500);
    expect(ayudante).not.toContain('QuienTrabajaAqui');
    expect(ayudante).not.toContain('LoQueUsas');
    expect(ayudante).toContain('ES.ayudante.salir');
    expect(ayudante).toContain('<Salidas key={kitchen.id} openKitchenId={kitchen.id} />');
  });

  it('what she does here is true today — stamps and rewards only once her kitchen uses the card this build carries', () => {
    expect(ayudasAqui(undefined)).toBe('Ayudas aquí: entregas y publicas ofertas');
    expect(ayudasAqui(usa('on'), [])).toBe(ES.ayudante.ayudas);
    expect(ayudasAqui(usa('off'), ['tarjeta'])).toBe(ES.ayudante.ayudas);
    expect(ayudasAqui(usa('on'), ['tarjeta'])).toBe('Ayudas aquí: entregas, das sellos y premios, publicas ofertas');
    // `10.9e-ii`: this build carries the card, so the line follows her kitchen's choice.
    expect(conTarjeta(usa('on'))).toBe(true);
    expect(conTarjeta(usa('off'))).toBe(false);
  });

  it('Quitar tells the owner what happens — her code to stamp only with the card', () => {
    expect(quitarTexto(undefined)).toBe('Su teléfono deja de ver tu cocina.');
    expect(quitarTexto(usa('on'), ['tarjeta'])).toBe('Su teléfono deja de ver tu cocina, y su código para sellar deja de servir.');
  });

  it('her account’s row: her name, then her address and how she signs in', () => {
    expect(cuentaDe({ email: 'lupita@correo.mx', user_metadata: { full_name: 'Lupita' }, app_metadata: { provider: 'google' } })).toEqual({
      titulo: 'Lupita',
      detalle: 'lupita@correo.mx · entras con Google',
    });
    expect(cuentaDe({ email: 'lupita@correo.mx', user_metadata: {}, app_metadata: { provider: 'email' } })).toEqual({
      titulo: 'lupita@correo.mx',
      detalle: 'entras con tu correo',
    });
    expect(cuentaDe({ email: 'x@privaterelay.appleid.com', user_metadata: { full_name: 'Ana' }, app_metadata: { provider: 'otro' } })).toEqual({
      titulo: 'Ana',
      detalle: 'x@privaterelay.appleid.com',
    });
    expect(cuentaDe(null)).toBeNull();
  });
});
