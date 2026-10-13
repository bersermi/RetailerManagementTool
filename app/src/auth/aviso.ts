// ============================================================================
// THE AVISO DE PRIVACIDAD, AS THE APP REACHES IT. Plan task `5R-d-iii`.
//
// The aviso is a web page, `site/privacidad/index.html`, published by
// `.github/workflows/site.yml` to tu-wera.com (`5R-d-ii`). The app carries a
// link to it and never a copy: the page is the one text, and its top box is the
// short notice Art. 16.II requires, so the screen needs nothing more than the
// words the owner ruled.
//
// ⚠️ THREE PLACES OPEN IT, AND THEY ARE THE OWNER'S RULINGS OF 2026-10-10 AND
// 2026-10-12. The checkbox on *Crear cuenta* (*"Acepto el Aviso de privacidad"*,
// ticked before the account is made — `checkSignUp` refuses otherwise); the line
// under *Entrar con Google*, because a first Google sign-in creates the account
// without passing *Crear cuenta* (tacit consent, Art. 7, so no second box); and
// *Ajustes → Tu cuenta*.
//
// ⚠️⚠️ THE PATH IS A PROMISE ON BOTH SIDES. The store listings and Google's
// consent screen name `https://tu-wera.com/privacidad/` too, so renaming the
// folder under `site/` breaks every installed app and both stores at once —
// over the air for the app, and by hand for the rest. `app/test/aviso.test.ts`
// fails if this address stops naming a page in `site/`.
//
// ⚠️ IT IS OPENED WITH `openBrowserAsync`, NOT `Linking.openURL`. The in-app
// browser sits over the screen and closes back onto it, so a person who reads
// the aviso halfway through *Crear cuenta* returns to the fields they typed.
// `Linking` hands them to Safari or Chrome and leaves them to find the way back.
// ============================================================================

/** The page every link in the app opens. */
export const AVISO_URL = 'https://tu-wera.com/privacidad/';
