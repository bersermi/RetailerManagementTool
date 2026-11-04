// ============================================================================
// EVERY WORD ITACATE SHOWS, IN ONE FILE (ADR-035 §2.11). Plan tasks `10.2a`
// (the skeleton) and `10.5-iii-a` (signing in).
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
} as const;
