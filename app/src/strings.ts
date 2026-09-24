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
    /**
     * HOW LONG SOMEBODY HAS BEEN WAITING (5b-iii-d-1), as three phrases rather
     * than as a number the call site wraps in words.
     *
     * ⚠️ THE VERB IS HERE AND NOT ON THE SCREEN, which is `shareMessage`'s rule
     * and the reason this file admits a function at all: *pidió* is the whole
     * sentence's tense, and a second language changes it. What the screen has
     * is one string it draws.
     *
     * ⚠️ `hoy` AND `ayer` ARE NOT `hace 0 días` AND `hace 1 días`. The plural
     * is wrong in Spanish at one, and *hace 0 días* is not something a person
     * says — which is the whole of why the day count is spelled as three cases
     * instead of one template.
     */
    waiting: {
      today: 'Pidió hoy',
      yesterday: 'Pidió ayer',
      daysAgo: (days: number) => `Pidió hace ${days} días`,
    },
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
   * WHO IS WAITING TO BE LET IN (5b-iii-d-1), and the bell on Inicio that says
   * so — **C11.8**.
   *
   * ⚠️⚠️ NO EMAIL AND NO NAME APPEARS IN THIS FILE, for `members`' reason: both
   * are DATA, off a row, rendered as they were typed. What is here is the
   * furniture around them — and the ORDER they are drawn in is not here either,
   * because it is a ruling rather than a word: it lives in `linesOf` in
   * `@/api/approvals`, where a test can read it.
   *
   * ⚠️ `bell` IS THE WORD C12.1 REQUIRES BESIDE THE ICON, and it is the same
   * word as the screen's title on purpose — `TabsLayout` records the rule: the
   * door and the room are called the same thing.
   *
   * ⚠️ AND THERE IS NO STRING HERE FOR "YOU MAY NOT SEE THIS". A manager is not
   * refused, she is simply never shown the bell — `canApprove` decides that
   * before any call is made, and a sentence explaining the absence would be us
   * handing a shopkeeper our own internal state.
   */
  approvals: {
    bell: 'Solicitudes',
    title: 'Solicitudes',
    /**
     * ⚠️ ITS OWN WORD AND NOT `settings.close`, which is the same six letters.
     * These blocks are what a second language would be translated in, one
     * screen at a time, and a screen borrowing another screen's noun is a
     * screen that moves when the other one is reworded. `offline` already sits
     * verbatim in two error tables for the same reason.
     */
    close: 'Cerrar',
    /** While the read is out. Never a spinner with no word beside it. */
    loading: 'Un momento…',
    /**
     * ⚠️ THE ORDINARY CASE AND NOT A FAILURE — it is what an owner sees on every
     * day nobody has typed his code, which is most days. It says what the queue
     * IS rather than reporting a count of zero, which is `members.alone`'s rule.
     */
    empty: 'Nadie está esperando entrar.',
    /** The role she asked for. ⚠️ The grammar is here; the label comes off `members.roles`. */
    askedFor: (role: string) => `Quiere entrar como ${role}`,

    /**
     * LETTING HER IN. Plan task `5b-iii-d-2`.
     *
     * ⚠️ THE HALF-LOOP SENTENCE THAT LIVED HERE IS GONE, AND ITS DELETION IS
     * PART OF THIS TASK RATHER THAN A TIDY-UP. `5b-iii-d-1` shipped
     * `notYet` — *"Por ahora solo puedes ver quién está esperando"* — because
     * an owner looking at a stranger's name with no way to admit her would
     * otherwise conclude the button was broken. The button exists now, so the
     * sentence would be a lie on the screen. Its own comment said this task
     * would delete it.
     */
    approve: 'Dejar entrar',
    /**
     * ⚠️ THE CONFIRM STEP IS A SEPARATE WORD FROM THE ONE THAT OPENS IT. Two
     * taps say different things — *"this one"* and *"yes"* — and a row whose
     * button reads the same in both states is a row a shopkeeper cannot tell
     * the state of without remembering what she just did.
     */
    confirm: 'Sí, dejarla entrar',
    cancel: 'Cancelar',
    working: 'Dejando entrar…',
    /** ⚠️ Its own question, worded for a person already in the shop asking to
     *  be let in — `invite.locationLabel` is asked of somebody not here yet. */
    locationLabel: '¿En qué sucursal va a trabajar?',

    /** What the row refuses before it calls, and why. See `checkApproval`. */
    issues: {
      /**
       * ⚠️⚠️ `D8`, AND IT IS THE ONE SENTENCE IN THIS FILE STANDING BETWEEN A
       * STAFF MEMBER AND AN APP THAT SILENTLY REFUSES HER EVERY WRITE. An
       * approved staff member with no `member_location` row is inside the shop
       * and can do nothing in it, with no message, because RLS does not explain
       * itself (ADR-035 §2.7 `D8`). The picker refuses to be empty so that
       * never happens.
       */
      locationMissing: 'Elige al menos una sucursal para esta persona.',
      /** ⚠️ Unreachable in both pilot shops and written anyway — `invite.issues`'
       *  recorded argument: the alternative to a sentence is a dead button. */
      noLocations: 'Esta tienda todavía no tiene sucursales.',
    },

    /** What the database refuses with, in the two cases it has its own word for. */
    errors: {
      /**
       * ⚠️ ONE SENTENCE FOR BOTH HALVES OF `TD003` — expired (`0029:401`) and
       * superseded by a newer ask (`0029:396`). They are one act for the person
       * holding the phone: the row is stale and what fixes it is the other
       * person asking again. Telling her which of our two bookkeeping states
       * she is in is bookkeeping we do, not her.
       */
      gone: 'Esa solicitud ya no sirve. Pídele que vuelva a escribir el código.',
      /** ⚠️ `0029:415`. Reaching this means the phone sent a store that is not
       *  this shop's, so the sentence names the store and not the tick. */
      location: 'Esa sucursal no es de esta tienda.',
    },
  },

  /**
   * ⚠️⚠️ THE TWO SENTENCES THE OFFLINE PATH SAYS OUT LOUD, AND THEY ARE THE
   * ONLY TWO IT EVER WILL (C10.1, C10.2, plan task `5c-iv-a`).
   *
   * ⚠️ `notice` IS NOT `ES.api.errors.offline`, AND THE TWO MUST NOT BE MERGED.
   * That one — *"Sin conexión a internet. Intenta de nuevo en un momento."* —
   * is what a FAILED CALL says to somebody who is waiting on it, and the second
   * sentence is an instruction. This one is a standing mark in the corner of a
   * working screen: the app is not asking her to do anything, it is admitting
   * something about itself. C10.1 gives it word for word, and adding *"intenta
   * de nuevo"* to a notice that never blocks anything would be telling a shop
   * to retry a sale that was never at risk.
   *
   * ⚠️⚠️ AND `restored` DOES NOT SAY HOW MANY — C10.2 in the owner's own words.
   * A count is the app talking about its own plumbing: the number is meaningful
   * to us and to nobody standing behind a counter, and a *"3 operaciones"* that
   * ever disagrees with what she remembers selling is worse than no number at
   * all. It also needs no acknowledgement, which is why there is no verb here.
   */
  offline: {
    /** C10.1, word for word. It never blocks and never interrupts. */
    notice: 'Sin conexión a internet',
    /** C10.2, word for word. It fades on its own. */
    restored: 'Tus últimas operaciones ya se guardaron.',
    /** The label on the tap that brushes the notice away for this screen. */
    dismiss: 'Entendido',

    /**
     * C11.9 — THE DEAD-LETTER BANNER (5c-iv-b), AND IT IS THE ONE SURFACE IN
     * THIS APP THAT SAYS HOW MANY.
     *
     * ⚠️⚠️ THAT LOOKS LIKE A CONTRADICTION OF `restored` ABOVE AND IS NOT, SO
     * IT IS WRITTEN DOWN RATHER THAN LEFT TO BE RE-ARGUED. The toast's count is
     * refused because it is shown to EVERYBODY about writes that are FINE — the
     * app talking about its own plumbing to a person at a counter. This one is
     * shown only to a manager (§2.7, 1.3a, C10.5) about writes that will never
     * land without us, and the count is the entire reason it exists: it is what
     * turns *"something went wrong"* into a thing somebody can ask us to fix.
     *
     * ⚠️ IT NAMES NO CAUSE AND NO DOCUMENT. No `error_code`, no list, no
     * *"venta"* or *"compra"* — C10.5 keeps the rejected write itself out of the
     * shop, and [[users-dont-do-bookkeeping]] is why the sentence stops at how
     * many and how much.
     *
     * ⚠️ AND IT ENDS BY ASKING FOR US, WHICH IS THE ONLY TRUE NEXT STEP.
     * `replay_failed_write` is manager-fenced on the server (`0030`) and run by
     * hand, one row at a time (ruling of 2026-09-05) — so a button here would
     * be a promise this app cannot keep.
     */
    deadLetters: {
      count: (n: number) =>
        n === 1 ? 'Una operación no se guardó' : `${n} operaciones no se guardaron`,
      /** ⚠️ The amount arrives already rendered by `formatMXN` (`R5`). */
      value: (amount: string) => `Valor: ${amount}`,
      hint: (n: number) =>
        n === 1 ? 'Avísanos para recuperarla.' : 'Avísanos para recuperarlas.',
    },
  },

  /**
   * THE TEN UNITS `0001` SEEDS, AS A SHOPKEEPER READS THEM. Plan task 5d-i.
   *
   * ⚠️⚠️ THE CODE AND THE WORD ARE NOT THE SAME STRING, WHICH IS THE WHOLE
   * REASON THIS MAP EXISTS. `0002` calls a quarter kilo `250g`; C3.10 writes the
   * price as `$9.00 / 250 gr`, in the owner's own words. Rendering the code
   * would put database spelling on a shelf label.
   *
   * ⚠️ THE LIST IS CLOSED AND IT IS NOT OURS. `0001`'s comment is explicit —
   * *"users pick from this list; they never define their own factors"* — so
   * there are exactly ten, and an eleventh is a migration before it is a word.
   * `priceLabel` still falls back to the code rather than to nothing, because a
   * unit this map has not learned yet is a price a shopkeeper can still read.
   *
   * ⚠️ THE FACTORS ARE NOT HERE. They come from the `unit` table over the wire
   * (`@/api/catalog`), for the reason `5c-iv-b` recorded: two homes for *how
   * many grams in a kilo* is one home too many.
   */
  /**
   * VENDER — the counter, and every word on the highest-traffic surface in the
   * app. Plan task `5f-ii`.
   *
   * ⚠️ IT REUSES `ES.catalog`'s SEARCH WORDS RATHER THAN SPELLING ITS OWN.
   * C3.1 puts the SAME list on Vender and Comprar as on Productos — *"there are
   * no buy-only or sell-only subsets"* — so *Buscar producto*, *Limpiar* and the
   * three empty states are one set of words about one list. A second spelling
   * here would be two answers to *what is this box for*, drifting apart the
   * first time one of them is reworded.
   *
   * ⚠️⚠️ AND THE TWO AMBER WORDS BELOW ARE WHY `R11` EXISTS. §2.11 fences the
   * `atención` colour to C3.17's unpriced row and gives it no second job, and it
   * says no state is ever announced by colour ALONE — the users are old and the
   * shop is bright. So the colour never travels without one of these.
   */
  sell: {
    /** C3.4's sticky bar. The one total in this app that is not a day's takings. */
    total: 'Total',
    /**
     * What the bar says under `Total` with nothing rung up yet.
     *
     * ⚠️ THE BAR IS DRAWN ANYWAY, WHICH IS WHY THIS WORD EXISTS. A bar that
     * appeared on the first tap would move the list under a thumb that is
     * already reaching for the second one.
     */
    emptyCart: 'Sin nada en el carrito',
    /** How many products are in the basket — never how many UNITS of them. */
    lines: (n: number) => (n === 1 ? '1 producto' : `${n} productos`),
    /**
     * ⚠️ THE AMBER WORD ON A ROW, AND IT IS SHOWN ONLY ON A ROW THAT IS IN THE
     * BASKET — see `vender.tsx` for the argument, which is `5d-ii`'s *"an alarm
     * on a hundred rows is the alarm nobody can silence"* applied rather than
     * overruled. C3.12's dash is still what the price itself reads.
     */
    noPrice: 'Sin precio',
    /** The same fact about the basket, beside the total the bar is withholding part of. */
    someUnpriced: 'Falta un precio',
    /** The `−` and the `+`, to a screen reader. C12.1: never an icon with no word. */
    less: 'Menos',
    more: 'Más',
    /** The quantity box, to a screen reader — the unit is read out beside it. */
    qty: 'Cantidad',
  },

  units: {
    kg: 'kg',
    g: 'gr',
    '500g': '500 gr',
    '250g': '250 gr',
    '100g': '100 gr',
    l: 'l',
    ml: 'ml',
    '500ml': '500 ml',
    '100ml': '100 ml',
    pza: 'pza',
  },

  /**
   * PROVEEDORES — the module word, and today nothing else. Plan task `6b`.
   *
   * ⚠️ IT IS ITS OWN BLOCK WITH ONE KEY, AND THAT IS DELIBERATE. §2.8 puts a
   * row to Proveedores on Inicio and `6b` builds the screen behind it, so the
   * word is needed a step before the room is. Folding it into `ES.home` would
   * put a MODULE NAME inside a SCREEN's block — the arrangement `displayName`
   * refused for exactly this reason one task earlier — and `6b` would then have
   * to move it, which is a rename nobody would notice was due.
   */
  providers: {
    title: 'Proveedores',
  },

  /**
   * INICIO — §2.8's Home row, and the two numbers that sit above anything
   * tappable. Plan task `5d-iv-b`.
   *
   * ⚠️⚠️ THE MODULE WORDS ARE NOT HERE AND MUST NOT BE COPIED HERE. Vender,
   * Comprar and Desperdicio are `ES.tabs`; Productos is `ES.catalog.title`.
   * Inicio is a SECOND door onto rooms that already have names, and a second
   * spelling of a room's name is the stale-duplicate defect this repository has
   * recorded seven times — in the form where the tab says one word and the card
   * beneath it says another.
   *
   * ⚠️ NOTHING HERE DRESSES UP A ZERO, AND THAT IS ROUTED RATHER THAN DECIDED.
   * Nothing in this app writes a sale until `5f`, so every phone reads `$0.00`
   * and `0 ventas` today. Whether that reads as a quiet morning or as a broken
   * app is a question for the owner ON THE TASK THAT CREATES THE FIRST SALE —
   * asking it now is the `5c-iv-b` mistake the ruling of 2026-09-22 named.
   */
  home: {
    /**
     * The word over the figure. ⚠️ IT IS THE DAY AND NOT THE MONEY: *Hoy*
     * says which rows the number counts, which is the only thing about it a
     * shopkeeper could get wrong. *Ventas de hoy* would repeat the line
     * underneath it.
     */
    today: 'Hoy',
    /**
     * The count, under the figure. ⚠️ SINGULAR AND PLURAL, like
     * `offline.deadLetters.count` — *1 ventas* on the screen she opens between
     * customers is the app looking unfinished at the one number it is sure of.
     */
    sales: (n: number) => (n === 1 ? '1 venta' : `${n} ventas`),

    /**
     * ⚠️⚠️ THREE LINES FOR THREE DIFFERENT FACTS, AND THE DISTINCTION IS THE
     * ONE THE OWNER FOUND ON HIS OWN PHONE ON 2026-09-22. A read in flight, a
     * read that failed and a read that came back unparseable are not the same
     * thing, and `useToday` reports all three separately for exactly this.
     * ⚠️ The failed case is not in this block: it is `ES.api.errors`, chosen by
     * `apiErrorKey`, because *sin conexión* is the same sentence everywhere.
     */
    loading: 'Cargando…',
    /**
     * ⚠️⚠️ WHAT STANDS WHERE THE PESO FIGURE WOULD BE WHEN THERE IS NONE TO
     * SHOW — in flight, failed, or a row that would not parse. It is C3.12's
     * character and it is NOT `ES.catalog.noPrice`: that dash means *nobody has
     * answered this question yet* and this one means *we could not ask*. Two
     * facts, two keys, the way `ES.family.back` is its own word beside
     * `ES.catalog.back`. ⚠️ A `$0.00` here would be a number she carries to her
     * till on a phone that never reached the database.
     */
    noFigure: '—',
    /**
     * ⚠️ THE FIGURE IS WITHHELD RATHER THAN SHRUNK (`takingsFrom`), so this is
     * what stands in its place — and it says the total is missing rather than
     * naming a column or a parse. [[users-dont-do-bookkeeping]]: she cannot act
     * on *a numeric came back as a double*, and she can act on *do not trust
     * this against the till*.
     */
    partial: 'No pudimos mostrar el total de hoy.',

    /**
     * ⚠️⚠️ PROVEEDORES IS DRAWN AND IS PLAINLY DEAD, WHICH IS `5d-iii`'s RULE
     * APPLIED TO A DOOR RATHER THAN TO A BUTTON. §2.8 puts the row here and the
     * screen behind it is `6b`, unbuilt — so the row exists because a shopkeeper
     * should see what is coming, and it says so, because a door that looks live
     * and opens onto nothing is worse than one that is obviously not built.
     */
    notYet: 'Todavía no está lista.',
  },

  /** Productos — the catalog, read. Plan tasks 5d-i to 5d-iii. */
  catalog: {
    /**
     * C3.12 — A PRODUCT WITH NO PRICE SHOWS A DASH, NEVER `$0.00`.
     * `0008`'s own instruction, and it overrides the Power Apps screen, which
     * showed `Precio: $0.00` on rows nobody had priced. A zero is a price the
     * owner set and sells at; the dash is a question nobody has answered yet.
     */
    noPrice: '—',
    /** C3.10's separator: `$35.00 / kg`. The price is never shown alone. */
    per: '/',

    /** The room's name — the module word, never translated (see this file's header). */
    title: 'Productos',
    /**
     * The way back out. ⚠️ *Volver* and not *Cerrar*: this is a screen you went
     * INTO, where `Ajustes` and `Solicitudes` are sheets you came back FROM.
     */
    back: 'Volver',

    /** The search box's placeholder — and its label to a screen reader. */
    search: 'Buscar producto',
    /**
     * ⚠️ A WORD AND NOT A CROSS. `clearButtonMode` is iOS-only and C1.1 puts two
     * Androids among the pilot's four phones; C12.1 refuses an icon with no word
     * beside it, so the control that works on both is a labelled one.
     */
    clear: 'Limpiar',

    /**
     * ⚠️⚠️ THREE EMPTY STATES AND THEY ARE THREE DIFFERENT FACTS. A shop with a
     * hundred products that mistypes a name must not be told its catalog is
     * empty — she is the merchant C8.2 describes, whose catalog is deliberately
     * incomplete and who is being encouraged to add to it. And a read that has
     * not landed is neither: saying *"no products"* for the second before the
     * rows arrive is a screen that lies on every cold open.
     */
    loading: 'Cargando productos…',
    empty: 'Todavía no hay productos.',
    noMatches: 'Ningún producto coincide con esa búsqueda.',

    /**
     * `Agregar` — THE FORM ITSELF, AND EVERY WORD ON IT. Plan task `5e-ii`, and
     * it is pilot-critical rather than a convenience: C8.2 has the owner seeding
     * the catalog DELIBERATELY SHORT, *"to encourage him to create some on his
     * own"*, so the first product this shop makes is made here, by a shopkeeper,
     * with nobody watching.
     *
     * ⚠️ FOUR FIELDS AND NOTHING ELSE (C8.9). There is no tax rate here, no pack
     * size, no store, no photo and no expiry — `5e-iii` owns the first two,
     * `location_id` is null by the decision `5e-i` recorded, and the owner ruled
     * out expiry capture entirely on 2026-09-22.
     *
     * ⚠️⚠️ AND THERE IS NO SENTENCE HERE FOR A CASHIER BEING REFUSED, WHICH IS
     * THE FENCE BEING DRAWN RATHER THAN DISCOVERED. `canWriteCatalog` keeps her
     * off this screen, so the words she would have needed do not exist;
     * `ES.catalog.errors.notAllowed` is the belt to that braces — what a manager
     * demoted mid-shift sees, on a form she had already opened.
     */
    create: {
      /**
       * ⚠️⚠️ THE LEGEND UNDER THE CREATE ROW, AND IT IS THE ONLY DOOR INTO THIS
       * FORM FROM PRODUCTOS SINCE 2026-09-23. The `Agregar` button is gone: the
       * shopkeeper searches, and when nothing matches, what he typed becomes a row
       * with this line under it. ⚠️ The point is not fewer buttons — it is that he
       * has just been shown everything the shop already sells under that name,
       * which is when a partial duplicate gets noticed instead of created.
       *
       * ⚠️ TITLE CASE IS THE OWNER'S OWN SPELLING, like `Agregar Variante` one
       * screen over. It reads as the name of an action rather than as a sentence.
       */
      row: 'Crear Nuevo Producto',

      /** The room's name. ⚠️ The control inside a family says what it makes —
       *  `ES.family.addVariant`. */
      title: 'Nuevo producto',
      /**
       * ⚠️ *Cancelar* AND NOT *Volver*, WHICH IS THE ONE PLACE THIS APP BREAKS
       * THAT HABIT AND IT IS DELIBERATE. Productos and La Familia are screens you
       * went into and came back from; this one holds typing that will be thrown
       * away, and *Volver* would understate what the tap costs.
       */
      cancel: 'Cancelar',

      /**
       * ⚠️⚠️ THE THREE FIELDS BELOW ALL CARRY A HINT AND NOT A VALUE, AND THAT IS
       * ONE RULING APPLIED THREE TIMES — 2026-09-23, after the owner held the first
       * version. The family showed a family it had matched for him, and the price
       * box looked answered; both *"look as a decision already made"*. A hint is
       * drawn in `tintaApagada` and is not the field's value: nothing is saved from
       * it, and the moment he types, the text becomes `tinta` and his.
       */
      nameLabel: 'Nombre',
      /**
       * ⚠️⚠️ AN INSTRUCTION AND NOT AN EXAMPLE, RULED 2026-09-23 — *"the hint is
       * not looking as a hint in Nombre, do it the same way as we're doing in
       * Familia"*. It used to read `Pechuga sin hueso`, which is a real product
       * from C8.5's despiece and taught something; **but a real product name sitting
       * in the box is indistinguishable from a product name somebody typed**, which
       * is the same complaint he made about the family and the price. An imperative
       * cannot be mistaken for a value.
       */
      nameHint: 'Escribe el nombre del producto',

      familyLabel: 'Familia',
      /**
       * ⚠️⚠️ A HINT ON WHAT TO TYPE, WHICH IS THE OWNER'S CORRECTION IN ITS
       * SHORTEST FORM. The box used to show a family the app had chosen; it now
       * shows the product's own name MIRRORED, in hint ink, and this line is what
       * it says when there is no name yet. Neither is a value until he touches it.
       */
      familyHint: 'Escribe la familia del producto',
      /** ⚠️ THE GESTURE C8.11 ASKS FOR, and it is a WORD: C12.1 refuses an icon
       *  with nothing beside it, and *Cambiar* is what the override is. */
      familyChange: 'Cambiar',
      /** The family search's own box — scenario 3, the one he goes looking for. */
      familySearch: 'Busca una familia',
      /**
       * ⚠️ WHAT THE MIRROR WILL DO, SAID PLAINLY, because attaching to `Pollo` and
       * creating `Pollo` are not the same event: one changes nothing about the shop
       * and the other adds a row he will see for ever.
       */
      familyCreate: 'Crear esta familia',
      /** The families the shop already has, under the search box. */
      familyExisting: 'Familias que ya tienes',
      /** ⚠️ Back to the mirror after a wrong turn in the search. */
      familyMirror: 'Usar el nombre del producto',

      /**
       * ⚠️ THE QUESTION IS ABOUT SELLING AND NOT ABOUT MEASURING, which is what
       * `ES.catalog.issues.unitMissing` already says: C8.10 writes the one answer
       * into all four columns, so a shopkeeper is never asked four times.
       */
      unitLabel: 'Unidad',
      /**
       * ⚠️⚠️ THE OWNER'S OWN SENTENCE, AND IT FIRES ONLY WHEN THE FAMILY WAS
       * ACTUALLY LET GO. C8.5 holds a family to one kind of measurement, and
       * nothing in the database enforces it across variants — so when he picks a
       * unit the chosen family cannot hold, the family goes back to mirroring the
       * product and this says why, then fades. ⚠️ It is a BANNER AND NOT A REFUSAL:
       * nothing was rejected, one field moved, and `PALETTE.error` would be a lie
       * about that.
       */
      unitReleased: 'Una familia de productos debe tener la misma unidad de medida.',

      priceLabel: 'Precio',
      /**
       * ⚠️ THE SAME TWO-DECIMAL SHAPE `ES.catalog.issues.priceUnreadable` SHOWS
       * HIM WHEN HE GETS IT WRONG. Two spellings of one example is how a
       * placeholder and a refusal end up disagreeing about what this app accepts,
       * and the refusal is the one he reads second.
       */
      priceHint: '35.50',

      submit: 'Guardar producto',
      working: 'Guardando…',

      /**
       * ⚠️⚠️ THE WAY OFF THE KEYBOARD, RULED 2026-09-23 — *"display the keyboard
       * with the hide option where the search/enter button usually is"*. Every text
       * box in this app either searches LIVE or is confirmed by a button on the
       * screen, so the return key has no job of its own; making it *Listo* gives it
       * the one job a person actually wants from it.
       *
       * ⚠️⚠️ AND IT IS A REAL STRING BECAUSE ONE KEYBOARD HAS NO RETURN KEY AT ALL.
       * `decimal-pad` — which the price box needs, because C12.2 puts the point in
       * `35.50` and a pad with no point is a shopkeeper who cannot type half a peso
       * — draws no return key on either platform. On iOS that box gets an accessory
       * bar carrying this word; on Android the system's own dismiss control does the
       * job. So `returnKeyType` covers the other three boxes and this covers the one
       * it cannot reach.
       */
      done: 'Listo',
    },

    /**
     * `Editar` — THE FORM, AND EVERY WORD ON IT. Plan task `5e-iii-b`, and it is
     * everything the four-field create form (C8.9) deliberately pushed behind it:
     * the rename, the price, the IVA, the pack size and retiring a product the
     * shop has stopped selling.
     *
     * ⚠️⚠️ EVERY BOX STARTS EMPTY AND CARRIES AN INSTRUCTION, WHICH IS THE
     * OWNER'S RULING OF 2026-09-23 APPLIED TO AN EDIT RATHER THAN TO A CREATE:
     * *a proposal must not look like a decision already made.* A box PREFILLED
     * with the figure the shop already has is worse than a proposal — it makes
     * *leave it alone* look like *set it to this*, and `variantSettings` would
     * then send a column back on a save made for a different field entirely. So
     * an empty box means **leave it**, and the figure the shop holds today is
     * printed BESIDE the box under `current`, where it cannot be mistaken for
     * something somebody typed.
     *
     * ⚠️ THE NAME IS THE ONE EXCEPTION AND IT IS NOT AN EXCEPTION TO THE RULE:
     * `product_variant.name` is `not null`, so there is no *leave it empty* state
     * to confuse it with, and the box holds the product's own name because that
     * is what a rename edits.
     *
     * ⚠️⚠️ AND THERE IS NO WORD HERE FOR `enforce_stock` (C8.8). C8.6
     * guarantees permanent drift in both directions, and this is the one screen in
     * the pilot that would ever have been tempted to offer the switch — a column
     * with no sentence is a control nobody can draw by accident.
     */
    edit: {
      /** The room's name. ⚠️ The product's own name is the subtitle under it,
       *  because *Editar* alone does not say WHICH product is open. */
      title: 'Editar producto',
      /** ⚠️ *Cancelar* and not *Volver*, for `create.cancel`'s reason: this
       *  screen holds typing that will be thrown away. */
      cancel: 'Cancelar',

      /**
       * ⚠️ ONE WORD FOR ALL THREE FIGURES THE SHOP ALREADY HOLDS — the price,
       * the IVA and the pack size. It labels a FACT printed beside a box, never
       * the box's own content, which is the whole of the hint ruling applied here.
       */
      current: 'Actual',

      nameLabel: 'Nombre',
      /** ⚠️ `create.nameHint`'s sentence, for its measured reason: an
       *  instruction cannot be mistaken for a product name somebody typed. */
      nameHint: 'Escribe el nombre del producto',

      priceLabel: 'Precio',
      /**
       * ⚠️⚠️ AN INSTRUCTION AND NOT THE OLD FIGURE. `35.50` sitting in the
       * box is indistinguishable from a price a shopkeeper typed — and here it
       * would be worse than on the create form, because leaving it alone would
       * rewrite the shop's price history with a change that never happened.
       */
      priceHint: 'Escribe el precio nuevo',
      /**
       * ⚠️ WHAT AN UNTOUCHED PRICE BOX DOES, SAID ONCE. C3.12 makes *no price*
       * a legitimate state, so *leave it* and *remove it* have to be visibly
       * different — and nothing on this form removes a price at all.
       */
      priceKeep: 'Si lo dejas vacío, el precio no cambia.',

      /** ⚠️ THE BOX IS A PERCENTAGE AND THE COLUMN IS A RATE — `0002`'s own
       *  *"0.1600, not 16"*. `editIssues.taxUnreadable` shows the shape. */
      taxLabel: 'IVA',
      taxHint: 'Escribe el IVA como porcentaje',

      packLabel: 'Piezas por paquete',
      packHint: 'Escribe cuántas piezas trae el paquete',

      submit: 'Guardar cambios',
      working: 'Guardando…',
      /** The way off the number pad. `create.done`'s word and its reason. */
      done: 'Listo',

      /**
       * RETIRING A PRODUCT — `is_active` false, and never a DELETE.
       * `product_family` and `product_variant` have no delete policy at all in
       * `0002`: *"a family with ledger history is deactivated, never deleted"*.
       */
      retire: 'Retirar del catálogo',
      retireAsk: '¿Retirar este producto del catálogo?',
      /**
       * ⚠️ WHAT IT COSTS, IN THE TWO HALVES A SHOPKEEPER CARES ABOUT: it goes
       * off the screens he uses, and the money he has already taken stays where it
       * is. The second half is what stops this reading as *delete*.
       */
      retireWhy: 'Dejará de aparecer en Productos y ya no podrás venderlo. Lo que ya vendiste no se borra.',
      /**
       * ⚠️⚠️ IT IS THE DESIGN AND NO LONGER AN APOLOGY — RULED 2026-09-23.
       * ~~*"Por ahora no se puede volver a activar desde la app."*~~ *Por ahora*
       * described a gap waiting to be closed, and the owner ruled that it is not
       * one: a shopkeeper deletes a product he made, **it leaves the catalog and
       * stays in the transactions**, and nothing brings it back. So the sentence
       * states the fact instead of promising a later fix that is not coming.
       *
       * ⚠️ IT IS THE SECOND HALF OF A PAIR AND MUST NOT BE READ ALONE:
       * `retireWhy` above is what says the sales are kept, which is the whole
       * reason this is safe to be irreversible ([[users-dont-do-bookkeeping]]).
       *
       * ⚠️⚠️ AND IT WILL NEED A THIRD STATE THE DAY PREBUILT CATALOGS LAND: the
       * same ruling says **a default product cannot be deleted at all**, so the
       * control is absent rather than confirmed for those rows. Nothing marks one
       * today — no column, no seeded row anywhere in `supabase/migrations/` — so
       * there is nothing yet to draw differently. See `6c`.
       */
      retireOnce: 'Esto no se puede deshacer.',
      retireYes: 'Sí, retirarlo',
      retireNo: 'Cancelar',
    },

    /**
     * WHAT IS WRONG WITH THE FOUR FIELDS BEFORE POSTGRES IS ASKED. Plan task
     * `5e-i`, rendered by the form `5e-ii` builds. `checkProduct` in
     * `@/api/catalogWrite` chooses; nothing here is chosen at a call site.
     *
     * ⚠️ EACH ONE NAMES THE FIELD AND NOT THE RULE. *"Escribe el nombre"* is
     * something a person does; *"el nombre no puede estar vacío"* is a
     * constraint talking about itself, and `product_variant_name_not_blank` is
     * ours to know ([[users-dont-do-bookkeeping]]).
     */
    issues: {
      nameMissing: 'Escribe el nombre del producto.',
      /**
       * ⚠️⚠️ IT DOES NOT SAY *"en esta familia"*, AND THAT IS THE MEASUREMENT
       * RATHER THAN THE WORDING. `product_variant_name_unique` is
       * `(workspace_id, normalized_name)` — SHOP-WIDE — so `Pierna` under Pollo
       * really does refuse `Pierna` under Cerdo, and a sentence that blamed the
       * family would send a shopkeeper to change the family and be refused
       * again. It names what she can act on: pick another name.
       */
      duplicate: 'Ya tienes un producto con ese nombre. Usa otro.',
      familyMissing: 'Elige o escribe una familia para este producto.',
      unitMissing: 'Elige la unidad en la que vendes este producto.',
      /**
       * ⚠️⚠️ THIS IS THE UNREADABLE BOX AND NO LONGER THE EMPTY ONE — the
       * owner's ruling of 2026-09-22 split what had been one key. An EMPTY
       * price is now a legitimate product (`ES.catalog.notice.noPrice` is what
       * it gets instead); `35,5,5` and `gratis` are still refused, because a
       * price this app guessed at is a price the shop charges.
       *
       * ⚠️ IT SHOWS THE SHAPE RATHER THAN NAMING THE RULE. *"No se permiten
       * exponentes"* is a parser talking about itself; an example is something
       * a person can copy ([[users-dont-do-bookkeeping]]).
       */
      priceUnreadable: 'Ese precio no se entiende. Escríbelo así: 35.50',
    },

    /**
     * WHAT STOPS AN EDIT, AS OPPOSED TO A CREATE. Plan task `5e-iii-a`.
     * `checkEdit` in `@/api/catalogEdit` chooses.
     *
     * ⚠️⚠️ IT IS ITS OWN BLOCK BESIDE `issues` AND NOT MORE KEYS INSIDE IT, and
     * the reason is `ProductIssue`: that type is `keyof typeof issues`, so a key
     * added there is a refusal `checkProduct` claims it can return and never
     * does. Two forms, two sets of right answers, two keyed blocks — and three
     * of the sentences below are deliberately the SAME STRING as their `issues`
     * twin, because they are the same fact said to the same person.
     */
    editIssues: {
      nameMissing: 'Escribe el nombre del producto.',
      /** ⚠️ The same sentence as `issues.duplicate` — `checkEdit` is what makes
       *  it mean something different, by excluding the product being edited. */
      duplicate: 'Ya tienes un producto con ese nombre. Usa otro.',
      /**
       * ⚠️⚠️ IT SAYS WHAT THE BOX IS AND SHOWS THE SHAPE, because the column is
       * a RATE and the box is a PERCENTAGE — `0002`'s own *"0.1600, not 16"*.
       * A shopkeeper typing `0.16` here means sixteen hundredths of a percent
       * and would be told nothing at all by *"revisa el IVA"*.
       */
      taxUnreadable: 'Escribe el IVA como porcentaje, así: 16',
      /** ⚠️ Zero is refused as well as a negative: `pack_size > 0`, and a case
       *  of nothing is not a case. The example is `0002`'s own. */
      packUnreadable: 'Escribe cuántas piezas trae el paquete, así: 24',
      /** ⚠️ `issues.priceUnreadable`'s sentence, for its reason — an example is
       *  something a person can copy ([[users-dont-do-bookkeeping]]). */
      priceUnreadable: 'Ese precio no se entiende. Escríbelo así: 35.50',
    },

    /**
     * WHAT A SHOPKEEPER IS TOLD ABOUT A CREATE THAT IS ALLOWED BUT WORTH
     * KNOWING ABOUT. Plan task `5e-i`, reopened by the owner's ruling of
     * 2026-09-22. `noPriceNoticeKey` in `@/api/catalogWrite` chooses.
     *
     * ⚠️ IT IS ITS OWN BLOCK BESIDE `issues` AND NOT INSIDE IT, and the
     * distinction is the ruling's substance: an `issue` STOPS the save and this
     * does not. Folding them would put a sentence that means *go on* in the
     * table of sentences that mean *you cannot*, and the next person to render
     * the block would treat them alike.
     *
     * ⚠️⚠️ IT IS `notice` AND NOT `confirm`, AND THE RENAME IS A SECOND RULING
     * OF THE SAME DAY: **no extra tap.** A block called `confirm` describes a
     * thing the shopkeeper dismisses, and the owner ruled against exactly that —
     * a line under the empty price box instead. The word was wrong for one
     * afternoon and is corrected here rather than left to mislead the screen
     * that renders it.
     */
    notice: {
      /**
       * ⚠️⚠️ REWRITTEN BY THE OWNER ON 2026-09-23, IN HIS OWN WORDS, AFTER HE READ
       * THE FIRST ONE ON HIS PHONE: *"Si no agregas el precio del producto ahora,
       * lo tendrás que agregar al momento de vender."* One grammatical fix only
       * (*agregar* → *agregas* in the conditional). ⚠️ **It is shorter and it moves
       * the cost to the end of the sentence** — the old one opened by restating
       * what he had just done (*"este producto no tendrá precio"*) before getting
       * to the part he cannot see, which is that Vender will stop and ask him.
       * ⚠️ It disappears the moment the price box has something in it, which is
       * `noPriceNoticeKey`'s doing and was already true.
       *
       * ~~his words were *"Si quieres comprar/vender tendrás que poner un precio al
       * llevar a cabo la operación."*~~ Three changes, and each is small: the slash becomes two
       * verbs, because `comprar/vender` is a construction nobody says out loud;
       * *la operación* becomes *lo compres o lo vendas*, because a shopkeeper
       * does not have operations, he buys and sells; and the first half names
       * what is about to happen so the sentence works whether `5e-ii` draws it
       * as a confirmation he taps through or as a line under an empty box.
       *
       * ⚠️ WHY IT NAMES A CONSEQUENCE AND NOT A STATE. *"Este producto no tiene
       * precio"* is what he just typed. C3.12 is the owner's own earlier ruling
       * — *"impossible to concrete a transaction without a price"* — so the
       * thing he cannot see from this form is that Vender and Comprar will both
       * stop and ask him. That is the part worth a sentence.
       */
      noPrice:
        'Si no agregas el precio del producto ahora, lo tendrás que agregar al momento de vender.',
    },

    /**
     * WHAT THE DATABASE REFUSES THE WRITE WITH. Plan task `5e-i`, and every one
     * of these was measured against the applied schema on 2026-09-22 rather
     * than recalled.
     *
     * ⚠️ THEY ARE HERE AND NOT IN `ES.api.errors` FOR `inviteErrorMessage`'s
     * RECORDED REASON: that map's contract is that every value is an API-WIDE
     * code's sentence, and these are three tables' own refusals. The general
     * path is still `apiErrorMessage`, so *sin conexión* stays the one sentence
     * this app gives for a lost link — and offline is the pilot store's normal
     * write path, so it is the one that will actually be read.
     */
    errors: {
      /** `23505` on `product_variant_name_unique`. `issues.duplicate`'s sentence,
       *  because it is the same fact arriving from the other side — the local
       *  check can miss a product added on another phone, or a DEACTIVATED one,
       *  which `catalogFrom` drops and the unique index still counts. */
      duplicate: 'Ya tienes un producto con ese nombre. Usa otro.',
      /**
       * `23505` on `product_family_name_unique` — and it is NOT the same
       * sentence. She named a product, not a family; the family was suggested.
       * Telling her the product name is taken when it is not would send her to
       * change the one thing that was right.
       */
      familyExists: 'Esa familia ya existe. Elígela de la lista.',
      /**
       * ⚠️⚠️ `42501`, AND IT IS NOT *"tu sesión se cerró"*. The three INSERT
       * policies are `has_role(…, 'manager')`, so this is a CASHIER being
       * refused — measured as HTTP 403 on all three tables. Sending her to sign
       * in again would be a loop with no end in it. ⚠️ `5e-ii` draws the fence
       * instead of discovering it, so this is the belt to that screen's braces:
       * what a manager demoted mid-shift sees.
       */
      notAllowed: 'Solo el dueño o un gerente puede agregar productos.',
      /**
       * ⚠️ THE HONEST CATCH-ALL FOR A ROW WE SHOULD NEVER HAVE SENT — `23514`
       * from the blank-name check or the dimension trigger, `23503` from a unit
       * code the `unit` table does not have. `checkProduct` makes all three
       * unreachable, so reaching one is OUR mistake, deployed; dressing it in a
       * helpful sentence would hide the one class of failure that must be fixed
       * rather than retried. `@/api/errors` makes the same argument about
       * `PGRST202` in its own header.
       */
      rejected: 'No pudimos guardar este producto. Inténtalo de nuevo.',
      /**
       * ⚠️⚠️ THE PRODUCT SAVED AND ITS PRICE DID NOT, which is the one partial
       * state a shopkeeper can SEE. PostgREST has no transaction, so a failure
       * on the third of three rows leaves a real product on Productos wearing
       * C3.12's dash. Saying *"no se pudo guardar"* here would send her to type
       * it all again and the second attempt is refused by the row the first one
       * made — so the sentence says what happened and what is left to do.
       */
      priceNotSaved: 'Guardamos el producto, pero no su precio. Ponle precio desde el producto.',
      /**
       * ⚠️⚠️ `42501` ON AN EDIT, AND THE VERB IS WHY IT IS NOT `notAllowed`.
       * That sentence says *agregar productos*, which is true of a create and
       * wrong of a rename: a manager demoted mid-shift, looking at a product she
       * is trying to RENAME, would be given an accurate sentence about something
       * she was not doing. Plan task `5e-iii-a`, and the policies are
       * `product_variant_update`, `price_list_update` and `price_list_insert`.
       */
      notAllowedEdit: 'Solo el dueño o un gerente puede cambiar un producto.',
      /**
       * ⚠️⚠️ `23P01` — `price_list_no_overlap`, and it exists nowhere else in
       * this app. A correctly planned change reaches it only from a read that
       * went stale under the screen: another phone priced this product while it
       * was open. ⚠️ IT SENDS HER BACK TO THE PRODUCT AND NOT TO THE PRICE BOX,
       * because re-typing the same figure against the same stale rows is refused
       * again — which is a loop, and the thing `redeemErrorMessage` recorded
       * this project's refusal of.
       */
      overlap: 'Alguien más cambió este precio. Vuelve a abrir el producto.',
      /**
       * ⚠️⚠️ THE OLD PRICE WAS REMOVED AND THE NEW ONE NEVER LANDED, WHICH IS
       * THE WORST PARTIAL STATE THIS APP HAS. `price_list` is a dated range
       * table, the old row must be CLOSED before the new one is opened, and
       * PostgREST has no transaction — so a failure between the two leaves the
       * product priced yesterday and priceless today, wearing C3.12's dash.
       * ⚠️ Saying *"no se pudo guardar"* here would send a shopkeeper away
       * believing the old price still stands, and the next customer is charged
       * nothing at all. Plan task `5e-iii-a`.
       */
      priceGone: 'Quitamos el precio anterior y no pudimos poner el nuevo. Ponle precio otra vez.',
    },
  },

  /** La Familia — the one surface where family and variant are both visible.
   *  Plan task 5d-iii. */
  family: {
    /**
     * ⚠️ THE BANDA PRINTS THE FAMILY'S OWN NAME, and this word is what it
     * prints when there isn't one. The family is an EMBEDDED resource, so a
     * row that does not come back leaves `familyName` empty — on Productos
     * that is one missing line under a name, and here it would be a screen
     * with no heading. `familyTitle` in `@/api/catalog` is what chooses.
     */
    title: 'Familia',
    /** ⚠️ *Volver* and not *Cerrar*, for `ES.catalog.back`'s reason: this is a
     *  screen you went INTO, pushed on top of Productos. */
    back: 'Volver',

    /**
     * ⚠️⚠️ THE THREE AFFORDANCES, IN THE OWNER'S OWN WORDS — AND AS OF `5e-ii`
     * THE FIRST OF THEM WORKS. Every one of them WRITES: `product_variant_insert`
     * and `product_family_insert` are both `has_role(…, 'manager')` in `0002`,
     * which is why `5d-iii` drew all three dead while the catalog was only being
     * read. `Agregar Variante` now opens the form — and only for a manager or
     * the owner, because `canWriteCatalog` keeps a cashier from seeing a control
     * she would be refused silently.
     *
     * ⚠️ `Costos` AND `Editar` ARE STILL DRAWN DEAD, and that is two rulings
     * rather than an omission: *"leave Costos dead until `5g`"* (2026-09-22),
     * because nothing writes a purchase until Comprar exists, and `Editar` is
     * `5e-iii`. ⚠️ Deleting them was refused for `5d-iv-b`'s Proveedores reason
     * — an affordance a shop has seen and then seen vanish reads as an app
     * getting smaller.
     */
    addVariant: 'Agregar Variante',
    costs: 'Costos',
    edit: 'Editar',
    /**
     * ⚠️ THE ONE SENTENCE THAT KEEPS THE DEAD ONES FROM LOOKING BROKEN — the
     * shape `ES.approvals.notYet` had at `5b-iii-d-1`, and it is deleted by the
     * task that makes them work, exactly as that one was.
     *
     * ⚠️⚠️ IT WAS REWORDED AT `5e-ii` AND IT HAD TO BE. It used to read *"solo
     * puedes ver; todavía no se puede agregar ni editar"*, which stopped being
     * true the moment `Agregar Variante` opened a form — a sentence naming three
     * dead buttons, sitting under two dead ones and one live one. It now names
     * only what is still missing, and `5e-iii` and `5g` are the rows that delete
     * the halves they finish.
     */
    /**
     * ⚠️⚠️ REWORDED AGAIN AT `5e-iii-b`, AND IT NOW NAMES ONE BUTTON. It
     * said *"costos ni editar"* while `Editar` was dead; that half went live with
     * this task, and a sentence describing a control that works is false while
     * still rendering green — the same defect `5e-ii` fixed in the other half.
     * ⚠️ `5g` is the row that deletes what is left of it, by the ruling that
     * left `Costos` dead until purchase cost exists to fill it.
     */
    notYet: 'Todavía no puedes ver los costos de un producto.',

    /**
     * ⚠️⚠️ TWO STATES AND THEY ARE NOT THE SAME FACT. This screen is reached by
     * TAPPING a row, so a cold open with the link out would otherwise tell a
     * shopkeeper that the product in her hand has been deleted. See
     * `familyLineKey`.
     */
    loading: 'Cargando…',
    missing: 'Este producto ya no está en el catálogo.',
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
