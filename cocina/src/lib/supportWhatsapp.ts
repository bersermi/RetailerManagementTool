// ============================================================================
// THE THIRD ENVIRONMENT VALUE THE BUNDLE READS. Plan task `10.4b-iv-b`.
//
// ⚠️ WERA'S MODULE, COPIED (`app/src/lib/supportWhatsapp.ts`, plan `5R-h`).
// `EXPO_PUBLIC_SUPPORT_WHATSAPP` is the number *¿Olvidaste tu contraseña?* opens
// a chat with. On EAS it is this project's own variable (`preview` and
// `production`, Wera's value); on this Mac, the gitignored `cocina/.env.local`.
// Unset, *Entrar* draws no link, and `ship-an-update.sh --app cocina` refuses to
// publish — so a published update always carries the link. `@/auth/support`'s
// `supportNumberOf` decides what counts as set.
//
// ⚠️ ITS OWN MODULE so `@/auth/support` stays pure for the suite, and the member
// expression is written out in full — Expo inlines nothing else. Metro writes
// the value into the JavaScript bundle, not the native config, so it does not
// move this app's runtime (`fingerprint.config.js`).
// ============================================================================

import { supportNumberOf } from '@/auth/support';

export const SUPPORT_WHATSAPP: string | null = supportNumberOf(
  process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP,
);
