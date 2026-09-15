// ============================================================================
// EVERY WORD THE APP SAYS, IN ONE FILE. ADR-035 §2.11:
//
//   "Strings — hardcoded Spanish, centralised in one file. No i18n runtime in
//    v1. Centralising costs nothing now and makes a second language a refactor
//    instead of an excavation."
//
// ⚠️ THE MODULE NAMES ARE NOT TRANSLATIONS AND MUST NOT BE TRANSLATED. Comprar,
// Vender, Productos, Proveedores, Desperdicio, Números are the domain
// vocabulary of this system (CLAUDE.md, ADR-035 §2.8) — they are what the
// shopkeeper calls these things and what the schema calls them. An English
// build of this app would still have a `Vender` screen.
//
// It is a flat object of literal strings, not a function and not a lookup: a
// missing key is a typecheck failure, which is the whole benefit available
// before there is a second language.
// ============================================================================

export const ES = {
  /** Tab-bar labels. C12.1: the icon NEVER appears without its word. */
  tabs: {
    inicio: 'Inicio',
    vender: 'Vender',
    comprar: 'Comprar',
    desperdicio: 'Desperdicio',
  },

  /** C3.18's two modes, as a person picking one would read them. */
  density: {
    normal: 'Normal',
    elder: 'Letra grande',
  },

  /**
   * The way in (C1.4), and everything it can say when it goes wrong.
   *
   * ⚠️ NOTHING SUPABASE RETURNS IS EVER SHOWN. Its messages are English, they
   * name internal states (`invalid_credentials`, `over_request_rate_limit`),
   * and a shopkeeper being handed one is the failure ADR-035 §2.8 and the
   * owner's own rule both refuse: WE DO THE BOOKKEEPING, NOT THEM.
   * `app/src/auth/errors.ts` maps a code to a KEY of `errors` below — a key,
   * not a string, so a sentence typed in place at the call site is a
   * typecheck failure rather than a second copy nobody notices.
   */
  auth: {
    title: 'Wera',
    emailLabel: 'Correo',
    passwordLabel: 'Contraseña',
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    /** C1.4's other way in (5a-iii-b). The provider is named because the
     *  person has to recognise which account they are about to use. */
    google: 'Entrar con Google',
    toSignUp: '¿No tienes cuenta? Crear una',
    toSignIn: '¿Ya tienes cuenta? Entrar',
    signOut: 'Cerrar sesión',
    working: 'Un momento…',
    /** After a sign-up when the project has confirmations on. Off today. */
    checkEmail: 'Te enviamos un correo para confirmar tu cuenta.',
    errors: {
      /** Wrong password, or no such account. Deliberately one message: which
       *  of the two it is tells a stranger whether the address has an account. */
      badCredentials: 'El correo o la contraseña no son correctos.',
      emailTaken: 'Ese correo ya tiene una cuenta. Entra con tu contraseña.',
      emailInvalid: 'Ese correo no se ve bien. Revísalo.',
      emailMissing: 'Escribe tu correo.',
      passwordMissing: 'Escribe tu contraseña.',
      passwordShort: 'La contraseña necesita al menos 6 letras o números.',
      notConfirmed: 'Todavía falta confirmar tu correo.',
      tooMany: 'Demasiados intentos. Espera un minuto y vuelve a intentar.',
      offline: 'Sin conexión a internet. Intenta de nuevo en un momento.',
      /** ⚠️ THE ROUND TRIP CAME BACK WRONG, AND IT NAMES THE BUTTON ON
       *  PURPOSE. A shopkeeper who tapped Google and is told "algo salió mal"
       *  does not know that the other way in still works; this sentence points
       *  at the one that does. ⚠️ IT IS NEVER SHOWN FOR A CANCELLATION —
       *  closing the browser or backing out of Google's chooser produces no
       *  message at all, because the person already knows what they did. */
      googleFailed: 'No se pudo entrar con Google. Intenta de nuevo, o entra con tu correo.',
      /** ⚠️ THE CATCH-ALL, AND IT SAYS NOTHING ABOUT THE CAUSE ON PURPOSE. An
       *  unmapped error is one we have not seen; guessing at it in Spanish is
       *  worse than admitting it, and the developer reads the real one in the
       *  console. */
      unknown: 'Algo salió mal. Intenta de nuevo.',
    },
  },

  /**
   * THE FIRST SCREEN AFTER THE WAY IN, AND ONLY FOR SOMEONE WHO BELONGS TO NO
   * SHOP YET (5b-i). Two questions, and the second one is C1.7.
   *
   * ⚠️ THE IVA QUESTION IS ADR-035's OWN WORDING, NOT A PARAPHRASE. §2.8 wrote
   * it — *¿Tus precios ya incluyen IVA?* — and `workspace.prices_include_tax`
   * is commented with the same sentence in `0001`. It decides how every
   * recorder splits net from tax for the life of the shop, so the wording is
   * quoted rather than improved on.
   *
   * ⚠️ AND IT IS ASKED ONCE, OF SOMEONE WHO DOES NOT DO BOOK-KEEPING. The hint
   * names the thing in their hand — the price on the label — because "inclusive
   * of value added tax" is our vocabulary and not theirs.
   */
  onboarding: {
    title: 'Tu tienda',
    nameLabel: '¿Cómo se llama tu tienda?',
    ivaQuestion: '¿Tus precios ya incluyen IVA?',
    ivaHint: 'Es el precio de la etiqueta, el que paga el cliente.',
    ivaYes: 'Sí, ya lo incluyen',
    ivaNo: 'No, se agrega aparte',
    create: 'Crear mi tienda',
  },

  /**
   * WHAT THE SHOPKEEPER IS TOLD WHEN A CALL TO THE SERVER FAILS (5b-i).
   *
   * ⚠️ THE SAME RULE AS `auth.errors` AND FOR THE SAME REASON: nothing
   * PostgREST returns is ever shown. Its messages are English, they name
   * internal states (`permission denied for function onboard_workspace`), and
   * a shopkeeper handed one is the failure the owner's own rule refuses — WE
   * DO THE BOOK-KEEPING, NOT THEM. `app/src/api/errors.ts` maps a code to a
   * KEY of this table.
   */
  api: {
    errors: {
      nameMissing: 'Escribe el nombre de tu tienda.',
      /** ⚠️ THE SESSION IS GONE, WHICH IS A `42501` FROM POSTGRES AND NOT A
       *  SIGN-IN FAILURE. It is the one API error with a next step a person
       *  can take, so it names it. */
      sessionEnded: 'Tu sesión se cerró. Entra de nuevo.',
      offline: 'Sin conexión a internet. Intenta de nuevo en un momento.',
      unknown: 'Algo salió mal. Intenta de nuevo.',
    },
  },

  /**
   * ⚠️ SCAFFOLDING, AND IT IS DELETED BY THE TASK THAT BUILDS EACH SCREEN.
   * 5a-ii ships the shell — the tab bar, the scale and the formatter — and
   * three of its four routes are empty rooms with the right name on the door.
   * The screens themselves are 5d–5h.
   */
  placeholder: {
    pending: 'Esta pantalla todavía no existe.',
  },
} as const;
