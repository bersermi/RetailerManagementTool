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
    /**
     * ⚠️ THE TWO FIELDS THAT ONLY EXIST ON THE SIGN-UP HALF (5b.7). The owner
     * asked for them by name on 2026-09-18 — *"Nombre y Apellido"* — and ruled
     * the same day that BOTH are required. Two boxes and not one, because a
     * rule about spaces inside one box is a rule about how a Spanish name is
     * SHAPED, and Spanish routinely carries two surnames: `María del Carmen
     * Rodríguez Gómez` breaks every split anyone would write.
     */
    nameLabel: 'Nombre',
    surnameLabel: 'Apellido',
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    /** C1.4's other way in (5a-iii-b). The provider is named because the
     *  person has to recognise which account they are about to use. */
    google: 'Entrar con Google',
    /**
     * ⚠️ THE SWITCH BETWEEN THE SCREEN'S TWO HALVES, AND UNTIL 5b.7 THESE WERE
     * DEAD COPY. They were written at 5a-iii-a for a shape that never shipped —
     * the screen had two buttons and no halves, so neither string had a reader.
     * `5b.7` gave the screen halves (two fields a returning person must never
     * be shown) and these are what moves between them.
     */
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
      /** ⚠️ SIGN-UP ONLY (5b.7). Nothing on the sign-in path can produce
       *  either of these — a person coming back does not type their name. */
      nameMissing: 'Escribe tu nombre.',
      surnameMissing: 'Escribe tu apellido.',
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
   * AJUSTES — THE SHEET, AND EVERYTHING ON IT THAT ONLY READS (5b-ii-a).
   *
   * §2.8 fixed Ajustes as a sheet and not a tab, and this is the app's first
   * non-tab surface. Four sections: the shop, the code a person shares, who is
   * in the shop, and how big this phone's text is.
   *
   * ⚠️ `Ajustes` AND NOT `Configuración`. The plan calls it both; §2.8's own
   * table says **Ajustes**, and it is the shorter of the two on a tab-less
   * header a shopkeeper reads at arm's length.
   */
  settings: {
    title: 'Ajustes',
    close: 'Cerrar',
    /** The shop's own section. The name is the one answered at onboarding. */
    shopSection: 'Tu tienda',
    ivaIncluded: 'Los precios ya incluyen IVA',
    ivaExcluded: 'El IVA se agrega aparte',
    /** C11.7's section. "Not a protagonist at all in our UI." */
    codeSection: 'Código de tu tienda',
    codeHint: 'Compártelo con quien quieras que entre a tu tienda.',
    share: 'Compartir código',
    /** C3.18's control, finally on the surface it was always meant for. */
    densitySection: 'Tamaño de la letra',
    densityHint: 'Elige el tamaño que se lea mejor en este teléfono.',
  },

  /**
   * WHO IS IN THE SHOP (5b-ii-a).
   *
   * ⚠️⚠️ NO NAME APPEARS ANYWHERE HERE, AND THAT IS A RULING, NOT A GAP. The
   * owner ruled on 2026-09-14 that a member row is **identified by email**,
   * with the caller's own row labelled *Tú* — because no table in this schema
   * carries a human name and he ruled against the migration that would have
   * added one.
   */
  members: {
    section: 'Quién entra a tu tienda',
    /** The caller's own row. The ruling of 2026-09-14, in one word. */
    you: 'Tú',
    /**
     * ⚠️ THE THREE ROLES IN SPANISH, AND THEY DOUBLE AS AN IDENTITY. A member
     * whose email this app cannot recover — in practice the founding owner,
     * whose membership no invite precedes — is named by what he IS. See
     * `Identity` in `@/api/members`.
     */
    roles: {
      owner: 'Dueño',
      manager: 'Encargado',
      staff: 'Empleado',
    },
    /** While the two reads are still out. Never a spinner with no word beside it. */
    loading: 'Un momento…',
    /**
     * ⚠️ REACHABLE ONLY IN A SHOP OF ONE, which is every shop on its first day.
     * It says what to do next rather than reporting a count, because a
     * shopkeeper alone in her shop does not need to be told she is alone.
     */
    alone: 'Por ahora solo estás tú. Comparte el código para que entre alguien más.',
    /**
     * ⚠️⚠️ THE ONE FUNCTION IN THIS FILE, AND THE HEADER ABOVE SAYS THE FILE IS
     * FLAT LITERALS. The deviation is deliberate and it is the smaller of two:
     * the alternative is assembling this sentence out of fragments at the call
     * site, which puts its GRAMMAR — word order, punctuation, where the code
     * sits relative to the shop's name — in `@/api/members`, and grammar is
     * precisely what a second language would have to change. A template still
     * fails the typecheck on a missing key, which is the whole benefit this
     * file exists for before there is an i18n runtime.
     *
     * ⚠️ IT CARRIES THE SHOP'S NAME BECAUSE A CODE ALONE IS EIGHT CHARACTERS IN
     * A CHAT WINDOW THREE WEEKS LATER — `4.6a-iii`'s decision 3, one layer out.
     */
    shareMessage: (shopName: string, code: string) =>
      `Entra a ${shopName} en Wera. Tu código es ${code}`,
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
