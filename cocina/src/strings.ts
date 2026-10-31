// ============================================================================
// EVERY WORD WERA COCINA SHOWS, IN ONE FILE (ADR-035 §2.11). Plan tasks `10.2a`
// (the skeleton), `10.4b-iii-a` (signing in), `10.4b-iii-b` (her kitchen),
// `10.4b-iii-c` (her way out) and `10.4b-iv-a` (what she publishes).
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
   * ⚠️ `10.4b-iii-b`: WHERE A LOGIN WITH NO KITCHEN LANDS, AND MAKES ONE — every
   * first sign-in, and a shop's owner who opens this app with her Wera login (her
   * shop is Wera's, `0072`). Two screens: this form, then the map.
   */
  registro: {
    antetitulo: 'Wera Cocina',
    titulo: 'Registra tu cocina',
    quien: (who: string) => `Entraste como ${who}.`,
    nombre: 'Nombre de tu cocina',
    /** A hint in muted ink, never a value: she types her own. */
    nombreEjemplo: 'Fonda Doña Lupe',
    giro: '¿Qué es tu cocina?',
    giroLeyendo: 'Buscando la lista…',
    giroSinLeer: 'No pudimos leer la lista. Revisa tu conexión a internet.',
    donde: '¿Dónde está tu cocina?',
    siguiente: 'Siguiente: tu cocina en el mapa',
    errores: {
      nombre: 'Escribe el nombre de tu cocina.',
      giro: 'Elige qué es tu cocina.',
    },
  },

  /**
   * ⚠️ WERA'S WORDS (`app/src/strings.ts`, `ES.address`, plan `8k`): the same five
   * boxes, the same refusals, the same one line — `test/place.test.ts` holds
   * them to Wera's file. One person may give an address in both apps.
   */
  address: {
    street: 'Calle',
    number: 'Número',
    colonia: 'Colonia (opcional)',
    city: 'Ciudad o alcaldía',
    postalCode: 'Código postal',
    /** The bar above the postal code's number pad on an iPhone. */
    done: 'Listo',
    line: (street: string, number: string, colonia: string, city: string, cp: string) =>
      [`${street} ${number}`, colonia, city, `C.P. ${cp}`].filter((part) => part.trim() !== '').join(', '),
    issues: {
      street: 'Escribe la calle.',
      number: 'Escribe el número.',
      city: 'Escribe la ciudad o alcaldía.',
      postalCode: 'El código postal son cinco números.',
    },
  },

  /**
   * ⚠️ HER PIN, ON THE SATELLITE VIEW (`0072`; the owner's *"as precise as
   * possible"*, 2026-10-28). The hint changes with the map: too far, close
   * enough, placed (`@/lib/mapa`).
   */
  mapa: {
    titulo: '¿Dónde entregas la comida?',
    volver: 'Volver',
    lejos: 'Busca tu cocina en el mapa. Toca cerca de ella para acercarte.',
    cerca: 'Ahora toca justo donde entregas la comida.',
    puesto: 'Aquí está tu cocina. Si no es el lugar exacto, toca otra vez.',
    indicaciones: 'Cómo encontrarte (opcional)',
    /** A hint in muted ink, never a value. */
    indicacionesEjemplo: 'Portón verde, junto a la farmacia',
    /**
     * ⚠️ SAID BEFORE SHE SAVES IT, BECAUSE IT IS TRUE: a kitchen's exact spot is
     * shown to signed-in neighbours before they reserve (the owner's ruling 4,
     * 2026-10-28), and nobody has asked whether a fonda is run from a home.
     */
    vecinos: 'Los vecinos verán este punto exacto en el mapa.',
    falta: 'Toca el mapa justo donde entregas la comida.',
    registrar: 'Registrar mi cocina',
    guardar: 'Guardar',
  },

  /** Her kitchen, once she has one — and the second door for whatever is missing. Publishing is `publicar`'s. */
  cocina: {
    antetitulo: 'Tu cocina',
    leyendo: 'Buscando tu cocina…',
    sinLeer: 'No pudimos leer tu cocina. Revisa tu conexión a internet.',
    otraVez: 'Intentar de nuevo',
    donde: 'Dónde entregas',
    /** Her line of directions, read back under the map. */
    indicaciones: (line: string) => `“${line}”`,
    sinGiro: 'Falta qué es tu cocina.',
    sinDireccion: 'Falta tu dirección.',
    sinPunto: 'Falta tu cocina en el mapa.',
    ponerPunto: 'Poner mi cocina en el mapa',
    cambiarPunto: 'Cambiar el punto',
    completarDatos: 'Completar',
    cambiarDatos: 'Cambiar giro o dirección',
  },

  /**
   * ⚠️ HER WAY OUT, `10.4b-iii-c` — WERA'S WORDS (`app/src/strings.ts`,
   * `ES.account`, plans `5R-c` and `10.4b-i`), held to Wera's file by
   * `test/account.test.ts`: one login in both apps, so deleting it reads the same
   * in each. Two are this app's own: where each business lives, said from here
   * (`businessLine`), and where a shop's records can be downloaded first
   * (`shopRecords`), since this app cannot make that file.
   */
  account: {
    open: 'Eliminar mi cuenta',
    /** Nothing goes but the login. ⚠️ It promises nothing about a name staying. */
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
    /** This app's own: a kitchen is here; a shop is in Wera (Wera says the mirror). */
    businessLine: (name: string, kind: 'tienda' | 'cocina') =>
      kind === 'cocina' ? `${name}: tu cocina` : `${name}: tu tienda en Wera`,
    /**
     * This app's own: Wera's Ajustes offers a shop's month as a file before it
     * goes (`5R-c`); Cocina cannot make that file, so it says where it is made.
     */
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
   * ⚠️ `10.4b-iv-a`: WHAT SHE PUBLISHES — proposal B, his choice of 2026-10-29: one
   * or more lines, each a dish or, with one switch, a surprise bag, whose
   * description asks *¿Qué suele llevar?* and which may say what it is usually
   * worth; then when neighbours may come. Hints are muted ink, never values.
   */
  publicar: {
    abrir: 'Publicar lo que te sobra',
    titulo: 'Publicar lo que te sobra',
    repetida: 'Repetir',
    volver: 'Volver',
    que: '¿Qué ofreces?',
    platillo: 'Platillo',
    bolsa: 'Bolsa sorpresa',
    /** Each line's heading — `Platillo 2`, `Bolsa sorpresa 1` — which a problem names. */
    renglon: (surprise: boolean, n: number) => `${surprise ? 'Bolsa sorpresa' : 'Platillo'} ${n}`,
    nombre: 'Nombre',
    nombreEjemplo: { platillo: 'Comida corrida', bolsa: 'Bolsa de pan' },
    descripcion: { platillo: 'Descripción (opcional)', bolsa: '¿Qué suele llevar? (opcional)' },
    descripcionEjemplo: { platillo: 'Sopa, arroz y guisado del día', bolsa: '6 piezas de pan dulce' },
    precio: 'Precio de cada uno',
    cuantos: 'Cuántos hay',
    vale: 'Lo que vale normalmente (opcional)',
    etiquetas: 'Avisa si pica o si lleva (opcional)',
    etiqueta: {
      pica: 'Pica',
      cerdo: 'Cerdo',
      mariscos: 'Mariscos',
      cacahuate: 'Cacahuate',
      lacteos: 'Lácteos',
      gluten: 'Gluten',
    },
    quitar: 'Quitar',
    otro: 'Otro platillo',
    cuando: '¿Cuándo pueden pasar?',
    desde: 'Desde',
    hasta: 'Hasta',
    /** The steppers' two buttons, for a screen reader: `Desde: más temprano`. */
    mover: (cual: string, mas: boolean) => `${cual}: ${mas ? 'más tarde' : 'más temprano'}`,
    publicar: 'Publicar',
    /** The bar above the number pads on an iPhone. */
    listo: 'Listo',
    sinLugar: 'No encontramos dónde entregas. Vuelve a tu cocina e intenta de nuevo.',
    errores: {
      /** A problem said with its line's heading in front: `Platillo 2: escribe el precio.` */
      enRenglon: (renglon: string, problema: string) => `${renglon}: ${problema}`,
      linea: {
        name: 'escribe su nombre.',
        nameLong: 'el nombre es muy largo: hasta 80 letras.',
        descriptionLong: 'la descripción es muy larga: hasta 200 letras.',
        price: 'escribe el precio.',
        priceShape: 'el precio no se ve bien. Escríbelo así: 65 o 65.50.',
        count: 'escribe cuántos hay.',
        countShape: 'cuántos hay es un número del 1 al 999.',
        usualShape: 'lo que vale normalmente no se ve bien. Escríbelo así: 120.',
        usualLow: 'lo que vale normalmente tiene que ser más que el precio.',
      },
      ventana: {
        backwards: 'La hora de fin tiene que ser después de la de inicio.',
        ended: 'Esa hora ya pasó. Cambia el horario.',
        tooFar: 'Tiene que empezar en menos de 24 horas.',
        tooLong: 'El horario puede durar hasta 12 horas.',
      },
      noLines: 'Agrega lo que ofreces.',
      tooMany: 'Hasta 10 platillos por publicación.',
    },
  },

  /** `10.4b-iv-a`: her list, on her kitchen's screen — what is on offer, then what came before. */
  publicaciones: {
    titulo: 'Lo que publicaste',
    ninguna: 'Todavía no has publicado nada.',
    leyendo: 'Buscando lo que publicaste…',
    sinLeer: 'No pudimos leer lo que publicaste. Revisa tu conexión a internet.',
    estado: { oferta: 'En oferta', terminada: 'Terminó', retirada: 'Retirada' },
    /** One line's figures — `4 a $65` — and, for a bag, what it is usually worth. */
    cantidad: (count: number, price: string) => `${count} a ${price}`,
    vale: (price: string) => `vale ${price}`,
    repetir: 'Repetir',
    retirar: 'Retirar',
    /** ⚠️ Wera's inline question (*¿Cancelarla?*, `8k`), not a dialog. */
    retirarPregunta: '¿Retirarla?',
    retirarSi: 'Sí, retirar',
    retirarNo: 'No',
  },

  /** Days and times as she says them. ⚠️ Wera's shapes: `Mañana · 9:45 a 10:00` (`slotShort`), `Lun 13`. */
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

  /** Her trade and her address, changed or completed from her kitchen's screen. */
  datos: {
    titulo: 'Giro y dirección',
    volver: 'Volver',
    guardar: 'Guardar',
  },

  /**
   * What a failed call says (`@/api/errors`). ⚠️ `sessionEnded`, `offline` and
   * `unknown` are Wera's sentences (`ES.api.errors`), held to Wera's file.
   */
  api: {
    errors: {
      sessionEnded: 'Tu sesión se cerró. Entra de nuevo.',
      offline: 'Sin conexión a internet. Intenta de nuevo en un momento.',
      ownerOnly: 'Solo el dueño de la cocina puede cambiarlo.',
      /**
       * `22023`, a value the database would not take (`10.4b-iv-a`). The forms check
       * what the database checks, so this is time passing or a clock that is off.
       */
      revisar: 'Algo de lo que escribiste no se pudo guardar así. Revísalo e intenta de nuevo.',
      unknown: 'Algo salió mal. Intenta de nuevo.',
    },
  },
} as const;
