// ============================================================================
// EVERY WORD ITACATE SHOWS, IN ONE FILE (ADR-035 §2.11). Plan tasks `10.2a`
// (the skeleton), `10.5-iii-a` (signing in), `10.5-iii-b` (her way out),
// `10.5-iv-a-i` (the kitchens close to her) and `10.5-iv-a-ii` (a kitchen's page
// and a dish's).
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
  /**
   * ⚠️ `10.5-v-a`: THE APP'S LINE, where it first greets her — under the band of
   * the way in — and in its store text (the owner's ruling of 2026-11-05, the
   * family-shell page's call 10). Wera Cocina's is *Vende hasta el último plato*.
   */
  lema: 'La comida del día de tu colonia, a mejor precio',

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
   * ⚠️ `10.5-iv-a-i`: THE KITCHENS CLOSE TO HER, AS A LIST — the screen she lands
   * on, which replaced the skeleton's map. Proposal B's list (the owner's ruling of
   * 2026-11-01, https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu): a card per dish
   * on offer, and a faded card per quiet kitchen saying when it usually publishes —
   * his ruling of 2026-11-01, late: *Suele publicar entre semana, hacia las
   * 17:00*, else *Publicó ayer* or *Publicó el martes* — since `10.5-v-a` (his
   * ruling of 2026-11-05) *Suele tener ofertas …*: *publicar* is the fonda's verb,
   * not the neighbour's, and no word here makes the food sound left over
   * (`test/palabras.test.ts`).
   */
  cerca: {
    titulo: 'Cerca de ti',
    tuCuenta: 'Tu cuenta',
    /** Under the title: where the distances are measured from. */
    desdeTuUbicacion: 'Según tu ubicación',
    desdeCodigo: (cp: string) => `Cerca del código postal ${cp}`,
    cambiarCodigo: 'Cambiar',
    buscandote: 'Buscando dónde estás…',
    cargando: 'Buscando cocinas…',
    vacio: 'Todavía ninguna cocina tiene algo publicado. Vuelve más tarde.',
    /** Why the postal code is asked for — one line each, above the box. */
    sinPermiso: 'Sin tu ubicación, escribe tu código postal y te mostramos lo que hay cerca.',
    aproximada:
      'Tu teléfono solo nos deja ver tu ubicación aproximada. Escribe tu código postal para ver lo que hay cerca.',
    sinUbicacion: 'No pudimos saber dónde estás. Escribe tu código postal para ver lo que hay cerca.',
    /** Outside Wera Cocina's search zone (`ZONA_DE_BUSQUEDA`, the owner's ruling of 2026-11-04, night). */
    fueraDeZona: 'Itacate aún no llega a tu zona.',
    fueraDeZonaDetalle: 'Por ahora está en la Ciudad de México y el Estado de México.',
    otroCodigo: 'Si quieres ver otro lugar, escribe su código postal.',
    /** Her way back to her location, under the box: asks again, or opens Itacate in Settings. */
    usarUbicacion: 'Usar mi ubicación',
    codigoPostal: 'Código postal',
    buscar: 'Buscar',
    codigo: {
      corto: 'Escribe los 5 números del código postal.',
      ninguno: 'No encontramos ese código postal.',
      fuera: 'Itacate aún no llega a esa zona.',
      sinSenal: 'Sin conexión a internet. Intenta de nuevo en un momento.',
      falla: 'No pudimos buscar ese código postal. Intenta de nuevo.',
    },
    /** A distance — `@/lib/distancia` rounds it, the unit is here. */
    metros: (n: number) => `${n} m`,
    kilometros: (cifra: string) => `${cifra} km`,
    sorpresa: 'Sorpresa',
    /** How many are left, before reservations exist (`10.5b`): what she published. */
    quedan: (n: number) => `Quedan ${n}`,
    ultimo: 'Último',
    /** The saving, on her colour — the drawing's *−50%*, with a true minus sign. */
    ahorro: (pct: number) => `−${pct}%`,
    /** A quiet kitchen's card: the pattern once 3 or more publications in 4 weeks show one. */
    suele: (dias: string, hora: string) => `Suele tener ofertas ${dias}, ${hora}`,
    hacia: (hora: number) => (hora === 1 ? 'hacia la 1:00' : `hacia las ${hora}:00`),
    todosLosDias: 'todos los días',
    casiTodosLosDias: 'casi todos los días',
    entreSemana: 'entre semana',
    finesDeSemana: 'los fines de semana',
    /** Monday first — the door's `weekdays`, ISO's order. Plural, as in *los lunes y jueves*. */
    losDias: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'],
    los: (dias: readonly string[]) =>
      dias.length === 1 ? `los ${dias[0]}` : `los ${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}`,
    /** Otherwise, when she last did. Monday first; singular, as in *Publicó el martes*. */
    elDia: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
    meses: [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ],
    publicoHoy: 'Publicó hoy',
    publicoAyer: 'Publicó ayer',
    publicoEl: (dia: string) => `Publicó el ${dia}`,
    publicoFecha: (dia: number, mes: string) => `Publicó el ${dia} de ${mes}`,
    /** `10.5-iv-a-ii`: what a screen reader says for a card, which now opens a page. */
    abrirPlatillo: (platillo: string, cocina: string) => `${platillo}, de ${cocina}`,
    abrirCocina: (cocina: string) => `${cocina}, sin ofertas ahora`,
    /**
     * `10.5-iv-a-iv` — *Ordenar*, her pick of the list's order (the owner's answer 2 of
     * 2026-11-05). The list opens on *Ahora* (his answer 1).
     */
    ordenar: 'Ordenar',
    orden: { ahora: 'Ahora', cerca: 'Más cerca', barato: 'Más barato' },
    /** What a screen reader says for each of its buttons. */
    ordenarPor: (orden: string) => `Ordenar: ${orden}`,
  },

  /**
   * ⚠️ `10.5-iv-a-ii`: A KITCHEN'S OWN PAGE — proposal B as the proposals page drew it
   * (the owner's ruling of 2026-11-01): her cover, her circle, her name, her trade and
   * her colonia, her sentence, where she is and *Cómo llegar*, and under *Hoy* what she
   * has on offer now; and his ruling of 2026-11-01, late: else *Hoy no ha publicado*
   * with her pattern, and *Lo que suele publicar* — her repeated dishes over four
   * weeks, how often and the usual price; since `10.5-v-a` (his ruling of
   * 2026-11-05) *Lo que suele ofrecer*, and *Por hoy ya se terminó* once today's
   * offers ended. *Ver en Google Maps* is Wera Cocina's words,
   * held to its file. Every other word here is this row's own.
   */
  pagina: {
    volver: 'Volver',
    hoy: 'Hoy',
    /** Nothing on offer, and she has not published for today. */
    hoyNoHaPublicado: 'Hoy no ha publicado',
    /** Nothing on offer, though she did publish for today: it ended, or she took it down. */
    nadaPorHoy: 'Por hoy ya se terminó',
    loQueSuele: 'Lo que suele ofrecer',
    /** How often, over the door's four weeks — two or more, by the door's rule. */
    veces: (n: number) => (n === 1 ? '1 vez en las últimas 4 semanas' : `${n} veces en las últimas 4 semanas`),
    /** And the price she usually gives it, when the door has one. */
    vecesYPrecio: (veces: string, precio: string) => `${veces} · normalmente a ${precio}`,
    /** ⚠️ Wera Cocina's words for her link, in her preview (`cocina/src/strings.ts`, `ES.pagina.verEnMaps`). */
    verEnMaps: 'Ver en Google Maps ›',
    comoLlegar: 'Cómo llegar ›',
    /** What a screen reader says for the two links, which open Google Maps. */
    comoLlegarAyuda: 'Cómo llegar, en Google Maps',
    verEnMapsAyuda: 'Ver en Google Maps',
    /** The door no longer sends her: she has not published in 14 days, or the kitchen was deleted. */
    yaNoEsta: 'Esta cocina ya no está en Itacate.',
    cargando: 'Buscando la cocina…',
  },

  /**
   * ⚠️ `10.5-iv-a-ii`: A DISH'S PAGE — proposal B's, *"everything she needs to reserve
   * it"*, without the reserving, which is `10.5b`'s: its photo, the kitchen's row, its
   * name, what it has, the tags, the price and the *vale*, the window, *Quedan N*,
   * where and *Cómo llegar*. The allergy line is the drawing's, word for word.
   */
  platillo: {
    /** For a surprise bag — the proposals page's fixed sentence, as every app it read has one. */
    alergia: 'Es sorpresa: si tienes alergia, pregunta antes o elige otro',
    /** ⚠️ Wera Cocina's six words for the tags (`cocina/src/strings.ts`, `ES.publicar.etiqueta`), held to its file. */
    etiqueta: {
      pica: 'Pica',
      cerdo: 'Cerdo',
      mariscos: 'Mariscos',
      cacahuate: 'Cacahuate',
      lacteos: 'Lácteos',
      gluten: 'Gluten',
    },
    /** Its window ended, or she took it down, while the page was open. */
    terminado: 'Este platillo ya no está en oferta.',
    /** The kitchen's row, for a screen reader: it opens her page. */
    verCocina: (cocina: string) => `Ver la página de ${cocina}`,
    cargando: 'Buscando el platillo…',
  },

  /**
   * ⚠️ WERA COCINA'S DAYS AND TIMES, WORD FOR WORD (`cocina/src/strings.ts`, `ES.fechas`,
   * plan `10.4b-iv-a`): a window reads the same in the app that published it and
   * the app that shows it. `@/lib/ventana` is Wera Cocina's, copied, and
   * `test/gemelos.test.ts` holds both to Wera Cocina's files.
   */
  fechas: {
    hoy: 'Hoy',
    manana: 'Mañana',
    ayer: 'Ayer',
    /** The first three letters of each day, Sunday first — `Date.getDay()`'s order. */
    dias: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    dia: (abreviatura: string, numero: number) => `${abreviatura} ${numero}`,
    momento: (dia: string, hora: string) => `${dia} ${hora}`,
    horario: (dia: string, desde: string, hasta: string) => `${dia} · ${desde} a ${hasta}`,
  },

  /**
   * Her account, on a screen of its own since `10.5-iv-a-i` (the list replaced the
   * one screen her way out stood at the foot of): who is signed in, and `@/ui/Salidas`.
   */
  cuenta: {
    titulo: 'Tu cuenta',
    volver: 'Volver',
    quien: (who: string) => `Entraste como ${who}.`,
    version: 'Estás probando una versión temprana de Itacate: la iremos llenando con actualizaciones.',
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
