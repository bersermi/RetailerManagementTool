// ============================================================================
// EVERY WORD ITACATE SHOWS, IN ONE FILE (ADR-035 §2.11). Plan tasks `10.2a`
// (the skeleton), `10.5-iii-a` (signing in) and `10.5-iii-b` (her way out).
//
// ⚠️ WHERE A SCREEN HERE DOES WHAT ONE OF WERA'S DOES, ITS WORDS ARE WERA'S
// (`app/src/strings.ts`, `ES.auth`), as Wera Cocina's are (`cocina/src/strings.ts`).
// One person can use the three apps with one login, so the same refusal reads
// the same in each; a sentence changed there is changed here too —
// `test/auth-rules.test.ts` reads Wera's file. The reasons behind each sentence
// live beside Wera's copy.
// ============================================================================

export const ES = {
  nombre: 'Itacate',

  auth: {
    emailLabel: 'Correo',
    passwordLabel: 'Contraseña',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    nameLabel: 'Nombre',
    surnameLabel: 'Apellido',
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    /** *Continuar*, Apple's own word beside it: the button makes the account or comes back to it. */
    google: 'Continuar con Google',
    titleSignUp: 'Tu cuenta',
    titleSignIn: 'Entrar',
    toSignUp: '¿No tienes cuenta? Crear una',
    yaTengo: '¿Ya tienes cuenta? ',
    entrar: 'Entrar',
    orEmail: 'o con tu correo',
    aviso: 'Aviso de privacidad',
    avisoAcceptLead: 'Acepto el ',
    avisoGoogleLead: 'Al continuar, aceptas el ',
    /**
     * ⚠️ WERA'S `5R-h`: THE LINK OPENS WHATSAPP TO THE OWNER, who resets the
     * password by hand (his ruling of 2026-10-09). On *Entrar* only, and only on a
     * build that carries his number (`@/auth/support`). The label is Wera's word for
     * word; the two messages are what lands in his chat, and they name this app, so
     * he knows a neighbour is asking.
     */
    forgotPassword: '¿Olvidaste tu contraseña?',
    forgotMessage: 'Hola, olvidé mi contraseña de Itacate.',
    forgotMessageWithEmail: (email: string) => `Hola, olvidé mi contraseña de Itacate. Mi correo es ${email}`,
    signOut: 'Cerrar sesión',
    errors: {
      /** Wrong password, or no such account — one message, as Wera's (`5a-iii-a`). */
      badCredentials: 'El correo o la contraseña no son correctos.',
      emailTaken: 'Ese correo ya tiene una cuenta. Entra con tu contraseña.',
      emailInvalid: 'Ese correo no se ve bien. Revísalo.',
      emailMissing: 'Escribe tu correo.',
      passwordMissing: 'Escribe tu contraseña.',
      passwordShort: 'La contraseña necesita al menos 6 letras o números.',
      nameMissing: 'Escribe tu nombre.',
      surnameMissing: 'Escribe tu apellido.',
      avisoMissing: 'Para crear tu cuenta, acepta el Aviso de privacidad.',
      notConfirmed: 'Todavía falta confirmar tu correo.',
      tooMany: 'Demasiados intentos. Espera un minuto y vuelve a intentar.',
      offline: 'Sin conexión a internet. Intenta de nuevo en un momento.',
      googleFailed: 'No se pudo entrar con Google. Intenta de nuevo, o entra con tu correo.',
      appleFailed: 'No se pudo entrar con Apple. Intenta de nuevo, o entra con tu correo.',
      unknown: 'Algo salió mal. Intenta de nuevo.',
    },
  },

  /**
   * The skeleton's one screen (`10.2a`), now behind the sign-in: the map, and the
   * three lines it always had, with who is signed in and the way out under them.
   * `10.5-iv` replaces it with what is close to her.
   */
  inicio: {
    pronto: 'Muy pronto',
    detalle:
      'Estás probando una versión temprana. Todavía no hace nada: la iremos llenando con actualizaciones.',
    quien: (who: string) => `Entraste como ${who}.`,
  },

  /**
   * ⚠️ HER WAY OUT, `10.5-iii-b` — WERA'S WORDS (`app/src/strings.ts`, `ES.account`,
   * plans `5R-c` and `10.4b-i`), as Wera Cocina's are, held to Wera's file by
   * `test/account.test.ts`: one login in the three apps, so deleting it reads the
   * same in each. Nothing here is new: where each business lives is said as the
   * twin that is not its home says it — a kitchen as Wera does (*tu cocina en
   * Wera Cocina*), a shop as Wera Cocina does (*tu tienda en Wera*) — and where a
   * shop's records can be downloaded first is Wera Cocina's sentence.
   */
  account: {
    open: 'Eliminar mi cuenta',
    /** Nothing goes but the login — a neighbour's case. ⚠️ It promises nothing about a name staying. */
    aloneWarning:
      'Se borra tu acceso: tu correo, tu contraseña y tu entrada con Google o con Apple. ' +
      'No se puede deshacer.',
    /** ⚠️ The count is passed in, the grammar lives here. */
    businessesWarning: (count: number) =>
      count === 1
        ? 'Eres la única persona dueña de este negocio. Si eliminas tu cuenta, se borra completo, ' +
          'con todo lo que tiene. No se puede deshacer.'
        : 'Eres la única persona dueña de estos negocios. Si eliminas tu cuenta, se borran ' +
          'completos, con todo lo que tienen. No se puede deshacer.',
    /** Neither business lives here: a kitchen is in Wera Cocina, a shop in Wera. */
    businessLine: (name: string, kind: 'tienda' | 'cocina') =>
      kind === 'cocina' ? `${name}: tu cocina en Wera Cocina` : `${name}: tu tienda en Wera`,
    /** Wera's Ajustes offers a shop's month as a file before it goes (`5R-c`); this app cannot make it. */
    shopRecords: 'Antes, puedes descargar las ventas, compras y merma de tu tienda en Wera: Números → Descargar un mes.',
    typeShopName: (shop: string) => `Para confirmar, escribe el nombre de la tienda: ${shop}`,
    typeKitchenName: (kitchen: string) => `Para confirmar, escribe el nombre de la cocina: ${kitchen}`,
    confirm: 'Eliminar mi cuenta',
    confirmShop: 'Eliminar mi cuenta y la tienda',
    confirmKitchen: 'Eliminar mi cuenta y la cocina',
    confirmBusinesses: 'Eliminar mi cuenta y mis negocios',
    working: 'Eliminando…',
    cancel: 'Cancelar',
    errors: {
      /** `0073`'s refusal: a business the screen did not show. */
      listChanged: 'La lista de tus negocios cambió. Revísala y escribe otra vez cada nombre.',
    },
  },

  /**
   * What she is told when a call to the database fails — `@/api/errors`' keys,
   * Wera Cocina's sentences cut to what her way out can answer (`10.5-iii-b`).
   */
  api: {
    errors: {
      sessionEnded: 'Tu sesión se cerró. Entra de nuevo.',
      offline: 'Sin conexión a internet. Intenta de nuevo en un momento.',
      unknown: 'Algo salió mal. Intenta de nuevo.',
    },
  },
} as const;
