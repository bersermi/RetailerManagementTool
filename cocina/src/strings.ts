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
  /**
   * ⚠️ `10.5-v-a`: THE APP'S LINE, where it first greets her — under the band of
   * the way in — and in its store text (the owner's ruling of 2026-11-05, the
   * family-shell page's call 10). *Itacate*'s is *La comida del día de tu colonia,
   * a mejor precio*.
   */
  lema: 'Vende hasta el último plato',

  /**
   * ⚠️ `10.5-v-d`: THE FIRST SCREEN (`(auth)/hola`), the family-shell page's first run — the
   * cow's opening, the app's name and its line, and the two ways into an account. *Crear
   * cuenta* is Wera's word (`auth.signUp`); *Ya tengo cuenta* opens the way in on *Entrar*.
   * `misma` sits where the way in showed the line until this row: the account is one
   * login across Wera, Wera Cocina and Itacate.
   */
  hola: {
    crear: 'Crear cuenta',
    tengo: 'Ya tengo cuenta',
    misma: 'Tu cuenta es la misma en Wera, Wera Cocina e Itacate.',
    volver: 'Volver',
  },

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
    /** ⚠️ `10.5-v-d`: three steps — her kitchen, her address, then *¿Qué ofreces hoy?* (the first run). */
    paso: (n: number) => `Paso ${n} de 3`,
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
   * ⚠️ `10.5-v-a` (the owner's ruling of 2026-11-05): no word that makes the food
   * sound left over — the button is *Publicar una oferta* and the screen *Tu
   * oferta de hoy* (`test/palabras.test.ts`).
   */
  publicar: {
    abrir: 'Publicar una oferta',
    titulo: 'Tu oferta de hoy',
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
    /** ⚠️ `10.5-v-d`: required on every line (the owner's ruling of 2026-11-06), so no *(opcional)*. */
    vale: 'Lo que vale normalmente',
    /** The drawing's two hints — muted ink in the boxes, and the card's figures until she types hers. */
    precioEjemplo: '60',
    valeEjemplo: '120',
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
    /** `10.5-v-d`: over the card at the form's foot — Itacate's own card, filling in as she types. */
    asiLaVeran: 'Así la verán en Itacate',
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
        usual: 'escribe lo que vale normalmente, para que tus vecinos vean cuánto ahorran.',
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

  /**
   * ⚠️ `10.5-v-c-i`: THE TAB BAR — *Hoy · Apartados · Clientes · Mi cocina* (the owner's
   * ruling of 2026-11-05, the family-shell page's call 4). *Apartados* arrives with
   * reserving (`10.5b`), *Clientes* with the stamp card; their words wait here.
   */
  pestanas: {
    hoy: 'Hoy',
    apartados: 'Apartados',
    clientes: 'Clientes',
    miCocina: 'Mi cocina',
  },

  /**
   * ⚠️ `10.5-v-c-i`: *HOY* AS A HUB (his directions of 2026-11-06, the family-shell page's
   * round 6): the day's card — *Hoy en Itacate*, how many are on offer and until when, the
   * time left, each dish on a line — then *Publicar una oferta* with *Repetir*, then the
   * doors. Before reserving (`10.5b`) nothing is reserved, so the card counts what is on
   * offer; *Quedan 4 de 8* is that row's.
   */
  hoy: {
    enItacate: 'Hoy en Itacate',
    /** *hasta las 19:00*; a window that ends another day names it: *hasta mañana a las 1:00*. */
    hasta: (dia: string | null, hora: string) => (dia === null ? `hasta las ${hora}` : `hasta ${dia} a las ${hora}`),
    porciones: (n: number) => (n === 1 ? '1 porción en oferta' : `${n} porciones en oferta`),
    enOferta: (n: number) => `${n} en oferta`,
    terminada: 'Terminada',
    /** Under the card's lines when there are more than it draws. */
    masRenglones: (n: number) => `y ${n} más`,
    faltan: (horas: number, minutos: number) =>
      horas === 0 ? `Faltan ${minutos} min` : minutos === 0 ? `Faltan ${horas} h` : `Faltan ${horas} h ${minutos} min`,
    menosDeUnMinuto: 'Falta menos de un minuto',
    empieza: (dia: string | null, hora: string) => (dia === null ? `Empieza a las ${hora}` : `Empieza ${dia} a las ${hora}`),
    /** The card's door, and what a screen reader says it opens. */
    verOfertas: 'Tus ofertas',
    nada: 'Hoy todavía no has publicado',
    ayer: (hora: string) => `Ayer publicaste a las ${hora}`,
    antes: (dia: string, hora: string) => `Publicaste el ${dia} a las ${hora}`,
    nunca: 'Tu primera oferta aparece aquí, y en Itacate para tus vecinos.',
    terminado: 'Por hoy ya se terminó',
    terminadoDetalle: 'Lo que publicaste hoy ya no está en Itacate.',
    repetir: 'Repetir:',
    /** A chip: what, how many, the price of one — *Comida corrida · 8 · $65*. */
    chip: (que: string, cuantos: number, precio: string) => `${que} · ${cuantos} · ${precio}`,
    /** What a screen reader says a chip does. */
    chipAyuda: (que: string) => `Repetir ${que}`,
    /** An offer of several dishes, named by its first: *Comida corrida y 2 más*. */
    yMas: (primero: string, otros: number) => `${primero} y ${otros} más`,
  },

  /** `10.5-v-c-i`: a door on *Hoy*, with its number (the family-shell page's zone 4). */
  puertas: {
    pagina: 'Tu página',
    /** ✕ on a door she may close. */
    quitar: 'Quitar de Hoy',
  },

  /**
   * `10.5-v-c-i`: *TU PÁGINA EN ITACATE*'S CHECKLIST — five things, the page's (`pageCard`):
   * in *Mi cocina* under her page until all five are done, and their count on *Hoy*'s door.
   */
  pendientes: {
    titulo: 'Tu página en Itacate',
    cuenta: (hechos: number, de: number) => `${hechos} de ${de}`,
    item: {
      nombreGiro: 'Nombre y giro',
      direccion: 'Tu dirección',
      frase: 'Tu frase',
      oferta: 'Tu primera oferta',
      portada: 'Foto de portada',
    },
    /** The same five inside a sentence: *Falta tu foto de portada*. */
    corto: {
      nombreGiro: 'qué es tu cocina',
      direccion: 'tu dirección',
      frase: 'tu frase',
      oferta: 'tu primera oferta',
      portada: 'tu foto de portada',
    },
    falta: (que: string) => `Falta ${que}`,
    faltan: (una: string, otra: string) => `Faltan ${una} y ${otra}`,
    faltanVarias: (n: number) => `Faltan ${n} cosas`,
    /** What a screen reader says of one done. */
    hecho: (que: string) => `${que}: listo`,
  },

  /**
   * `10.5-v-c-i`: *TUS OFERTAS*, A ROOM OF ITS OWN (his ruling of 2026-11-06): today's
   * offers with *Ya se terminó*, *Publicar una oferta*, then *Anteriores* with *Repetir*.
   * ⚠️ *Ya se terminó* is `withdraw_listing`, asked once inline as Wera asks (`8k`): from
   * `10.5b` it keeps what neighbours reserved.
   */
  ofertas: {
    titulo: 'Tus ofertas',
    /** The room's first line while something is on offer: *Hoy en Itacate · hasta las 19:00*. */
    enItacate: (hasta: string) => `Hoy en Itacate · ${hasta}`,
    /** Back to the tab it was opened from. */
    volver: 'Hoy',
    hoy: 'Hoy',
    anteriores: 'Anteriores',
    estado: { oferta: 'En oferta', terminada: 'Terminada' },
    yaSeTermino: 'Ya se terminó',
    pregunta: '¿La quitas de Itacate?',
    si: 'Sí, ya se terminó',
    no: 'No',
    /** On a past offer she already published again today, where *Repetir* would be. */
    hoyTag: 'Hoy',
    repetir: 'Repetir',
    nota: 'Repetir la publica otra vez, con las horas de hoy, y la puedes deshacer.',
    ninguna: 'Todavía no has publicado nada.',
  },

  /**
   * `10.5-v-c-i`: *MI COCINA* — what she sets once (the family-shell page's `cMi`): her page
   * and its checklist, where she hands food over, her trade, help and her account.
   */
  miCocina: {
    titulo: 'Mi cocina',
    giro: 'Qué es tu cocina',
    ayuda: 'Ayuda',
    whatsapp: 'Escríbenos por WhatsApp',
    whatsappDetalle: 'Te contesta una persona',
    /** What lands in the owner's chat — it names this app, as *¿Olvidaste tu contraseña?* does. */
    ayudaMensaje: 'Hola, necesito ayuda con Wera Cocina.',
    ayudaMensajeConCorreo: (email: string) => `Hola, necesito ayuda con Wera Cocina. Mi correo es ${email}`,
    aviso: 'Aviso de privacidad',
    cuenta: 'Tu cuenta',
  },

  /**
   * `10.5-v-c-i`: THE TOAST AT THE FOOT — what just happened, and *Deshacer* for 8 seconds
   * after publishing or *Repetir* (the owner's ruling of 2026-11-05, call 19).
   */
  nota: {
    deshacer: 'Deshacer',
    publicaste: (que: string) => `Publicaste ${que}`,
    otraVez: (que: string, cuando: string) => `Publicaste otra vez ${que}: ${cuando}`,
    quitaste: (que: string) => `Quitaste ${que} de Itacate`,
    deshecha: 'Listo: ya no está en Itacate.',
    noSeQuito: (porque: string) => `No se pudo quitar de Itacate. ${porque}`,
    paginaCerrada: 'Tu página sigue en Mi cocina',
  },

  /**
   * ⚠️ `10.5-v-c-ii`: HER REMINDER — asked once on *Hoy*, under the doors, after her third
   * offer; kept in *Mi cocina* (the owner's ruling of 2026-11-05, call 21, and the
   * family-shell page's round 6). A notification her own phone schedules, every week on
   * each of her days; nothing of it leaves the phone. The rules are `@/lib/recordatorio`'s.
   */
  recordatorio: {
    /** The question on *Hoy* — *¿Te recordamos a las 16:00, de lunes a sábado?* — and its line. */
    pregunta: (hora: string, dias: string) => `¿Te recordamos a las ${hora}, ${dias}?`,
    costumbre: (hora: string) => `Sueles publicar hacia las ${hora}.`,
    si: 'Sí, recuérdame',
    otraHora: 'Otra hora',
    noGracias: 'No, gracias',
    /** *Mi cocina*'s row, and the sheet's title. */
    titulo: 'Recordatorio diario',
    cuando: (hora: string, dias: string) => `A las ${hora}, ${dias}`,
    apagado: 'Apagado',
    /** On, but her phone no longer lets Wera Cocina show it. */
    sinPermiso: 'Apagado en los ajustes de tu teléfono',
    /** The sheet *Otra hora* and the row open. */
    hojaCostumbre: (hora: string, dias: string) => `Sueles publicar hacia las ${hora}, ${dias}.`,
    hojaDias: (dias: string) => `Te avisamos ${dias}.`,
    hojaPregunta: '¿A qué hora te avisamos?',
    horaAyuda: (hora: string) => `A las ${hora}`,
    asiSeVera: 'Así se verá:',
    encender: 'Encender recordatorio',
    guardar: 'Guardar',
    apagar: 'Apagarlo',
    cerrar: 'Cerrar',
    /** The notification itself, as the family-shell page wrote it. */
    avisoTitulo: '¿Qué ofreces hoy?',
    avisoTexto: 'Publica tu oferta en un minuto.',
    /** Android's name for the notifications' channel, in the phone's settings. */
    canal: 'Recordatorio diario',
    /** Its toasts. */
    teRecordaremos: (hora: string, dias: string) => `Te recordaremos a las ${hora}, ${dias}`,
    puedesEncenderlo: 'Puedes encenderlo en Mi cocina',
    apagadoNota: 'Recordatorio apagado',
    permiso: 'Para recordarte, permite las notificaciones de Wera Cocina en los ajustes de tu teléfono.',
    /** Her days, Monday first. */
    todosLosDias: 'todos los días',
    deA: (desde: string, hasta: string) => `de ${desde} a ${hasta}`,
    dia: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
    losDias: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'],
    los: (dias: readonly string[]) =>
      dias.length === 1 ? `los ${dias[0]}` : `los ${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}`,
  },

  /**
   * ⚠️ `10.5-v-c-ii`: *ASÍ LA VEN* AND *VER COMO LA VEN* — Itacate's dish page and kitchen
   * page inside Wera Cocina, under a dark bar that says so and closes them (the
   * family-shell page's `prevBar`). Their own words are Itacate's (`VECINOS`, below).
   */
  vista: {
    platillo: 'Así la ven tus vecinos en Itacate',
    pagina: 'Tu página, como la ven tus vecinos',
    cerrar: 'Cerrar',
    asiLaVen: 'Así la ven',
    verComoLaVen: 'Ver como la ven',
    /** Under the bar while the door would not send her: nothing on offer, nothing in 14 days. */
    noSeVe: 'Tus vecinos verán tu página en Itacate en cuanto publiques una oferta.',
  },

  /**
   * ⚠️ `10.5-v-d`: THE FIRST RUN'S LAST TWO SCREENS (the family-shell page, ruled 2026-11-05):
   * her kitchen made, *¿Qué ofreces hoy?* — her first offer, or *Después* — then her page as
   * her neighbours see it, and *Ir a Hoy*. `yaEsta` is said only while the door would send
   * her kitchen (`@/lib/comoLaVen`'s `seVeEnItacate`); before a first offer it is not true,
   * so the page is introduced as what they will see.
   */
  primera: {
    titulo: '¿Qué ofreces hoy?',
    texto: 'Publica tu primera oferta y tus vecinos cerca la verán en Itacate. Toma menos de un minuto.',
    publicar: 'Publicar mi primera oferta',
    despues: 'Después',
    yaEsta: 'Tu cocina ya está en Itacate',
    asiTeVen: 'Así te ven tus vecinos:',
    asiTeVeran: 'Así te verán tus vecinos',
    irAHoy: 'Ir a Hoy',
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

/**
 * ⚠️ `10.5-v-c-ii`: ITACATE'S WORDS FOR ITS TWO PAGES, COPIED — what *Así la ven* and *Ver
 * como la ven* draw inside Wera Cocina (`@/vecinos/`), so a fonda reads what a neighbour
 * reads. `pagina` and `platillo` are Itacate's whole sections, `cerca` the words of a card
 * those pages use; `test/vecinos.test.ts` holds every one to `itacate/src/strings.ts`, word
 * for word. The copies import it as `ES`, Itacate's name. Wera Cocina's own words are `ES`.
 */
export const VECINOS = {
  cerca: {
    sorpresa: 'Sorpresa',
    /** `10.5-v-d`: the list's card, for a screen reader — *Comida corrida, de Fonda Doña Mari*. */
    abrirPlatillo: (platillo: string, cocina: string) => `${platillo}, de ${cocina}`,
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
  },

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
} as const;
