import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ES } from '@/strings';

// ============================================================================
// *ENTREGAR UN APARTADO* WITH HER TICKET'S QR. Plan task `10.9j-ii-b` (the owner's J2 and J3 of 2026-11-20, as
// `10.9j-i`'s drawing words them). No check can render the screen (ADR-035 §2.11), so its rules are pinned in its
// source, as `test/apartados.test.ts` pins the tab's: what is offered, what is believed, and what is handed over.
// The seal's own rules are `test/sello.test.ts`'.
// ============================================================================

const SRC = join(fileURLToPath(new URL('../..', import.meta.url)), 'cocina/src');
const pantalla = readFileSync(join(SRC, 'app/(cocina)/entregar.tsx'), 'utf8');

describe('Escanear su código, on the keypad — always', () => {
  it('under the keypad’s line, before the keypad: the help, then the button that opens the card’s camera', () => {
    expect(pantalla).toMatch(/\{ES\.entregar\.escanear\.ayuda\}[\s\S]*?<Escaner textos=\{ES\.entregar\.escanear\.escaner\} onLeido=\{leer\} \/>[\s\S]*?<Teclado onTecla=\{tecla\} \/>/);
    // Never opened on its own: the camera starts on her tap.
    expect(pantalla).toMatch(/onPress=\{\(\) => setEscaneando\(true\)\}/);
    expect(pantalla).toMatch(/useState\(false\);\n  const \[sello, setSello\]/);
  });

  it('the words are the drawing’s', () => {
    expect(ES.entregar.escanear.ayuda).toBe('Escanea el código de su apartado: tu teléfono lo revisa sin señal.');
    expect(ES.entregar.escanear.escaner.boton).toBe('Escanear su código');
    expect(ES.entregar.escanear.escaner.noEs).toBe('Ese código no es de un apartado de tu cocina.');
    expect(ES.entregar.revisado).toBe('Revisado en este teléfono');
    expect(ES.entregar.despues).toBe('Su nombre y su calificación aparecen cuando vuelva la señal.');
  });
});

describe('what is believed — a seal this phone checked, and nothing else', () => {
  it('⚠️ a seal is taken only once `revisarSello` says it is this kitchen’s — else the camera stays open, saying so', () => {
    const leer = pantalla.slice(pantalla.indexOf('function leer('), pantalla.indexOf('function entregarla('));
    expect(leer).toMatch(/if \(revisarSello\(leido, kitchen\.id, guardadas, new Date\(\)\) !== 'valido'\) \{[\s\S]*?return false;\n    \}/);
    expect(leer.indexOf('setSello(leido)')).toBeGreaterThan(leer.indexOf("!== 'valido'"));
    // A secret newer than this phone's, with signal: read again, and the same scan checked once more.
    expect(leer).toMatch(/if \(versionNueva\(leido, guardadas\) && !apartados\.sinSenal\)/);
    expect(pantalla).toMatch(/if \(revisarSello\(pendiente, kitchen\.id, llaves\.data, new Date\(\)\) === 'valido'\) \{\s*setSello\(pendiente\);/);
    // Nowhere else is a seal set.
    expect(pantalla.match(/setSello\((leido|pendiente)\)/g)).toHaveLength(2);
  });

  it('an order this phone has read is drawn as if typed; one it never read, from its seal, under Revisado en este teléfono', () => {
    expect(pantalla).toMatch(/const leida = sello === null \? null : \(ordenes\.find\(\(o\) => o\.id === sello\.reservaId\) \?\? null\);/);
    expect(pantalla).toMatch(
      /const orden =\s*sello === null\s*\? buscarCodigo\(ordenes, codigo, ahora\)\s*: \(leida \?\? ordenDeSello\(reservaDeSello\(sello, diaTexto\), entregadaDelSello\)\);/,
    );
    expect(pantalla).toMatch(/revisada=\{revisada\}/);
  });

  it('⚠️ J3: a typed code is handed over only when it is one this phone read — there is no other way to an order', () => {
    // The one handover, from the order found, whichever way it was found.
    expect(pantalla.match(/entregar\(o\.id\)/g)).toHaveLength(1);
    expect(pantalla).toMatch(/onEntregar=\{\(\) => entregarla\(orden\)\}/);
    // With no signal a code it never read says the reads are old — and the QR is the way, right under it.
    expect(pantalla).toMatch(/ES\.entregar\.noEstaSinSenal\(cuandoTexto\(apartados\.leidoEn, ahora\)\)/);
    // …and no way to hand over what it cannot check (the header says why, in a comment — the code holds no such button).
    expect(pantalla.replace(/^\s*\/\/.*$/gm, '')).not.toMatch(/entregarloAsi|Entregarlo así/);
  });
});
