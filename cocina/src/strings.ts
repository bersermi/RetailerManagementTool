// ============================================================================
// EVERY WORD WERA COCINA SHOWS, IN ONE FILE (ADR-035 §2.11). Plan tasks `10.2a`
// (the skeleton) and `10.4b-iii-a` (signing in).
//
// ⚠️ WHERE A SCREEN HERE DOES WHAT ONE OF WERA'S DOES, ITS WORDS ARE WERA'S
// (`app/src/strings.ts`, `ES.auth`). One person can use both apps with one
// login, so the same refusal reads the same in each; a sentence changed there
// is changed here too. The reasons behind each sentence live beside Wera's copy.
// ============================================================================

export const ES = {
  nombre: 'Wera Cocina',

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
    signOut: 'Cerrar sesión',
    working: 'Un momento…',
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
   * ⚠️ `10.4b-iii-a`: WHERE A LOGIN WITH NO KITCHEN LANDS — every first sign-in,
   * and a shop's owner who opens this app with her Wera login (her shop is
   * Wera's, `0072`). Making the kitchen is `10.4b-iii-b`'s; until it ships the
   * screen says it is coming, and nothing more.
   */
  nueva: {
    antetitulo: 'Wera Cocina',
    titulo: 'Tu cocina',
    lista: 'Ya tienes tu cuenta.',
    quien: (who: string) => `Entraste como ${who}.`,
    pronto: 'Muy pronto podrás registrar aquí tu cocina: su nombre, su giro, su dirección y su lugar en el mapa.',
  },

  /** Her kitchen, once she has one. `10.4b-iii-b` and `10.4b-iv` fill it. */
  cocina: {
    antetitulo: 'Tu cocina',
    pronto: 'Muy pronto podrás publicar desde aquí lo que te sobra del día.',
    leyendo: 'Buscando tu cocina…',
    sinLeer: 'No pudimos leer tu cocina. Revisa tu conexión a internet.',
    otraVez: 'Intentar de nuevo',
  },
} as const;
