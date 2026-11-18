import { rutaDelEnlace } from '@/lib/enlaces';

// ============================================================================
// EVERY LINK THE PHONE HANDS ITACATE PASSES HERE FIRST (Expo Router's `+native-intent`). Plan task `10.9c`:
// a kitchen's address on tu-wera.com — `https://tu-wera.com/cocina/?k=<her id>&n=<her name>` — becomes her
// page's route, `/cocina/<id>` (`@/lib/enlaces`, pinned by `test/enlaces.test.ts`); anything else, the
// sign-in's return above all, goes on as it came. ⚠️ IT MUST NEVER THROW: an error here can close the app
// as it opens (Expo Router's own warning), so a link it cannot read is passed on untouched.
// ============================================================================

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return rutaDelEnlace(path) ?? path;
  } catch {
    return path;
  }
}
