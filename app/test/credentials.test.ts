import { describe, expect, it } from 'vitest';

import {
  FULL_NAME_KEY,
  MIN_PASSWORD_LENGTH,
  checkCredentials,
  checkSignUp,
  joinName,
  normalizeEmail,
} from '@/auth/credentials';
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

// ============================================================================
// THE NAME, AND THE TWO RULES THAT ARE REACHABLE FROM EXACTLY ONE BUTTON.
// Plan task 5b.7, instructed by the owner 2026-09-18.
//
// ⚠️ THE VALUE THESE PIN IS ONE A CUSTOMER SEES — R2's test: `full_name` is
// what `5b.8` will put on another person's phone beside a role. A name that
// arrives double-spaced, reordered or title-cased is wrong there for as long as
// the account exists, and nothing downstream can tell it was us.
// ============================================================================

describe('the sign-up half asks for a name, and the sign-in half never does', () => {
  const GOOD = ['tienda@ejemplo.mx', 'secreto'] as const;

  // ⚠️ THE ASSERTION THAT KEEPS THE TWO HALVES APART. `checkCredentials` is what
  // a returning person's tap runs, and it must not have grown a name rule —
  // "nobody types their name to come back".
  it('leaves the returning path taking exactly two values', () => {
    expect(checkCredentials(...GOOD).ok).toBe(true);
    expect(checkCredentials.length).toBe(2);
  });

  const refusals: ReadonlyArray<readonly [string, string, string, keyof typeof ES.auth.errors]> = [
    ['no nombre', '', 'Ramírez', 'nameMissing'],
    ['a nombre of spaces', '   ', 'Ramírez', 'nameMissing'],
    ['no apellido', 'Wera', '', 'surnameMissing'],
    ['an apellido of spaces', 'Wera', ' \t ', 'surnameMissing'],
    ['neither', '', '', 'nameMissing'],
  ];

  for (const [name, first, last, key] of refusals) {
    it(`refuses ${name}, in Spanish`, () => {
      const checked = checkSignUp(...GOOD, first, last);
      expect(checked.ok).toBe(false);
      if (!checked.ok) {
        expect(checked.key).toBe(key);
        expect(checked.message).toBe(ES.auth.errors[key]);
      }
    });
  }

  // ⚠️ THE ORDER IS THE SCREEN'S ORDER, AND IT IS ASSERTED RATHER THAN ASSUMED.
  // An empty address with an empty name must say `Escribe tu correo`, because
  // that is the topmost empty box — a message naming a field further down the
  // form is a person hunting for what they did wrong.
  it('refuses the address and the password before it looks at the name', () => {
    const noEmail = checkSignUp('', 'secreto', '', '');
    expect(noEmail.ok).toBe(false);
    if (!noEmail.ok) expect(noEmail.key).toBe('emailMissing');

    const shortPassword = checkSignUp('tienda@ejemplo.mx', 'abc', '', '');
    expect(shortPassword.ok).toBe(false);
    if (!shortPassword.ok) expect(shortPassword.key).toBe('passwordShort');
  });

  // ⚠️⚠️ THE RULE IS "NEITHER BOX IS BLANK", AND NOTHING ELSE IS ASSERTED ABOUT
  // EITHER. Two boxes rather than a rule about spaces, because a split-on-space
  // heuristic decides what a Spanish name may look like — and two surnames are
  // ordinary here. `Rodríguez Gómez` in the apellido box is one surname to this
  // code and two to the person, which is exactly the right amount of opinion.
  it('accepts a name with two surnames, and joins it in the order typed', () => {
    const checked = checkSignUp(...GOOD, 'María del Carmen', 'Rodríguez Gómez');
    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.fullName).toBe('María del Carmen Rodríguez Gómez');
  });

  it('accepts one word in each box', () => {
    const checked = checkSignUp(...GOOD, 'Wera', 'Ramírez');
    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.fullName).toBe('Wera Ramírez');
  });

  // ⚠️ THE AUTOCOMPLETE BAR'S TRAILING SPACE, AND A DOUBLE SPACE BETWEEN THE
  // BOXES. Both would be stored and then shown, for ever.
  it('trims the ends and collapses the middle, and changes nothing else', () => {
    expect(joinName('  Wera ', ' Ramírez  ')).toBe('Wera Ramírez');
    expect(joinName('José  Luis', 'de la  Cruz')).toBe('José Luis de la Cruz');
    // Not title-cased, not reordered: this is how somebody writes their own name.
    expect(joinName('ANA', 'de la Cruz')).toBe('ANA de la Cruz');
  });

  // ⚠️⚠️ THE KEY IS GOOGLE'S, NOT OURS, AND THAT IS WHY IT IS PINNED HERE. The
  // provider writes the name it is handed into `raw_user_meta_data.full_name`;
  // matching that spelling is what lets `5b.8` have ONE reader for both ways in.
  // ⚠️ THIS ASSERTION CANNOT PROVE THE ROUND TRIP — that the metadata survives
  // `signUp` is a claim about somebody else's system, and §9 says a green CI run
  // settles those: `docs/checks/5b.7-signup-name-contract.sh`.
  it('sends it under the key Google already writes', () => {
    expect(FULL_NAME_KEY).toBe('full_name');
  });
});
