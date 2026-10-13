import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AVISO_URL } from '@/auth/aviso';
import { checkSignUp } from '@/auth/credentials';
import { ES } from '@/strings';

// ============================================================================
// THE AVISO DE PRIVACIDAD, AS THE APP OFFERS IT. Plan task `5R-d-iii`.
//
// Three values a person is affected by: whether an account can be made without
// ticking the box, the words the owner ruled, and the address the link opens.
// No component is reached (`R2`); whether the row reads well at the large
// density, and whether the words inside it open the page, is a look on a phone.
// ============================================================================

const GOOD = ['tienda@ejemplo.mx', 'secreto', 'Wera', 'Ramírez'] as const;

describe('no account is made by the email door without the box ticked', () => {
  it('refuses an unticked box, in Spanish', () => {
    const checked = checkSignUp(...GOOD, false);
    expect(checked.ok).toBe(false);
    if (!checked.ok) {
      expect(checked.key).toBe('avisoMissing');
      expect(checked.message).toBe(ES.auth.errors.avisoMissing);
    }
  });

  it('makes the account once it is ticked', () => {
    expect(checkSignUp(...GOOD, true).ok).toBe(true);
  });

  // ⚠️ THE BOX IS THE LAST ROW BEFORE THE BUTTON, SO IT IS THE LAST REFUSAL. A
  // person who left a name empty AND the box unticked is told about the name,
  // which is higher on the screen — the order `checkSignUp`'s header promises.
  it('names an empty box above it first', () => {
    const noName = checkSignUp('tienda@ejemplo.mx', 'secreto', '', 'Ramírez', false);
    expect(noName.ok).toBe(false);
    if (!noName.ok) expect(noName.key).toBe('nameMissing');

    const noSurname = checkSignUp('tienda@ejemplo.mx', 'secreto', 'Wera', '', false);
    expect(noSurname.ok).toBe(false);
    if (!noSurname.ok) expect(noSurname.key).toBe('surnameMissing');

    const noEmail = checkSignUp('', 'secreto', 'Wera', 'Ramírez', false);
    expect(noEmail.ok).toBe(false);
    if (!noEmail.ok) expect(noEmail.key).toBe('emailMissing');
  });
});

describe('the words are the ones the owner ruled', () => {
  // ⚠️ EACH SENTENCE IS DRAWN AS TWO STRINGS, the lead and then the link, so a
  // lead that lost its trailing space would print "elAviso" and every check
  // that reads the strings one at a time would still pass.
  it('reads the checkbox as one sentence (2026-10-10)', () => {
    expect(`${ES.auth.avisoAcceptLead}${ES.auth.aviso}`).toBe('Acepto el Aviso de privacidad');
  });

  it('reads the line under Google as one sentence (2026-10-12)', () => {
    expect(`${ES.auth.avisoGoogleLead}${ES.auth.aviso}`).toBe(
      'Al continuar, aceptas el Aviso de privacidad',
    );
  });
});

describe('the link opens the page the site publishes', () => {
  // ⚠️ THE STORES AND GOOGLE'S CONSENT SCREEN NAME THIS EXACT ADDRESS TOO
  // (the handbook's step 7), so it is pinned whole, scheme and trailing slash
  // included — not reassembled from parts that could each drift.
  it('is the address the stores are given', () => {
    expect(AVISO_URL).toBe('https://tu-wera.com/privacidad/');
  });

  // ⚠️ `site.yml` publishes `site/` as the domain's root, so a path here is a
  // folder there. This fails if either side is renamed without the other. It
  // cannot say the page is UP — `docs/checks/5R-d-ii-site-live.sh` asks the
  // domain that, by hand.
  it('names a page in site/', () => {
    const { pathname } = new URL(AVISO_URL);
    const page = fileURLToPath(new URL(`../../site${pathname}index.html`, import.meta.url));
    expect(existsSync(page)).toBe(true);
  });
});
