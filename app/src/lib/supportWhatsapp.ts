// ============================================================================
// THE FOURTH ENVIRONMENT VARIABLE. Plan task `5R-h`; `R7`, amended the same day.
//
// `EXPO_PUBLIC_SUPPORT_WHATSAPP` is the number *¿Olvidaste tu contraseña?*
// opens a chat with. It lives in the gitignored `app/.env.local` because the
// repository is public; unset, `Entrar` draws no link. `@/auth/support`'s
// `supportNumberOf` decides what counts as set.
//
// ⚠️ ITS OWN MODULE FOR `pilotFlag.ts`' REASON: `lib/supabase.ts` creates the
// live client at module scope and its importers are pinned. The member
// expression is written out in full — Expo inlines nothing else.
// ============================================================================

import { supportNumberOf } from '@/auth/support';

export const SUPPORT_WHATSAPP: string | null = supportNumberOf(
  process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP,
);
