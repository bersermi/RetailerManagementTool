import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { cajaDelEscaner, type PermisoDeCamara } from '@/lib/escaner';
import { ES } from '@/strings';

// ============================================================================
// THE CAMERA THAT READS A CODE, AND THE TWO SCREENS IT SERVES. Plan task `10.9c` — the helper's invitation
// as a QR (`@/ui/HojaInvitar`, `@/ui/CodigoQR`) and *Unirme a una cocina* scanning it (`@/ui/Escaner`).
//
// What the box shows is a pure rule of the phone's answer (`@/lib/escaner`), every case of it here. ⚠️ WHAT
// NO CHECK CAN SEE: the camera opening, a phone's camera reading another phone's screen — the phone is
// the instrument (the handbook: two phones, the owner's *Invitar a alguien* and a helper's *Unirme*).
// That the drawn QR reads back is `test/qr.test.ts`'s.
// ============================================================================

const permiso = (granted: boolean, status: PermisoDeCamara['status'], canAskAgain: boolean): PermisoDeCamara => ({
  granted,
  status,
  canAskAgain,
});
const fuente = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8').replace(/\s+/g, ' ');

describe('what the box shows, from the camera’s permission alone', () => {
  it('before the answer is read: the button, not yet tappable', () => {
    expect(cajaDelEscaner(null)).toBe('leyendo');
  });
  it('never asked: a button — the phone asks only when she taps', () => {
    expect(cajaDelEscaner(permiso(false, 'undetermined', true))).toBe('boton');
  });
  it('allowed, here or by *Tomar foto*: the camera at once', () => {
    expect(cajaDelEscaner(permiso(true, 'granted', true))).toBe('camara');
    expect(cajaDelEscaner(permiso(true, 'granted', false))).toBe('camara');
  });
  it('refused while the phone will ask again (Android, after one No): why, and ask again', () => {
    expect(cajaDelEscaner(permiso(false, 'denied', true))).toBe('negada');
  });
  it('refused for good (an iPhone after one No): why, and the way to its settings', () => {
    expect(cajaDelEscaner(permiso(false, 'denied', false))).toBe('ajustes');
    expect(cajaDelEscaner(permiso(false, 'undetermined', false))).toBe('ajustes');
  });
});

describe('the box, as drawn', () => {
  const escaner = fuente('ui/Escaner.tsx');
  it('asks only from a tap, reads QR codes alone, and answers once per code', () => {
    expect(escaner).toContain('const [permiso, pedir, releer] = useCameraPermissions();');
    expect(escaner.match(/pedir\(\)/g)).toHaveLength(2); // the button, and *ask again* — both taps
    expect(escaner).toContain("barcodeScannerSettings={{ barcodeTypes: ['qr'] }}");
    expect(escaner).toContain('if (leido.current || data === rechazado.current) return;');
    expect(escaner).toContain("if (estado === 'active') void releer();");
  });
});

describe('*Invitar a alguien*: the code as a QR, and typed under it', () => {
  const hoja = fuente('ui/HojaInvitar.tsx');
  it('the QR holds the code itself — the sixteen the database hashed, never the grouped rendering', () => {
    expect(hoja).toContain('<CodigoQR texto={invitacion.codigo} lado={176} etiqueta={ES.invitar.qr} />');
    expect(hoja.indexOf('<CodigoQR')).toBeLessThan(hoja.indexOf('{codigoAgrupado(invitacion.codigo)}'));
  });
  it('the words say to scan it', () => {
    expect(ES.invitar.texto).toMatch(/escanee este código/);
  });
});

describe('*Unirme a una cocina*: the camera above the typed box', () => {
  const unirme = fuente('app/(onboarding)/unirme.tsx');
  it('a scan is what typing it would have been: the box’s own rule, then a whole code — or it says it is not one', () => {
    expect(unirme).toContain(
      'onLeido={(leido) => { const visto = codigoAlEscribir(leido); if (codigoCompleto(visto) === null) return false; setProblema(null); setEscrito(visto); return true; }}',
    );
  });
  it('the camera closes once the code is whole, and opens again when the box is cleared', () => {
    expect(unirme).toContain('activo={codigo === null}');
    expect(unirme.indexOf('<Escaner')).toBeLessThan(unirme.indexOf('<Campo'));
  });
  it('the words: scan, or type', () => {
    expect(ES.unirme.texto).toMatch(/escanea su código/);
    expect(ES.unirme.codigo).toBe('O escribe su código');
    expect(ES.unirme.escaner.boton).toBe('Escanear su código');
  });
});
