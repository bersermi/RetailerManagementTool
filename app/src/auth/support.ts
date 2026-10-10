// ============================================================================
// ¿OLVIDASTE TU CONTRASEÑA? — BY WHATSAPP, TO A PERSON. Plan task `5R-h`.
//
// The owner's ruling, 2026-10-09: there is no self-service reset. The link on
// `Entrar` opens a WhatsApp chat with him, and he sets a new password by hand
// (`docs/runbooks/reset-a-password.sh`). A reset email needs a real mail
// provider first, which is `5R-j`, parked.
//
// ⚠️ THE NUMBER IS NOT IN THIS REPOSITORY, WHICH IS PUBLIC. It arrives through
// `EXPO_PUBLIC_SUPPORT_WHATSAPP` (`@/lib/supportWhatsapp`), and a build made
// without it has no link at all — `supportNumberOf` returns `null` and the
// screen draws nothing, rather than a link to nobody.
//
// ⚠️ `https://wa.me/` AND NOT `whatsapp://`. The https link opens WhatsApp when
// it is installed and WhatsApp's web page when it is not, so the fallback the
// ruling asks for is the link's own behaviour. `whatsapp://` would need
// `canOpenURL`, which iOS answers `false` for any scheme not declared in
// `LSApplicationQueriesSchemes` — a native change for a fallback we get free.
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
 * nothing about one when the box is empty.
 */
export function forgotPasswordUrl(number: string, email: string): string {
  const typed = email.trim();
  const text = typed === '' ? ES.auth.forgotMessage : ES.auth.forgotMessageWithEmail(typed);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
