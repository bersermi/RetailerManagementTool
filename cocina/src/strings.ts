// ============================================================================
// EVERY WORD WERA COCINA SHOWS, IN ONE FILE (ADR-035 §2.11). Plan tasks `10.2a`
// (the skeleton), `10.4b-iii-a` (signing in), `10.4b-iii-b` (her kitchen),
// `10.4b-iii-c` (her way out), `10.4b-iv-a` (what she publishes) and `10.5-ii`
// (her page in Itacate, and a photo per dish).
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
    /**
     * ⚠️ `10.4b-iv-b`, WERA'S `5R-h`: THE LINK OPENS WHATSAPP TO THE OWNER, who
     * resets the password by hand (his ruling of 2026-10-09). On *Entrar* only, and
     * only on a build that carries his number (`@/auth/support`). The label is
     * Wera's word for word; the two messages are what lands in his chat, and they
     * name this app, so he knows a fonda is asking.
     */
    forgotPassword: '¿Olvidaste tu contraseña?',
    forgotMessage: 'Hola, olvidé mi contraseña de Wera Cocina.',
    forgotMessageWithEmail: (email: string) =>
      `Hola, olvidé mi contraseña de Wera Cocina. Mi correo es ${email}`,
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
   * shop is Wera's, `0072`). Two screens since `10.4h` (the owner's ruling of
   * 2026-11-03, address first): her kitchen's name and trade, then her address
   * on a screen of its own (`direccion`).
   */
  registro: {
    antetitulo: 'Wera Cocina',
    titulo: 'Registra tu cocina',
    paso: (n: number) => `Paso ${n} de 2`,
    quien: (who: string) => `Entraste como ${who}.`,
    nombre: 'Nombre de tu cocina',
    /** A hint in muted ink, never a value: she types her own. */
    nombreEjemplo: 'Fonda Doña Lupe',
    giro: '¿Qué es tu cocina?',
    giroLeyendo: 'Buscando la lista…',
    giroSinLeer: 'No pudimos leer la lista. Revisa tu conexión a internet.',
    donde: '¿Dónde está tu cocina?',
    siguiente: 'Siguiente: tu dirección',
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
   * ⚠️ THIS APP'S ALONE, NOT WERA'S (`10.4g-i`, the owner's answer of 2026-11-03): the
   * *Busca tu dirección* box above her five boxes. Its hint asks for the colonia
   * because Google needs it — measured, hers was among the five suggestions for 3
   * to 5 of twenty addresses without it, 11 to 14 with it (`@/lib/google`). A pick
   * fills the boxes; *revisa* says they are a proposal, hers to check. *Buscando…*,
   * ✕'s name and Google's credit are the map's box's (`ES.mapa`).
   */
  buscaDireccion: {
    /** The box's hint, in muted ink — the magnifier says what it is for. */
    hint: 'Busca tu calle, número y colonia',
    etiqueta: 'Busca tu dirección',
    /** Names where it looked, as the map's box does (`10.4f`): a fonda elsewhere must not read her address as wrong. */
    ninguna: 'No encontramos esa dirección en la Ciudad de México ni en el Estado de México. Escríbela de otra forma, o llénala abajo.',
    sinSenal: 'Sin conexión. Llena tu dirección abajo.',
    falla: 'Ahora no podemos buscar. Llena tu dirección abajo.',
    revisa: 'Revisa que tu dirección esté bien. Puedes corregir cualquier dato.',
  },

  /**
   * ⚠️⚠️ HER ADDRESS FIRST (`10.4h`, the owner's ruling of 2026-11-03): *¿Dónde está
   * tu cocina?* — the search, her five boxes, a small map with the pin where Google
   * places her address (looked up live, never kept), her line of directions — in
   * the sign-up and behind *Cambiar dirección*. The words are the proposal's he
   * chose (https://claude.ai/artifact/45eNGq6YLmMrV3DF6Lfa1D), but the small map's
   * sentences when it has no point, and the line about neighbours, which carries
   * the old map screen's warning to the screen she now registers on.
   */
  direccion: {
    titulo: '¿Dónde está tu cocina?',
    volver: 'Volver',
    /** Under the small map, whenever it draws a point: she never has to touch it. */
    tocaElMapa: 'Si el punto no es tu puerta, toca el mapa.',
    /** The tag at the small map's top — at its top, never its foot, where Google's logo is. */
    ajustarEtiqueta: 'Ajustar',
    /** What a screen reader says the small map is. */
    ajustarNombre: 'Ajustar el punto en el mapa',
    /** The small map with no point, and why. */
    sinDireccion: 'Escribe tu dirección para verla en el mapa.',
    buscando: 'Buscando tu dirección…',
    ninguna: 'No encontramos tu dirección en el mapa. Si quieres, toca aquí para poner tu punto.',
    /** Her kitchen's screen: no tap there, *Ajustar punto* is beside it. */
    ningunaFija: 'No encontramos tu dirección en el mapa.',
    sinSenal: 'Sin conexión. El mapa se verá cuando vuelva la señal.',
    falla: 'Ahora no podemos mostrar el mapa.',
    /**
     * ⚠️ SAID BEFORE SHE SAVES, BECAUSE IT IS TRUE: a kitchen's address and its point
     * are shown to signed-in neighbours before they reserve (the owner's ruling 4,
     * 2026-10-28), and nobody has asked whether a fonda is run from a home. Until
     * `10.4h` the map screen said it (*Los vecinos verán este punto exacto*).
     */
    vecinos: 'Los vecinos verán tu dirección y este punto en el mapa.',
    registrar: 'Registrar mi cocina',
    guardar: 'Guardar',
  },

  /**
   * ⚠️ HER OWN POINT, ON THE FLAT STREET MAP — *Ajusta el punto* since `10.4h`, opened
   * only if she wants it (the owner's ruling of 2026-11-03: the pin is a suggestion
   * she never has to touch). The pin stays in the middle and she moves the map
   * under it (`10.4e`); the hint over the map changes with it: too far, close
   * enough, placed (`@/lib/mapa`). The search box only moves the map (`@/lib/google`).
   */
  mapa: {
    titulo: 'Ajusta el punto',
    volver: 'Volver',
    /** The search box's hint, in muted ink — the magnifier says what the box is for. */
    buscar: 'Busca tu calle y número',
    buscarEtiqueta: 'Buscar tu calle en el mapa',
    borrarBusqueda: 'Borrar la búsqueda',
    buscando: 'Buscando…',
    /**
     * ⚠️ NAMES WHERE IT LOOKED (`10.4f`, the owner's ruling of 2026-11-02): the search
     * covers Mexico City and the State of Mexico only (`@/lib/google`'s
     * `ZONA_DE_BUSQUEDA`), and a fonda elsewhere must not read her address as wrong.
     */
    ninguna: 'No encontramos esa calle en la Ciudad de México ni en el Estado de México. Escríbela de otra forma, o busca tu cocina en el mapa.',
    sinSenal: 'Sin conexión. Busca tu cocina en el mapa.',
    falla: 'Ahora no podemos buscar. Busca tu cocina en el mapa.',
    /**
     * ⚠️ GOOGLE'S CREDIT, AS ITS PLACES POLICIES ASK IT WHERE ITS MAP MAY NOT SHOW
     * (read 2026-11-03): the text *Google Maps*, never translated or wrapped, at
     * the foot of the suggestions' own box — over the map the list can hide the
     * map's logo, and the address form has no map.
     */
    creditoGoogle: 'Google Maps',
    lejos: 'Toca el mapa cerca de tu cocina para acercarte, o busca tu calle arriba.',
    /**
     * ⚠️ `10.4e` (the owner's ruling of 2026-11-02, as Uber does it): the pin stays in
     * the middle and she moves the map under it. Said whenever the map is close but
     * the middle is not hers yet — after a flight to a search's answer, whose point
     * is never stored (`@/lib/mapa`'s `alLlegar`).
     */
    cerca: 'Mueve el mapa hasta que el pin quede justo donde entregas la comida.',
    puesto: 'Tu cocina queda donde está el pin. Si no es el lugar exacto, mueve el mapa.',
    /**
     * ⚠️ THE CARD NAMES HER OWN ADDRESS (`10.4g-i`, the owner's ruling of 2026-11-03),
     * and warns only when Google names another street under her pin — *parece*,
     * because at 1 of the 12 trusted doors measured Google named another street
     * (`@/lib/google`'s `otraCalle`). Google's name is shown, never kept.
     */
    suDireccion: (linea: string) => `Tu dirección: ${linea}`,
    otraVez: 'Si el pin no está justo en tu puerta, mueve el mapa.',
    otraCalle: (deGoogle: string, suya: string) =>
      `El pin parece estar en ${deGoogle}, no en ${suya}. Mueve el mapa hasta tu puerta.`,
    indicaciones: 'Cómo encontrarte (opcional)',
    /** A hint in muted ink, never a value. */
    indicacionesEjemplo: 'Portón verde, junto a la farmacia',
    /** Under *Listo*: what her own point is for — kept, and used by every map. */
    guardado: 'Tu punto queda guardado y lo usan todos los mapas.',
    listo: 'Listo',
  },

  /**
   * Her kitchen, once she has one — and the second door for whatever is missing.
   * Publishing is `publicar`'s. Since `10.4h` her address comes first, the small map
   * under it, and *Cambiar dirección* and *Cambiar giro* are two doors; her own
   * point is never missing — it is hers to set (*Ajustar punto*).
   */
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
    cambiarDireccion: 'Cambiar dirección',
    ajustarPunto: 'Ajustar punto',
    cambiarGiro: 'Cambiar giro',
    /** `10.5-ii`: her page's door, under a small picture of it. */
    pagina: 'Tu página en Itacate',
    editarPagina: 'Editar tu página',
  },

  /**
   * ⚠️ `10.5-ii`: *TU PÁGINA EN ITACATE* — proposal B as the proposals page drew it
   * (https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu), the owner's ruling of
   * 2026-11-01: *Así te ven tus vecinos*, *Foto de portada* with *Tomar foto* and
   * *Elegir*, *Tu color* with the six names, *Una frase sobre tu cocina* with its
   * count, the hint about a home's front, *Guardar*. Her logo and her Google Maps
   * link were not drawn; their words are this row's.
   */
  pagina: {
    titulo: 'Tu página en Itacate',
    volver: 'Volver',
    asiTeVen: 'Así te ven tus vecinos',
    portada: 'Foto de portada',
    tomar: 'Tomar foto',
    elegir: 'Elegir',
    quitar: 'Quitar',
    color: 'Tu color',
    colores: {
      chile: 'Chile',
      mole: 'Mole',
      nopal: 'Nopal',
      talavera: 'Talavera',
      cempasuchil: 'Cempasúchil',
      jamaica: 'Jamaica',
    },
    frase: 'Una frase sobre tu cocina',
    fraseEjemplo: 'Comida casera desde 1998. Menú distinto cada día.',
    /** The sentence's count, as the drawing shows it: `49 / 100`. */
    cuenta: (n: number, max: number) => `${n} / ${max}`,
    logo: 'Tu logo (opcional)',
    sinLogo: 'Sin logo, van tus iniciales.',
    enlace: 'Tu enlace de Google Maps (opcional)',
    enlaceEjemplo: 'https://maps.app.goo.gl/…',
    enlaceComo: 'En Google Maps, busca tu cocina, toca Compartir, copia el enlace y pégalo aquí.',
    /** What Itacate will show for her link — the owner's Google ruling of 2026-11-01. */
    verEnMaps: 'Ver en Google Maps ›',
    aviso: 'Tus vecinos verán estas fotos y esta frase. Si tu cocina está en tu casa, mejor una foto de tu comida que de tu fachada.',
    guardar: 'Guardar',
    leyendo: 'Buscando tu página…',
    errores: {
      sentenceLong: 'La frase es muy larga: hasta 100 letras.',
      link: 'Ese enlace no es de Google Maps. En Google Maps, toca Compartir y copia el enlace.',
    },
  },

  /** `10.5-ii`: what a tap on *Tomar foto* or *Elegir* can come to, besides a photo. */
  foto: {
    denegada: 'Wera Cocina no tiene permiso para usar la cámara. Puedes darlo en los ajustes de tu teléfono.',
    fallo: 'No se pudo usar esa foto. Intenta de nuevo.',
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
   * ⚠️ *ELIMINAR ESTA COCINA* — this app's own words (`10.5-iii-c`, `0077`, the
   * owner's ruling of 2026-11-04): Wera has no such deletion, so nothing here is
   * held to Wera's file. What goes is the deletion page's list, cut to a screen;
   * what stays is the one login. The box's label, *Eliminando…* and *Cancelar*
   * are `account`'s, Wera's words.
   */
  kitchenDeletion: {
    open: 'Eliminar esta cocina',
    /** What goes. ⚠️ The photos are in "todo lo que tiene"; when they are deleted is the aviso's. */
    warning:
      'Se borra esta cocina completa, con todo lo que tiene: su dirección, su punto en el mapa, ' +
      'su página en Itacate y lo que publicó. No se puede deshacer.',
    /** What stays: the login, which is the same in the three apps. */
    keeps: 'Tu cuenta sigue: entras con ella a Wera Cocina, a Itacate y a Wera, y puedes registrar otra cocina.',
    confirm: 'Eliminar esta cocina',
    errors: {
      /** `0077`'s `TD007`: the kitchen's name changed after the screen read it. */
      nameChanged: 'El nombre de la cocina cambió. Revísalo y escríbelo otra vez.',
      /** `0077`'s `TD012`: the kitchen is not hers alone, or is gone already. */
      notHersAlone: 'Solo la única persona dueña de esta cocina puede eliminarla.',
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
    /** `10.5-ii`: each line's photo — *Repetir* brings yesterday's back. */
    foto: 'Foto (opcional)',
    sinFoto: 'Sin foto, va el dibujo de tu cocina.',
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

  /** Her trade, changed or given from her kitchen's screen — a door of its own since `10.4h`. */
  giro: {
    titulo: '¿Qué es tu cocina?',
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
