// ============================================================================
// THE THIRD ENVIRONMENT VARIABLE, AND THE ONLY OTHER MODULE THAT READS ONE.
// Plan task `5P-a`; `R7`, amended the same day.
//
// `EXPO_PUBLIC_PILOT` set when the bundle is made turns on §5's readings and
// names the build they are filed under (`0043`'s `build`). Unset, and not one
// reading is taken — which is how every build that is not for the pilot is
// made. `@/pilot/readings`' `pilotBuildOf` decides what counts as set.
//
// ⚠️ IT IS NOT IN `lib/supabase.ts` WITH THE OTHER TWO, deliberately. That
// module creates the live client at module scope, and its importers are pinned
// at two by `app/test/auth-errors.test.ts`; the recorder, the hook and the
// panel reading a flag through it would be three more. So this file is the
// second place `process.env` may be read, and `docs/checks/conventions-gate.sh`
// names it — the member expression is written out in full, `R7`'s one rule.
// ============================================================================

import { pilotBuildOf } from '@/pilot/readings';

export const PILOT_BUILD: string | null = pilotBuildOf(process.env.EXPO_PUBLIC_PILOT);
