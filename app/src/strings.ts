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
   * THE OTHER HALF OF THE SAME LANDING — SHE WAS INVITED, AND SHE IS NOT HERE TO
   * CREATE A SHOP AT ALL. Plan task 5b-ii-b-2.
   *
   * ⚠️⚠️ ONE BOX, NOT TWO, AND THE APP DECIDES WHICH CREDENTIAL IT IS. An invite
   * token is sixteen characters of the same Crockford alphabet as the eight
   * character join code, normalised by the same function — so they are
   * indistinguishable except by LENGTH, and the person holding one was sent it in
   * a WhatsApp message with no label on it. ⚠️ ASKING HER WHICH KIND SHE HAS IS
   * THE APP HANDING A PERSON AN INTERNAL STATE, which is the owner's own standing
   * rule. See `@/api/redeem`, and the `5b-ii-b` sizing's decision 2.
   *
   * ⚠️ THE WORDS ARE HERS AND NOT OURS. `código` and never `token`; `la persona
   * que te invitó` and never `el emisor de la invitación`. She is a cashier
   * standing in a shop with somebody's phone message open.
   */
  join: {
    /** ⚠️ A QUESTION, BECAUSE IT IS ALSO THE SIGN THAT THIS HALF IS FOR HER. */
    section: '¿Te invitaron a una tienda?',
    hint: 'Escribe el código que te mandaron.',
    label: 'Código de invitación',
    submit: 'Entrar a la tienda',
    working: 'Entrando…',

    /** What the box refuses before it calls. See `checkCredential`. */
    issues: {
      missing: 'Escribe el código que te mandaron.',
      /**
       * ⚠️ ANY LENGTH THAT IS NEITHER. It says what to do rather than what is
       * wrong, because "sixteen characters" is our arithmetic and not hers.
       */
      shape: 'Ese código no está completo. Revísalo y escríbelo otra vez.',
    },

    /**
     * ⚠️ TWO SENTENCES FOR FOUR REFUSALS, AND THE COLLAPSING IS DELIBERATE.
     * `0028` distinguishes expired from superseded, and not-valid from
     * already-used; she cannot act on the difference in either pair, and the
     * owner's rule is that we do the book-keeping and not her.
     */
    errors: {
      /** Expired, or replaced by a newer invite to the same address. */
      expired: 'Ese código ya venció. Pídele uno nuevo a la persona que te invitó.',
      /** Not a real code, or somebody else already used it. */
      spent: 'Ese código ya no sirve. Pídele uno nuevo a la persona que te invitó.',
    },

    // ------------------------------------------------------------------------
    // THE PULL PATH. Plan task 5b-iii-b, and every sentence below is for the
    // person who typed the SHOP's code rather than an invite token.
    // ------------------------------------------------------------------------

    /**
     * What she is told when `request_access` refuses. See `REQUEST_REFUSALS`.
     *
     * ⚠️ THEY ARE SEPARATE FROM `errors` ABOVE THOUGH BOTH ARE "the code did not
     * work", because the NEXT STEP differs and the next step is the whole
     * content of a refusal. A dead invite token is somebody else's to reissue —
     * *"ask them for a new one"*. A shop code that matches nothing is hers to
     * re-read — *"check it and type it again"*. Telling her to ask for a new one
     * when she has simply mistyped is sending her to bother a person for nothing.
     */
    requestErrors: {
      /**
       * ⚠️⚠️ NO SUCH SHOP, OR THE SHOP IS CLOSED, OR — the overload
       * `@/api/requests` argues — HER SESSION ENDED. It says what to DO, which
       * is the same instruction under all three, and names neither our internal
       * state nor a distinction she cannot act on.
       */
      noSuchShop: 'Ese código no es de ninguna tienda. Revísalo y escríbelo otra vez.',
      /**
       * ⚠️ A PHONE-ONLY ACCOUNT, WHICH C1.4 DOES NOT ADMIT — `0029` calls it a
       * wall rather than a branch. Unreachable in v1 and written anyway, because
       * the alternative is the catch-all sentence for the one refusal she could
       * actually fix.
       */
      noEmail: 'Tu cuenta no tiene correo. Entra con Google o con tu correo para pedir acceso.',
      /** Her earlier request lapsed or was replaced. Asking again is free. */
      requestExpired: 'Tu solicitud ya venció. Escribe el código otra vez para volver a pedir.',
    },

    /**
     * THE HALF LOOP, ON SCREEN. Plan task `5b-iii-b`.
     *
     * ⚠️⚠️ THE WAIT IS THE PRODUCT HERE AND IT IS SAID PLAINLY. Nothing in this
     * app can admit her until `5b-iii-d` ships the approval screen, so the
     * honest sentence is *"we asked, wait for them"* — and it stays honest
     * afterwards, because the wait is real either way: a person has to tap
     * approve. ⚠️ IT NAMES NO STATE AND NO ROW. She is told the thing she wanted
     * is true, which is §2.8's rule and the owner's standing one.
     */
    pending: {
      /** ⚠️ Takes the shop's name, for `4.6a-iii`'s reason: a code with no shop
       *  attached is eight characters she cannot place three days later. */
      title: (shop: string) => `Le pediste entrar a ${shop}.`,
      body: 'Ya avisamos. Cuando te acepten, la tienda se abre sola aquí.',
    },
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
   * YOUR OWN NAME, AND THE ONE BOX ON THIS SHEET EVERY MEMBER MAY USE. Plan
   * task 5b.8-iii-b.
   *
   * ⚠️⚠️ IT IS ITS OWN BLOCK AND NOT PART OF `settings`, BECAUSE `settings`'s
   * own header says what that block is: *"AJUSTES — THE SHEET, AND EVERYTHING
   * ON IT THAT ONLY READS."* This is a write, and `invite` was separated from
   * `settings` on exactly that line one task earlier.
   *
   * ✅✅ IT IS NOT FENCED BY ROLE — RULED BY THE OWNER, 2026-09-19: *"everybody
   * is right, keep it."* THAT IS THE WHOLE POINT AND IT IS THE OPPOSITE
   * OF THE TWO SECTIONS EITHER SIDE OF IT. The roster is manager-and-above and
   * so is inviting; fixing your own name is for everybody, because the person
   * whose Google account came through as one word is most often the cashier,
   * and she is the one member of the shop who can see neither of the others.
   *
   * ⚠️ `errors.nameMissing` IS THE SAME SENTENCE AS `auth.errors.nameMissing`
   * AND IS WRITTEN TWICE ON PURPOSE. The tables are what the KEYS are typed
   * against — `api/errors.ts`'s discipline — so sharing a key across two of
   * them would be the one thing this file's shape exists to prevent. `offline`
   * already sits verbatim in `auth.errors` and in `api.errors` for the same
   * reason, and that duplication has been correct since 5b-i.
   */
  myName: {
    section: 'Tu nombre',
    /** ⚠️ IT SAYS WHERE THE NAME IS SEEN, WHICH IS ALSO WHERE IT IS SCOPED.
     *  `set_my_display_name` fixes the name in ONE shop (`0035`), and *"en esta
     *  tienda"* is the only honest way to say so to somebody who does not do
     *  book-keeping — a sentence about workspaces would be our vocabulary. */
    hint: 'Así te ven los demás en esta tienda.',
    /** ⚠️ REACHABLE, AND IT IS THE GAP THE WHOLE TASK EXISTS FOR. `0034`'s
     *  column is nullable: an account whose metadata carried no name arrives
     *  with nothing, and until this box existed nobody could put one there. */
    empty: 'Todavía no pusiste tu nombre.',
    edit: 'Cambiar mi nombre',
    label: 'Tu nombre',
    placeholder: 'Nombre y apellido',
    save: 'Guardar',
    working: 'Guardando…',
    cancel: 'Cancelar',

    /** What the box refuses before it calls. See `checkDisplayName`. */
    issues: {
      missing: 'Escribe tu nombre.',
    },

    /**
     * ⚠️ THE TWO REFUSALS `0035` RAISES THAT ARE NOT WHAT THEIR SQLSTATE MEANS
     * EVERYWHERE ELSE — `@/api/displayName`'s header is the argument. Both are
     * mapped there, and everything else on this call still falls to
     * `ES.api.errors`, offline included.
     */
    errors: {
      nameMissing: 'Escribe tu nombre.',
      /** ⚠️ SHE IS NOT TOLD WHY, AND THERE IS NOTHING SHE CAN DO FROM HERE. It
       *  names the thing that changed rather than the internal state that
       *  produced it — a deactivated membership is our word, not hers. */
      notAMember: 'Ya no perteneces a esta tienda.',
    },
  },

  /**
   * Inviting somebody, and the code that comes back once. Plan task 5b-ii-b-1.
   *
   * ⚠️ THE WORD IS `invitar` AND NEVER `agregar`. Adding somebody is what an
   * owner thinks she is doing and it is not what happens: a code is issued, and
   * the other person has to act. Copy that promised the first would leave her
   * waiting for a colleague who is already in the shop as far as she knows.
   */
  invite: {
    section: 'Invitar a alguien',
    /** The control that opens the form. C12.1: an icon never travels alone. */
    open: 'Invitar a alguien',
    cancel: 'Cancelar',
    emailLabel: 'Correo de la persona',
    emailPlaceholder: 'nombre@correo.com',
    roleLabel: '¿Qué va a poder hacer?',
    /**
     * ⚠️ THE ROLES ARE DESCRIBED BY WHAT THEY DO, not by where they sit. A
     * shopkeeper choosing between `Encargado` and `Empleado` is choosing how
     * much of her shop somebody sees, and the noun alone does not say.
     */
    roleHelp: {
      manager: 'Ve toda la tienda y puede invitar a otros.',
      staff: 'Registra ventas y compras en las sucursales que le asignes.',
    },
    locationLabel: '¿En qué sucursal va a trabajar?',
    submit: 'Crear invitación',
    working: 'Creando…',

    /** What the form refuses before it calls, and why. See `checkInvite`. */
    issues: {
      emailMissing: 'Escribe el correo de la persona que quieres invitar.',
      emailShape: 'Ese correo no se ve bien. Revísalo.',
      locationMissing: 'Elige al menos una sucursal para esta persona.',
      /**
       * ⚠️ UNREACHABLE IN BOTH PILOT SHOPS AND WRITTEN ANYWAY. C1.5 says each
       * has one location, created by `onboard_workspace`, so a staff invite
       * always has somewhere to go. It is here because the alternative to a
       * sentence is a disabled button with no reason beside it.
       */
      noLocations: 'Esta tienda todavía no tiene sucursales.',
    },

    /** The result, which exists on this screen and nowhere else, ever. */
    issued: {
      title: 'Listo. Este es el código',
      /**
       * ⚠️⚠️ THE WHOLE POINT OF THE SCREEN, SAID PLAINLY. `0028` stores only a
       * hash, so there is no second look. A shopkeeper who closes this without
       * sending it has not lost anything she cannot redo — inviting again mints
       * a new code — and saying so is what stops the sentence reading as a
       * threat.
       */
      once: 'Solo se muestra una vez. Si lo pierdes, vuelve a invitar.',
      share: 'Enviar código',
      done: 'Listo',
      /** ⚠️ `0028` decision 6, and the one thing here a person would call a bug. */
      replaced: 'Ya habías invitado a esta persona. El código anterior dejó de servir.',
      expires: (day: string) => `Sirve hasta el ${day}.`,
    },

    /**
     * ⚠️ THE ONE REFUSAL FROM THE SERVER WITH A NEXT STEP, and the step is on a
     * screen nobody has built yet (`5b-iii`). It says what happened and does not
     * promise a button that is not there.
     */
    alreadyRequested: 'Esta persona ya pidió entrar a tu tienda. Te va a aparecer para aceptarla.',

    /**
     * ⚠️ IT CARRIES THE SHOP'S NAME for `4.6a-iii`'s recorded reason — a code
     * with no shop attached is sixteen characters in a chat window three weeks
     * later. Same shape and same argument as `members.shareMessage`; the
     * deviation from flat literals is that file's, argued there.
     */
    shareMessage: (shopName: string, token: string) =>
      `Te invité a ${shopName} en Wera. Tu código es ${token}`,
  },

  /**
   * Dates, for the one value that has one. Plan task 5b-ii-b-1.
   *
   * ⚠️ A TABLE AND NOT `Intl.DateTimeFormat`, and `@/format/date`'s header
   * carries the argument: Hermes ships a partial ICU and this app has already
   * been crashed on launch by exactly that, on the owner's own phone.
   */
  dates: {
    months: [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ] as readonly string[],
    /** ⚠️ The grammar lives here, not at the call site — `members.shareMessage`'s rule. */
    dayOfMonth: (day: number, month: string) => `${day} de ${month}`,
  },

  /**
   * WHO IS IN THE SHOP (5b-ii-a).
   *
   * ⚠️⚠️ NO NAME APPEARS IN THIS FILE, AND THAT IS NOW FOR A DIFFERENT REASON
   * THAN IT WAS. The owner ruled on 2026-09-14 that a member row is
   * **identified by email**, with the caller's own row labelled *Tú*, because
   * no table in this schema carried a human name and he ruled against the
   * migration that would have added one. `5b.7` and `0034` reversed that on
   * 2026-09-18: `workspace_member.display_name` exists, the roster reads it,
   * and a row says who the person is.
   *
   * ⚠️ WHAT STAYS TRUE IS THIS FILE'S OWN RULE. A name is DATA and never a
   * string — it comes off a row and is rendered as it was typed, so there is
   * nothing here to translate. `roles` below is still the bottom rung, and the
   * reason it is reached is no longer `T1` but the column's nullability.
   */
  members: {
    section: 'Quién entra a tu tienda',
    /** The caller's own row. The ruling of 2026-09-14, in one word. */
    you: 'Tú',
    /**
     * ⚠️ THE THREE ROLES IN SPANISH, AND THEY DOUBLE AS AN IDENTITY. A member
     * with neither a stored name nor a recoverable email is named by what he
     * IS. ⚠️ `0034` made that rarer and did NOT make it unreachable — the
     * column is nullable, so an account whose metadata carried no name still
     * arrives with nothing. See `Identity` in `@/api/members` for the whole
     * four-rung ladder.
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
