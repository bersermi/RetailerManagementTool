// ============================================================================
// ¿OLVIDASTE TU CONTRASEÑA? — BY WHATSAPP, TO A PERSON. Plan task `10.4b-iv-b`.
//
// ⚠️ WERA'S RULE AND WERA'S CODE, COPIED (`app/src/auth/support.ts`, plan `5R-h`,
// whose header carries the reasons in full). The owner's ruling of 2026-10-09:
// there is no self-service reset. The link on *Entrar* opens a WhatsApp chat
// with him, and he sets a new password by hand (`docs/runbooks/reset-a-password.sh`).
// One login serves both apps, so a password reset there is a reset here.
//
// ⚠️ THE NUMBER IS NOT IN THIS REPOSITORY, WHICH IS PUBLIC. It arrives through
// `EXPO_PUBLIC_SUPPORT_WHATSAPP` (`@/lib/supportWhatsapp`), this EAS project's
// own variable since `10.4b-iv-b`, and a build made without it has no link at
// all — `supportNumberOf` returns `null` and the screen draws nothing, rather
// than a link to nobody.
//
// ⚠️ `https://wa.me/` AND NOT `whatsapp://`: the https link opens WhatsApp when
// it is installed and WhatsApp's web page when it is not, with no native change.
//
// `test/support.test.ts` runs Wera's two functions beside these over the same
// numbers, so the copies cannot drift apart.
// ============================================================================

import { ES } from '@/strings';

/**
 * The number as `wa.me` wants it — country code and digits, no `+` — or `null`
 * when the build carries none. Spaces, dashes and a leading `+` are forgiven,
 * because that is how a person copies a number; anything shorter than a
 * country code plus ten digits is not a Mexican number and gets no link.
 */
export function supportNumberOf(raw: string | undefined): string | null {
  const digits = (raw ?? '').replace(/[\s()+-]/g, '');
  return /^\d{11,15}$/.test(digits) ? digits : null;
}

/**
 * The chat to open. The message names the address typed above, so the owner
 * knows which account is asking without a round of questions — and says
 * nothing about one when the box is empty. It names this app too: the login
 * is Wera's, and the owner answers a fonda knowing she is one.
 */
export function forgotPasswordUrl(number: string, email: string): string {
  const typed = email.trim();
  const text = typed === '' ? ES.auth.forgotMessage : ES.auth.forgotMessageWithEmail(typed);
  return whatsappUrl(number, text);
}

/** A chat with `number`, `text` already typed in it. */
export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
