import { describe, expect, it } from 'vitest';

import { forgotPasswordUrl, supportNumberOf } from '@/auth/support';
import { ES } from '@/strings';

// ============================================================================
// ¿OLVIDASTE TU CONTRASEÑA? Plan task `5R-h`.
//
// Two values a customer is affected by: whether the link is drawn at all, and
// the chat it opens. ⚠️ The number here is a made-up one — the real one never
// enters this repository, which is public.
// ============================================================================

const FAKE = '525500000000';

describe('a build with no number draws no link', () => {
  it('is null when unset or blank', () => {
    expect(supportNumberOf(undefined)).toBeNull();
    expect(supportNumberOf('')).toBeNull();
    expect(supportNumberOf('   ')).toBeNull();
  });

  // ⚠️ TEN DIGITS IS A MEXICAN NUMBER WITHOUT ITS COUNTRY CODE, and `wa.me`
  // would read it as some other country's. Refused, rather than guessed at.
  it('refuses a number with no country code', () => {
    expect(supportNumberOf('5500000000')).toBeNull();
  });

  it('refuses anything that is not digits', () => {
    expect(supportNumberOf('52 55 abcd 0000')).toBeNull();
  });
});

describe('a number is read the way a person copies one', () => {
  it('drops a plus, spaces, dashes and brackets', () => {
    expect(supportNumberOf('+52 (55) 0000-0000')).toBe(FAKE);
    expect(supportNumberOf(` ${FAKE}\n`)).toBe(FAKE);
  });
});

describe('the chat the link opens', () => {
  it('goes to wa.me, which falls back to the web without WhatsApp', () => {
    expect(forgotPasswordUrl(FAKE, '')).toMatch(/^https:\/\/wa\.me\/525500000000\?text=/);
  });

  it('names the typed address, so the owner knows who is asking', () => {
    const url = forgotPasswordUrl(FAKE, '  doña.wera@ejemplo.mx ');
    const text = new URL(url).searchParams.get('text');
    expect(text).toBe(ES.auth.forgotMessageWithEmail('doña.wera@ejemplo.mx'));
    expect(text).toContain('doña.wera@ejemplo.mx');
  });

  it('says nothing about an address when the box is empty', () => {
    const text = new URL(forgotPasswordUrl(FAKE, '  ')).searchParams.get('text');
    expect(text).toBe(ES.auth.forgotMessage);
  });

  // ⚠️ AN UNENCODED `&` OR `+` IN AN ADDRESS WOULD CUT THE MESSAGE SHORT or
  // turn into a space; both are legal in an email.
  it('survives the characters a URL would eat', () => {
    const text = new URL(forgotPasswordUrl(FAKE, 'a+b&c@ejemplo.mx')).searchParams.get('text');
    expect(text).toContain('a+b&c@ejemplo.mx');
  });
});
