import { describe, expect, it } from 'vitest';

import { MIN_PASSWORD_LENGTH, checkCredentials, normalizeEmail } from '@/auth/credentials';
import { ES } from '@/strings';

// ============================================================================
// WHAT IS SENT, AND WHAT IS SAID INSTEAD OF SENDING IT. Plan task 5a-iii-a.
//
// Two values a customer is affected by: the address their account is created
// under, and the sentence they read when it does not work. Both are §2.11's
// kind of test — no component, no navigation.
// ============================================================================

describe('the address is normalised before it becomes an account', () => {
  // ⚠️ THE CASE IS THE HALF THAT BITES, AND IT BITES A WEEK LATER. A phone
  // keyboard capitalises the first letter of a field by default, so the address
  // typed at sign-up and the one typed the following Monday differ by one
  // character. Whether the server would forgive that is UNMEASURED (see the
  // module header); this makes it not matter.
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Tienda@Ejemplo.MX ')).toBe('tienda@ejemplo.mx');
    expect(normalizeEmail('\tDON@ejemplo.mx\n')).toBe('don@ejemplo.mx');
  });

  it('carries the normalised address through to what would be sent', () => {
    const checked = checkCredentials(' Doña.Wera@Ejemplo.MX ', 'secreto');
    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.email).toBe('doña.wera@ejemplo.mx');
  });

  // ⚠️ THE PASSWORD IS NOT TRIMMED, AND THAT IS THE OPPOSITE DECISION ON
  // PURPOSE: a space may have been chosen, and stripping it means the password
  // that was set is not the password that is sent.
  it('leaves the password exactly as typed', () => {
    const checked = checkCredentials('a@b.mx', '  con espacios  ');
    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.password).toBe('  con espacios  ');
  });
});

describe('a refusal is a Spanish sentence, before the network is asked', () => {
  const cases: ReadonlyArray<readonly [string, string, string, keyof typeof ES.auth.errors]> = [
    ['no address', '', 'secreto', 'emailMissing'],
    ['spaces only', '   ', 'secreto', 'emailMissing'],
    ['no at sign', 'tienda.ejemplo.mx', 'secreto', 'emailInvalid'],
    ['no domain dot', 'tienda@ejemplo', 'secreto', 'emailInvalid'],
    ['a space inside', 'tien da@ejemplo.mx', 'secreto', 'emailInvalid'],
    ['no password', 'tienda@ejemplo.mx', '', 'passwordMissing'],
    ['a short password', 'tienda@ejemplo.mx', 'abc', 'passwordShort'],
  ];

  for (const [name, email, password, key] of cases) {
    it(`refuses ${name}, in Spanish`, () => {
      const checked = checkCredentials(email, password);
      expect(checked.ok).toBe(false);
      if (!checked.ok) {
        expect(checked.key).toBe(key);
        expect(checked.message).toBe(ES.auth.errors[key]);
      }
    });
  }

  it('accepts an ordinary address at the minimum length', () => {
    expect(checkCredentials('tienda@ejemplo.mx', 'a'.repeat(MIN_PASSWORD_LENGTH)).ok).toBe(true);
    expect(checkCredentials('tienda@ejemplo.mx', 'a'.repeat(MIN_PASSWORD_LENGTH - 1)).ok).toBe(false);
  });

  // ⚠️ NOT A VALIDATOR, AND THIS IS THE ASSERTION THAT SAYS SO. Every stricter
  // rule in circulation rejects addresses that are legal and in use; refusing a
  // real customer's address at the door is worse than one wasted round trip.
  it('lets unusual but legal addresses through to the server, which decides', () => {
    for (const address of [
      'niño+pedidos@ejemplo.com.mx',
      "o'brien@ejemplo.mx",
      'a_b-c.d@sub.dominio.mx',
      'DOÑA@EJEMPLO.MX',
    ]) {
      expect(checkCredentials(address, 'secreto').ok).toBe(true);
    }
  });
});
