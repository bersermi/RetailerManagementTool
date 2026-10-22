// ============================================================================
// THE KEYBOARD — `@/lib/teclado`, plan task `8g` (the owner's first user,
// 2026-10-22: *"he cannot see what he's typing as a password"*). Who makes room
// for the keyboard, and how far a field is scrolled to clear it.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { ANDROID_EDGE_TO_EDGE_API, comportamientoTeclado, desfaseTeclado, desplazamiento } from '@/lib/teclado';
import { ES } from '@/strings';

describe('who makes room for the keyboard', () => {
  it('is always the app on an iPhone', () => {
    expect(comportamientoTeclado('ios', '18.0')).toBe('padding');
  });

  it('is the app on Android 15 and newer, where an app targeting it is drawn edge to edge', () => {
    expect(ANDROID_EDGE_TO_EDGE_API).toBe(35);
    expect(comportamientoTeclado('android', 35)).toBe('padding');
    expect(comportamientoTeclado('android', 36)).toBe('padding');
  });

  it('is the phone on Android 14 and older, which still shortens the window — never counted twice', () => {
    expect(comportamientoTeclado('android', 34)).toBeUndefined();
    expect(comportamientoTeclado('android', 29)).toBeUndefined();
  });

  it('reads a version given as text, and makes no room on anything else', () => {
    expect(comportamientoTeclado('android', '35')).toBe('padding');
    expect(comportamientoTeclado('android', 'nonsense')).toBeUndefined();
    expect(comportamientoTeclado('web', 0)).toBeUndefined();
  });
});

describe('where a counter’s keyboard room counts from', () => {
  it('keeps the iPhone’s tuned figure', () => {
    expect(desfaseTeclado('ios', '18.0', 90, 142)).toBe(90);
  });

  it('is where the counter starts on an Android 15+ screen, once measured', () => {
    expect(desfaseTeclado('android', 36, 80, 142)).toBe(142);
    expect(desfaseTeclado('android', 36, 80, null)).toBe(80);
  });

  it('changes nothing on an older Android, whose window the system shortens', () => {
    expect(desfaseTeclado('android', 33, 80, 142)).toBe(80);
  });
});

describe('how far a field is scrolled to clear the keyboard', () => {
  it('does not move a field that already ends above it with room to spare', () => {
    expect(desplazamiento(100, 48, 500, 32)).toBe(0);
  });

  it('lifts a field the keyboard covers until it ends the margin above the keyboard', () => {
    // A 48-tall field at 480, the keyboard's top at 500, a 32 margin: 60 up.
    expect(desplazamiento(480, 48, 500, 32)).toBe(60);
  });

  it('lifts a field wholly under the keyboard the same way', () => {
    expect(desplazamiento(700, 48, 500, 32)).toBe(280);
  });
});

describe('the words the keyboard work added', () => {
  it('names the password switch both ways, for a screen reader', () => {
    expect(ES.auth.showPassword).toBe('Mostrar contraseña');
    expect(ES.auth.hidePassword).toBe('Ocultar contraseña');
  });

  it('closes the postal code’s number pad with the word the other pads use', () => {
    expect(ES.address.done).toBe('Listo');
  });
});
