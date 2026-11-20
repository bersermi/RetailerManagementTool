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

/**
 * ⚠️ `10.9k`: HOW LONG HER STAMPS WAIT, AS THE CHIPS SAY IT (the owner's rulings of 2026-11-19) — 14, 60 and 90
 * days are *2 semanas*, *2 meses* and *3 meses*, 30 is *un mes* (one, so *pasa*), any other number its days.
 * Itacate's copy is held to this one by its `test/gemelos.test.ts`.
 */
function siPasan(dias: number): { readonly pasa: string; readonly cuanto: string } {
  if (dias === 30) return { pasa: 'pasa', cuanto: 'un mes' };
  const cuanto = dias === 14 ? '2 semanas' : dias === 60 ? '2 meses' : dias === 90 ? '3 meses' : `${dias} días`;
  return { pasa: 'pasan', cuanto };
}

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
    /**
     * ⚠️ `10.9a-ii`: her kitchen, her address, and — while this build carries a feature to pick —
     * *¿Qué más quieres usar?* (`@/lib/loQueUsas`' `pasos`, the build's). *¿Qué ofreces hoy?* was the
     * third step from `10.5-v-d` until the owner's ruling of 2026-11-17 (G32: no first offer inside it).
     */
    paso: (n: number, de: number) => `Paso ${n} de ${de}`,
    quien: (who: string) => `Entraste como ${who}.`,
    nombre: 'Nombre de tu cocina',
    /** A hint in muted ink, never a value: she types her own. */
    nombreEjemplo: 'Fonda Doña Lupe',
    giro: '¿Qué es tu cocina?',
    giroLeyendo: 'Buscando la lista…',
    giroSinLeer: 'No pudimos leer la lista. Revisa tu conexión a internet.',
    donde: '¿Dónde está tu cocina?',
    siguiente: 'Siguiente: tu dirección',
    /** `10.9b-iii`: back to the fork, *¿Qué quieres hacer?*. */
    volver: 'Volver',
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
      /**
       * ⚠️ `10.5b-iv-c`: `0079`'s `TD014` — a neighbour holds a plate at a kitchen that would go with
       * her account (ruled 2026-11-10: refused until each is handed over or its window ends). Said
       * before Apple's sheet opens, from the read that asks first. Itacate's sentence, word for word
       * (`test/account.test.ts`): one login, so one answer in both apps.
       */
      reservaPendiente:
        'Alguien tiene un apartado por recoger en tu cocina. Podrás eliminar tu cuenta cuando se lo entregues o cuando termine su horario.',
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
    /**
     * ⚠️ `10.9d-ii` (G23): HOW MANY FOLLOW HER — warned, never blocked — and the one thing that stays:
     * her kitchen's name, 30 days, in the *Mis cocinas* of those who followed it (`0084`). From the
     * first follower; with none, nothing stays and nothing is said.
     */
    followers: (n: number) =>
      n === 1
        ? 'Te sigue 1 vecino en Itacate. Dejará de ver tu cocina, y durante 30 días su lista dirá que dejó Itacate.'
        : `Te siguen ${n} vecinos en Itacate. Dejarán de ver tu cocina, y durante 30 días su lista dirá que dejó Itacate.`,
    /**
     * ⚠️ `10.9e-ii` (G23): WHO HOLDS HER CARD — warned, never blocked: cards going and rewards still to give
     * go with the kitchen (`0085` cascades). From `kitchen_card`'s counts; with none, nothing is said.
     */
    tarjeta: (tarjetas: number, premios: number) => {
      const partes: string[] = [];
      if (tarjetas > 0) partes.push(tarjetas === 1 ? '1 vecino junta sellos en tu tarjeta' : `${tarjetas} vecinos juntan sellos en tu tarjeta`);
      if (premios > 0) partes.push(premios === 1 ? 'hay 1 premio por entregar' : `hay ${premios} premios por entregar`);
      const lista = partes.join(' y ');
      return `${lista.charAt(0).toUpperCase()}${lista.slice(1)}. Con la cocina se borran sus sellos y sus premios.`;
    },
    confirm: 'Eliminar esta cocina',
    errors: {
      /** `0077`'s `TD007`: the kitchen's name changed after the screen read it. */
      nameChanged: 'El nombre de la cocina cambió. Revísalo y escríbelo otra vez.',
      /** `0077`'s `TD012`: the kitchen is not hers alone, or is gone already. */
      notHersAlone: 'Solo la única persona dueña de esta cocina puede eliminarla.',
      /** ⚠️ `10.5b-iv-c`: `0079`'s `TD014` — a plate still to hand over here. */
      reservaPendiente:
        'Alguien tiene un apartado por recoger en esta cocina. Podrás eliminarla cuando se lo entregues o cuando termine su horario.',
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
    /**
     * ⚠️ `10.5b-iv-c`: HOW THIS DISH MAY BE EATEN — asked only when her kitchen offers both ways
     * (*Mi cocina › Cómo se come*), after *Avisa si pica* (the family-shell page: *"The form, after
     * Avisa si pica"*). Both on at first; she switches one off for this offer.
     */
    comoSeCome: 'Cómo se come',
    llevar: 'Para llevar',
    aqui: 'Para comer aquí',
    /** A bag, when her kitchen offers both: the database makes it *para llevar* whatever is sent. */
    bolsaParaLlevar: 'Una bolsa sorpresa siempre es para llevar.',
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
        /** `10.5b-iv-c`: her kitchen offers both ways and she switched both off for this dish. */
        comer: 'elige para llevar, para comer aquí o las dos.',
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
   * ⚠️ `10.5-v-c-i`: THE TAB BAR — *Hoy · Apartados · Mi cocina*, the same for every kitchen (his
   * arrangement A, 2026-11-16; *Clientes* left it then, and the data with `10.9a-ii`).
   */
  pestanas: {
    hoy: 'Hoy',
    apartados: 'Apartados',
    miCocina: 'Mi cocina',
  },

  /**
   * ⚠️ `10.5-v-c-i`: *HOY* AS A HUB (his directions of 2026-11-06, the family-shell page's
   * round 6): the day's card — *Hoy en Itacate*, how many are on offer and until when, the
   * time left, each dish on a line — then *Publicar una oferta* with *Repetir*, then the
   * doors. Until her reservations are read the card counts what is on offer; then *Quedan 4
   * de 8* (`10.5b-iv-a`).
   */
  hoy: {
    enItacate: 'Hoy en Itacate',
    /** *hasta las 19:00*; a window that ends another day names it: *hasta mañana a las 1:00*. */
    hasta: (dia: string | null, hora: string) => (dia === null ? `hasta las ${hora}` : `hasta ${dia} a las ${hora}`),
    porciones: (n: number) => (n === 1 ? '1 porción en oferta' : `${n} porciones en oferta`),
    enOferta: (n: number) => `${n} en oferta`,
    /** ⚠️ `10.5b-iv-a`: once her reservations are read — what is left of what she offers. */
    quedan: (n: number, de: number) => `Quedan ${n} de ${de}`,
    quedanRenglon: (n: number, de: number) => `quedan ${n} de ${de}`,
    /** *Faltan 1 h 40 min · 1 entregado*. */
    yEntregados: (falta: string, n: number) => (n === 1 ? `${falta} · 1 entregado` : `${falta} · ${n} entregados`),
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
    /**
     * ⚠️ `10.9d-ii`: *TE SIGUEN 38 VECINOS* on the day's card (G22, the family-shell page's drawing) — how
     * many, never who; from the first follower (none, no line).
     */
    teSiguen: (n: number) => (n === 1 ? 'Te sigue' : 'Te siguen'),
    vecinos: (n: number) => (n === 1 ? '1 vecino' : `${n} vecinos`),
  },

  /**
   * ⚠️ `10.9a-iii`: THE NUDGES (the owner's rulings of 2026-11-16 and 17, round 6 of the grill: *"attractive but
   * not invasive"*; the family-shell page, round 7). The invitation is his words; the first offer's, the first
   * reservation's, a feature's lines and the photo's line are the page's drawing; her page's other parts and the
   * first handover's, decided in this row (the plan's status entry).
   */
  invitacion: {
    titulo: '¿Tienes alguna oferta?',
    texto: 'Publícala y tus vecinos la verán.',
  },
  /** One small celebration per first — the toast in the kitchen's green, with the cow. */
  festejo: {
    oferta: '¡Ya te ven en Itacate!',
    apartado: '¡Tu primer apartado!',
    entrega: '¡Tu primera entrega!',
    /** `10.9f`: her first handover once she uses her numbers — the page's `firstToast('entrega', …)`. */
    entregaConNumeros: '¡Tu primera entrega! Ya cuenta en tus números',
  },
  /** The one quiet line under the day's card: her page's next missing part, or a feature she did not pick. */
  empujon: {
    pagina: {
      nombreGiro: 'Di qué es tu cocina',
      direccion: 'Completa tu dirección',
      frase: 'Escribe la frase de tu página',
      portada: 'Agrega una foto de tu cocina',
    },
    servicio: {
      tarjeta: '¿Quieres que regresen? Prueba la tarjeta de lealtad',
      promociones: '¿Algo nuevo que contar? Prueba las promociones',
      numeros: '¿Quieres saber cómo te va? Mira tus números',
    },
    /** Its ✕. */
    quitar: 'Quitar de Hoy',
    /** The toast after a feature's ✕, with *Deshacer*. */
    servicioQuitado: 'Lo encuentras en Mi cocina › Lo que usas',
  },
  /** *Hoy*'s tiles, one per feature she uses: a feature not set up yet, in its first-time state. */
  mosaicos: {
    primera: {
      tarjeta: ['Prepara tu tarjeta', 'Tu premio y cuántos sellos'],
      promociones: ['Crea tu primera promoción', 'Algo nuevo, de temporada o tu día'],
      numeros: ['Empiezan con tu primera entrega', 'Se llenan solos'],
    },
    /** What a screen reader says of the dot. */
    porHacer: 'Por hacer',
  },
  /** *Así funciona*, three pictures, the first time she opens a feature (the page's `STRIP`). */
  asiFunciona: {
    titulo: 'Así funciona',
    cerrar: 'Cerrar',
    pasos: {
      tarjeta: ['Eliges tu premio y cuántos sellos', 'Te enseñan su código, o escanean el tuyo', 'Al completarla, le das su premio'],
      promociones: ['Escribes qué ofreces y hasta cuándo', 'Sale en tu página de Itacate', 'Tus ofertas de esos días llevan su marca'],
      numeros: ['Cada entrega cuenta', 'Ves tus días y tus horas fuertes', 'Y cuántos vecinos regresan'],
    },
  },

  /**
   * `10.5-v-c-i`: *TU PÁGINA EN ITACATE* — five things, the page's (`pageCard`). ⚠️ Since `10.9a-iii` no count:
   * *Tu página · N de 5* and every count of what she has not done went (his ruling of 2026-11-17); each part
   * missing is a row in *Mi cocina* with *Falta* (the page's `faltaRows`), and one quiet line on *Hoy*.
   */
  pendientes: {
    item: {
      nombreGiro: 'Nombre y giro',
      direccion: 'Tu dirección',
      frase: 'Tu frase',
      oferta: 'Tu primera oferta',
      portada: 'Foto de portada',
    },
    falta: 'Falta',
    paraTuPagina: 'Para tu página en Itacate',
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
    /**
     * ⚠️ `10.5b-iv-c`: − AND + (the owner's call 17 of 2026-11-05): how many she offers now, never
     * below what is reserved; the price and the dish never change. What is left reads as *Hoy*
     * says it — `ES.hoy.quedanRenglon` — beside the two buttons.
     */
    menos: (platillo: string) => `${platillo}: uno menos`,
    mas: (platillo: string) => `${platillo}: uno más`,
    /** `set_listing_quantity`'s `TD019`: a neighbour reserved while she tapped −. */
    apartados: 'Alguien acaba de apartar: no puedes dejar menos de lo apartado.',
    /** Its `TD015`: withdrawn, or the window ended. */
    terminada: 'Esta oferta ya terminó.',
  },

  /**
   * ⚠️ `10.5b-iv-a`: *APARTADOS* — SHE SEES AND HANDS OVER. The owner's final design of 2026-11-10
   * (the page *Names, Records and Stars*, version 5): *Hoy* and *Historial*, each order led by its
   * number and what to prepare, the neighbour's name and score second and muted; each state one
   * colour and one action. *Entregar un apartado* and its words are slice 3's (the family-shell
   * page, stage 2, ruled 2026-11-05): the code typed, one big line of what to charge.
   * ⚠️ NO SENTENCE ABOUT PENALTIES (`10.5-v-a`): a reservation is drawn as a handover.
   */
  apartados: {
    titulo: 'Apartados',
    hoy: 'Hoy',
    historial: 'Historial',
    /** Under the switch: *3 por entregar · 1 por calificar*. */
    resumen: (entregar: number, calificar: number) =>
      [entregar > 0 ? `${entregar} por entregar` : null, calificar > 0 ? `${calificar} por calificar` : null]
        .filter((parte): parte is string => parte !== null)
        .join(' · ') || 'Nada por entregar',
    entregarUno: 'Entregar un apartado',
    entregar: 'Entregar',
    calificar: 'Calificar',
    noSePresento: 'No se presentó',
    siPaso: 'Sí pasó',
    marcas: {
      porEntregar: 'Por entregar',
      pronto: 'Por entregar',
      porCalificar: 'Por calificar',
      seLibero: 'Se liberó',
      entregado: 'Entregado',
      noSePresento: 'No se presentó',
      liberado: 'Se liberó',
      cancelo: 'Canceló',
      noVa: 'No va',
      canceladoCocina: 'Cancelado por la cocina',
    },
    /** Beside her hour, once it is 15 minutes away or less. */
    en: (minutos: number) => (minutos > 0 ? `en ${minutos} min` : minutos === 0 ? 'es ahora' : `hace ${-minutos} min`),
    /** What to prepare: *1 × Mole con arroz*. */
    platillo: (cuantos: number, nombre: string) => `${cuantos} × ${nombre}`,
    /** How to prepare it, short, on a card. */
    comerCorto: { llevar: 'Empácala', aqui: 'Sírvela' },
    /** What to charge, short, on a card — the final design's. */
    cobraCorto: {
      efectivo: (monto: string) => `Cobra ${monto} en efectivo`,
      tarjeta: (monto: string) => `Cobra ${monto} con tarjeta`,
      transferencia: (monto: string) => `Cobra ${monto} por transferencia`,
    },
    junto: (una: string, otra: string) => `${una} · ${otra}`,
    nueva: 'Nueva en Itacate',
    porcentaje: (n: number) => `👍 ${n}%`,
    sinNombre: 'Sin nombre',
    entregadoA: (hora: string) => `Entregado a las ${hora}`,
    /** A plate that *se liberó*: *Ayer · 15:00 · no pasó por ella*. */
    noPaso: (dia: string, hora: string) => `${dia} · ${hora} · no pasó por ella`,
    /** Until when the clock waits for her thumb. */
    siNoLoCalificas: (cuando: string) => `Si no lo calificas antes de ${cuando}, cuenta como No se presentó.`,
    /** *las 16:00* today, *mañana a las 16:00* another day. */
    cuando: (dia: string | null, hora: string) => (dia === null ? `las ${hora}` : `${dia} a las ${hora}`),
    /** A past order's line: *Ayer · 1 × Mole con arroz · Llegó a tiempo*. */
    fila: (partes: readonly string[]) => partes.join(' · '),
    porCalificarGrupo: (n: number) => `Por calificar · ${n}`,
    anteriores: 'Anteriores',
    vacioHoy: 'Hoy no tienes apartados por entregar.',
    vacioHoyDetalle: 'Cuando un vecino aparte, aparece aquí con su código.',
    vacioHistorial: 'Todavía no hay apartados anteriores.',
    leyendo: 'Leyendo tus apartados…',
    sinLeer: 'No se pudieron leer tus apartados.',
    /** What a screen reader says of the count on the tab and on *Historial*. */
    cuentaAyuda: (n: number) => (n === 1 ? '1 por calificar' : `${n} por calificar`),
    /** What a screen reader says a card opens. */
    abrirAyuda: (codigo: string) => `Abrir el apartado ${codigo}`,
    pulgares: { arriba: '👍', abajo: '👎' },
    /** Why a handover or a thumb did not go through (`@/api/apartados`' `Falla`). */
    fallas: {
      sesion: 'No se pudo guardar: este apartado ya no es de tu cocina, o tu sesión se cerró. Entra de nuevo.',
      cambio: 'Este apartado cambió. Revísalo e intenta de nuevo.',
      yaNoSeCalifica: 'Ya no se puede calificar este apartado.',
      sinSenal: 'Sin conexión a internet. Intenta de nuevo en un momento.',
      otra: 'Algo salió mal. Intenta de nuevo.',
    },
  },

  /** `10.5b-iv-a`: an order opened — the final design's *An order opened*. */
  apartado: {
    volver: 'Apartados',
    pasa: (hora: string) => `Pasa a las ${hora}`,
    /** Her hour on another day — a window that crosses midnight, or tomorrow's offer: *Pasa mañana a las 13:00*. */
    pasaDia: (dia: string, hora: string) => `Pasa ${dia} a las ${hora}`,
    /** What an order that was not handed over came to: *Total $65 · efectivo*. */
    total: (monto: string, pago: string) => `Total ${monto} · ${pago}`,
    comerLargo: { llevar: 'Para llevar · empácala', aqui: 'Para comer aquí · sírvela' },
    conDesechable: (monto: string) => `Con desechable · ${monto}`,
    vecina: 'Quién lo apartó',
    calificaciones: (n: number) => (n === 1 ? '1 calificación' : `${n} calificaciones`),
    aparto: 'Apartó',
    pasaFila: 'Pasa',
    seLibera: 'Se libera si no pasa',
    entregado: 'Entregado',
    huboProblema: 'Hubo un problema',
    /** What lands in the owner's chat: the code and the kitchen, so he knows which order without asking. */
    problemaMensaje: (codigo: string, cocina: string) => `Hola, tuve un problema con el apartado ${codigo} en ${cocina} (Wera Cocina).`,
    yaNoEsta: 'Este apartado ya no está en tu lista.',
  },

  /** `10.5b-iv-a`: *ENTREGAR UN APARTADO* — slice 3's handover (the family-shell page, stage 2). */
  entregar: {
    titulo: 'Entregar un apartado',
    volver: 'Volver',
    escribe: 'Escribe el código del vecino',
    teLoDice: 'Te lo dice o te enseña su teléfono.',
    noEsta: 'Ese código no está en tus apartados de hoy. Pídeselo otra vez.',
    borrar: 'Borrar',
    codigo: (codigo: string) => `Código ${codigo}`,
    esDeHoy: 'Es de hoy',
    comerGrande: { llevar: 'Para llevar: empácala', aqui: 'Para comer aquí: sírvela' },
    pago: { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' },
    cobraLargo: {
      efectivo: (monto: string) => `Cobra ${monto} en efectivo`,
      tarjeta: (monto: string) => `Cobra ${monto} con tu terminal`,
      transferencia: (monto: string) => `Dale tus datos y revisa en tu banco que llegó ${monto}`,
    },
    cobraleAqui: 'Cóbrale cuando acostumbres: al servir o al terminar.',
    yaCobre: 'Ya cobré y lo entregué',
    yaLaServi: 'Ya la serví',
    otroCodigo: 'Otro código',
    yaSeEntrego: (hora: string) => `Ya se entregó a las ${hora}.`,
    /** After *Ya cobré y lo entregué* — the final design's *After the handover*: *Cobraste $65 en efectivo · 14:31*. */
    cobraste: {
      efectivo: (monto: string, hora: string) => `Cobraste ${monto} en efectivo · ${hora}`,
      tarjeta: (monto: string, hora: string) => `Cobraste ${monto} con tarjeta · ${hora}`,
      transferencia: (monto: string, hora: string) => `Cobraste ${monto} por transferencia · ${hora}`,
    },
    /** After *Ya la serví*: she charges when she usually does, so nothing says she did. */
    laServiste: (hora: string) => `La serviste a las ${hora}`,
    /** ⚠️ *Entregar* is always recorded (ruled 2026-11-10): she is told, never stopped. */
    cancelado: 'Este apartado se canceló. Si se lo das, queda como entregado.',
    /** ⚠️ She swiped *Ya lo tengo* in Itacate before the counter recorded it: what to charge stays, and the button. */
    yaLoMarco: 'En Itacate ya marcó que lo recogió. Si todavía no se lo das, cóbrale y entrégaselo.',
    terminado: 'Su horario ya terminó. Si se lo das, queda como entregado.',
    leyendo: 'Leyendo tus apartados de hoy…',
    /**
     * `10.5b-iv-b`: with no signal a code not on the phone may be a reservation made since the last read —
     * so never *Pídeselo otra vez* alone: *Ese código no está en tus apartados de las 13:05. Sin señal no llegan los nuevos.*
     */
    noEstaSinSenal: (cuando: string) => `Ese código no está en tus apartados de ${cuando}. Sin señal no llegan los nuevos.`,
    /** `10.5b-iv-b`: under *Entregado* while her handover waits on the phone. */
    guardadaAqui: 'Guardada en este teléfono. Se envía sola cuando vuelve la señal.',
    /**
     * ⚠️ `10.9j-ii-b` (the owner's J2 and J3 of 2026-11-20, as `10.9j-i`'s drawing words them): HER TICKET'S QR,
     * sealed by the database with her kitchen's secret and checked on THIS phone with no signal — offered on the
     * keypad, always: scanning is quicker than typing, and with no signal it is the only way to check a ticket
     * this phone never read (J3: a typed code it never read is never handed over).
     */
    escanear: {
      ayuda: 'Escanea el código de su apartado: tu teléfono lo revisa sin señal.',
      escaner: {
        boton: 'Escanear su código',
        apunta: 'Apunta al código de su apartado',
        sinPermiso: 'Sin la cámara no se puede escanear. Escribe su código con el teclado.',
        ajustes: 'Permitir la cámara en Ajustes',
        noEs: 'Ese código no es de un apartado de tu cocina.',
        noAbre: 'La cámara no abrió. Escribe su código con el teclado.',
      },
    },
    /** ⚠️ `10.9j-ii-b`: an order drawn from her ticket's seal — this phone never read it, and checked it itself. */
    revisado: 'Revisado en este teléfono',
    /** ⚠️ `10.9j-ii-b`: the seal never carries her name (J2) — it comes with the next read. */
    despues: 'Su nombre y su calificación aparecen cuando vuelva la señal.',
  },

  /**
   * `10.5b-iv-b`: THE HANDOVER WITH NO SIGNAL — what the counter says when the phone is all she has (ADR-035
   * §2.6: reads from the phone with visible staleness, writes queued and said). ⚠️ *Todavía están en este
   * teléfono…* is Wera's sentence for its unsent notes (`app/src/strings.ts`, `unsentNote`), so the family
   * says it one way.
   */
  cola: {
    /** *Sin señal. Lo que ves se leyó a las 13:05.* — or *ayer a las 21:40*. */
    sinSenal: (dia: string | null, hora: string) =>
      dia === null ? `Sin señal. Lo que ves se leyó a las ${hora}.` : `Sin señal. Lo que ves se leyó ${dia} a las ${hora}.`,
    /** With no signal and nothing ever read on this phone. */
    sinDatos: 'Sin señal. Tus apartados aparecen aquí en cuanto vuelva.',
    /** *2 entregas y 1 calificación por enviar* — ⚠️ `10.9e-ii`: and *1 sello*, *1 premio* scanned with no signal. */
    porEnviar: (entregas: number, calificaciones: number, sellos = 0, premios = 0) => {
      const partes: string[] = [];
      if (entregas > 0) partes.push(entregas === 1 ? '1 entrega' : `${entregas} entregas`);
      if (calificaciones > 0) partes.push(calificaciones === 1 ? '1 calificación' : `${calificaciones} calificaciones`);
      if (sellos > 0) partes.push(sellos === 1 ? '1 sello' : `${sellos} sellos`);
      if (premios > 0) partes.push(premios === 1 ? '1 premio' : `${premios} premios`);
      const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
      return `${lista} por enviar`;
    },
    /**
     * Wera's sentence, in the singular for one (found on the emulator: *1 entrega por enviar · Todavía están…*).
     * ⚠️ `10.9e-ii`: *sola* agrees with *entrega* and *calificación*; with a stamp or a reward among them, no adjective.
     */
    seEnvian: (cuantas: number, femenino = true) =>
      cuantas === 1
        ? femenino
          ? 'Todavía está en este teléfono. Se envía sola cuando vuelve la señal.'
          : 'Todavía está en este teléfono. Se envía cuando vuelve la señal.'
        : femenino
          ? 'Todavía están en este teléfono. Se envían solas cuando vuelve la señal.'
          : 'Todavía están en este teléfono. Se envían cuando vuelve la señal.',
  },

  /**
   * `10.5b-iv-a`: HER THUMB ABOUT THE NEIGHBOUR — the final design's *After the handover*: one
   * tap is enough, his labels after it, *Después* to leave it for later.
   */
  pulgar: {
    pregunta: (nombre: string | null) => (nombre === null ? '¿Cómo te fue?' : `¿Cómo te fue con ${nombre}?`),
    arribaAyuda: 'Bien',
    abajoAyuda: 'Mal',
    etiquetas: {
      a_tiempo: 'Llegó a tiempo',
      amable: 'Persona amable',
      tarde: 'Se presentó tarde',
      pago: 'Problemas con el pago',
      no_se_presento: 'No se presentó',
    },
    listo: 'Listo',
    despues: 'Después',
    /** Under a thumb she may still change. */
    cambiarHasta: (cuando: string) => `Puedes cambiarla hasta ${cuando}.`,
    /** The clock's, never a person's. */
    reloj: 'Nadie lo calificó en 24 horas: cuenta como No se presentó.',
    calificaste: (nombre: string | null) => (nombre === null ? 'Calificación guardada' : `Calificaste a ${nombre}`),
  },

  /**
   * `10.5b-iv-a`: THE TERMS, ONCE, BEFORE HER FIRST THUMB (the final design). Kept on this phone
   * (`@/lib/terminos`) while the owner rules where — the plan's decisions block.
   */
  terminos: {
    titulo: 'Antes de tu primera calificación',
    texto: 'Después de entregar puedes calificar a quien apartó con 👍 o 👎. Tu calificación cuenta en su porcentaje, que ven las cocinas donde aparta.',
    nunca: 'Esa persona ve su porcentaje, nunca qué cocina la calificó. Califica solo lo que pasó.',
    terminos: 'Términos de uso',
    aviso: 'Aviso de privacidad',
    acepto: 'Acepto y sigo',
  },

  /** `10.5b-iv-a`: *LO QUE SIGUE* on *Hoy* — the next handover (the family-shell page's zone 2). */
  loQueSigue: {
    titulo: 'Lo que sigue',
    /** *Mole con arroz para llevar · $60 efectivo*. */
    detalle: (plato: string, comer: string, monto: string, pago: string) => `${plato} ${comer} · ${monto} ${pago}`,
    comer: { llevar: 'para llevar', aqui: 'para comer aquí' },
    pago: { efectivo: 'efectivo', tarjeta: 'tarjeta', transferencia: 'transferencia' },
    mas: (n: number) => (n === 1 ? 'Y 1 apartado más por entregar' : `Y ${n} apartados más por entregar`),
  },

  /**
   * `10.5-v-c-i`: *MI COCINA* — what she sets once (the family-shell page's `cMi`): her page
   * and its checklist, where she hands food over, her trade, help and her account.
   */
  miCocina: {
    titulo: 'Mi cocina',
    giro: 'Qué es tu cocina',
    /**
     * ⚠️ `10.5b-iv-c`: HER SETTINGS, rows among the ones she sets once (`10.5b-ii`'s final design,
     * *Mi cocina*: *Cómo te pagan*, *Cómo se come*, *El desechable*, *Tus calificaciones*,
     * *Ajustes de apartados*), each with what it is set to under it — state first (ADR-035 §2.8).
     */
    cobro: 'Cómo te pagan',
    comer: 'Cómo se come',
    desechable: 'El desechable',
    calificaciones: 'Tus calificaciones',
    ajustesApartados: 'Ajustes de apartados',
    /** Each row's line: what is set. */
    separador: ' · ',
    desechableCobras: (precio: string) => `${precio} por cada plato para llevar`,
    desechableNo: 'No lo cobras',
    calificacionesListas: (promedio: string, n: number) => `★ ${promedio} · ${n} ${n === 1 ? 'calificación' : 'calificaciones'}`,
    calificacionesPocas: 'Todavía sin calificaciones',
    pueden: (quien: string) => `Pueden apartar: ${quien}`,
    /** A setting read that failed: the row still opens its screen, which says so. */
    sinLeer: 'No se pudo leer',
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
   * ⚠️ `10.9b-ii`: *QUIÉN TRABAJA AQUÍ* — the owner's list in her *Mi cocina* (the family-shell page,
   * round 7; G18, G19: inviting and removing are hers). Each person by name and role, *Quitar a …*
   * on a helper. *Invitar a alguien* is `10.9b-iii`'s. The role words are the drawing's (*Dueña · tú*,
   * *Ayudante*); `manager` has no drawing — no kitchen has one (G18 left the third role open).
   */
  equipo: {
    seccion: 'Quién trabaja aquí',
    roles: { owner: 'Dueña', manager: 'Encargada', staff: 'Ayudante' },
    tu: (rol: string) => `${rol} · tú`,
    sinLeer: 'No se pudo leer quién trabaja aquí.',
    quitarTitulo: (nombre: string) => `¿Quitar a ${nombre} de tu cocina?`,
    /** What happens, true today; the card's code once her kitchen uses the card (`@/lib/ayudante`' `conTarjeta`). */
    quitarTexto: 'Su teléfono deja de ver tu cocina.',
    quitarTextoConTarjeta: 'Su teléfono deja de ver tu cocina, y su código para sellar deja de servir.',
    quitar: (nombre: string) => `Quitar a ${nombre}`,
    quitando: 'Quitando…',
    cancelar: 'Cancelar',
    quitada: (nombre: string) => `Quitaste a ${nombre} de tu cocina`,
    /** After *Deshacer*: she is back — or why not. */
    sigue: (nombre: string) => `Listo: ${nombre} sigue en tu cocina.`,
    noSigue: (porque: string) => `No se pudo deshacer. ${porque}`,
    /** `PGRST116`: the update found no row she may change — she is not the owner. */
    noSePudoQuitar: 'Solo la dueña de la cocina puede quitar a alguien.',
    /** `10.9b-iii`: the row that opens *Invitar a alguien* (the drawing's, without the camera until `10.9c`). */
    invitar: 'Invitar a alguien',
    /** The drawing's words, since `10.9c` draws the QR she scans. */
    invitarDetalle: 'Con un código que escanea',
  },
  /**
   * `10.9b-iii` — *Invitar a alguien*, the owner's sheet (the family-shell page's `invitarSheet`): a code for
   * one person, good for 24 hours (his ruling of 2026-11-18). Since `10.9c` a QR of it above the typed code,
   * as the drawing has it (*… y escanee esto*): she scans it, or types it under the QR.
   */
  invitar: {
    titulo: 'Invitar a alguien',
    texto: 'Que abra Wera Cocina en su teléfono, toque Unirme a una cocina y escanee este código.',
    /** The QR, to a screen reader: the code itself is read out under it. */
    qr: 'El código para escanear',
    haciendo: 'Haciendo el código…',
    /** When it stops working: always tomorrow, at this hour. */
    vale: (hora: string) => `Sirve para una persona, hasta mañana a las ${hora}.`,
    /** What she may do there, true today; the card's stamps once her kitchen uses the card (`@/lib/ayudante`' `conTarjeta`). */
    podra: 'Podrá entregar y publicar ofertas.',
    podraConTarjeta: 'Podrá entregar, dar sellos y premios, y publicar ofertas.',
    compartir: 'Compartir el código',
    listo: 'Listo',
    otraVez: 'Intentar de nuevo',
    /** What *Compartir* sends — it names the kitchen, as Wera's invitation names the shop. */
    mensaje: (cocina: string, codigo: string, hora: string) =>
      `Te invito a ayudar en ${cocina}. Abre Wera Cocina, toca «Unirme a una cocina» y escribe este código: ${codigo}. ` +
      `Sirve una sola vez, hasta mañana a las ${hora}.`,
  },
  /**
   * `10.9b-iii` — the first run's fork, after her account (G32's first run: *Registrar mi cocina* /
   * *Unirme a una cocina*), and joining with a code (the drawing's *Unirme a Fonda Doña Mari*).
   */
  empezar: {
    antetitulo: 'Wera Cocina',
    titulo: '¿Qué quieres hacer?',
    registrar: 'Registrar mi cocina',
    registrarDetalle: 'Tu cocina, tu página y tus ofertas',
    unirme: 'Unirme a una cocina',
    unirmeDetalle: 'Con el código que te dio la cocina',
  },
  unirme: {
    antetitulo: 'Wera Cocina',
    titulo: 'Unirme a una cocina',
    volver: 'Volver',
    texto: 'Pídele a la dueña que abra Mi cocina › Invitar a alguien y escanea su código.',
    /**
     * `10.9c` — the camera over the typed box (`@/ui/Escaner`): asked the first time she taps; refused, the
     * typed box is the way.
     */
    escaner: {
      boton: 'Escanear su código',
      apunta: 'Apunta a su código',
      sinPermiso: 'Sin la cámara no se puede escanear. Escribe su código aquí abajo.',
      ajustes: 'Permitir la cámara en Ajustes',
      noEs: 'Ese no es el código para unirte a una cocina.',
      noAbre: 'La cámara no abrió. Escribe su código aquí abajo.',
    },
    codigo: 'O escribe su código',
    /** A hint in muted ink: how many, never a code. */
    codigoEjemplo: '16 letras y números',
    buscando: 'Buscando la cocina…',
    unirme: (cocina: string) => `Unirme a ${cocina}`,
    uniendo: 'Uniéndote…',
    /** `TD005`: none, or someone else used it. */
    noSirve: 'Ese código no sirve: no existe o ya lo usó alguien. Pídele uno nuevo a la dueña.',
    /** `TD003`: it expired. */
    vencio: 'Ese código ya venció. Pídele uno nuevo a la dueña.',
    otraVez: 'Intentar de nuevo',
    /** The toast on *Hoy*, once she is in. */
    listo: (cocina: string) => `Listo: ya ayudas en ${cocina}.`,
  },

  /**
   * ⚠️ `10.9b-ii`: A HELPER'S OWN WORDS — her *Hoy*'s band and her *Mi cocina* (the family-shell
   * page's *Ayudante*, round 7). ⚠️ *Ayudas aquí* says what is true today (`@/lib/ayudante`): stamps
   * and rewards only once her kitchen uses the card this build carries.
   */
  ayudante: {
    antetitulo: 'Ayudas en esta cocina',
    enCocina: (cocina: string) => `Ayudas en ${cocina}`,
    ayudas: 'Ayudas aquí: entregas y publicas ofertas',
    ayudasConTarjeta: 'Ayudas aquí: entregas, das sellos y premios, publicas ofertas',
    /** How she signs in, after her address (the drawing's *· entras con Google*). */
    entras: { google: 'entras con Google', apple: 'entras con Apple', email: 'entras con tu correo' },
    separador: ' · ',
    salir: 'Salir de esta cocina',
    salirTitulo: (cocina: string) => `¿Salir de ${cocina}?`,
    salirTexto: 'Tu cuenta sigue. Tu teléfono deja de ver esta cocina; para volver, te tienen que invitar otra vez.',
    saliendo: 'Saliendo…',
    cancelar: 'Cancelar',
    /** `0082`'s `TD025`: an owner does not leave — she deletes her kitchen. Never offered to her. */
    duenaNoSale: 'Eres la dueña: no puedes salir de tu cocina. Si ya no la quieres, elimínala.',
  },

  /**
   * ⚠️ `10.5b-iv-c`: HER SETTINGS' SCREENS, from *Mi cocina* — the family-shell page's two sheets
   * (stage 2: *Cómo te pagan*, *Para llevar o comer aquí*, ruled 2026-11-05) and `10.5b-ii`'s final
   * design (*Ajustes de apartados*, *Tus calificaciones*, ruled 2026-11-10). A switch or an option
   * is saved on the tap; *Listo* goes back. ⚠️ NO SCREEN STORES OR SHOWS A BANK ACCOUNT, A CARD OR
   * AN AMOUNT PAID — only how she is paid.
   */
  ajustes: {
    volver: 'Mi cocina',
    listo: 'Listo',
    leyendo: 'Leyendo tus ajustes…',
    sinLeer: 'No pudimos leer tus ajustes. Revisa tu conexión a internet.',
    otraVez: 'Intentar de nuevo',
    guardando: 'Guardando…',
    cobro: {
      titulo: 'Cómo te pagan',
      efectivo: 'Efectivo',
      efectivoDetalle: 'Siempre',
      tarjeta: 'Tarjeta',
      tarjetaDetalle: 'Con tu propia terminal',
      transferencia: 'Transferencia',
      transferenciaDetalle: 'A tu cuenta, por SPEI',
      /** Shown while *Transferencia* is on: no account is kept (ruled 2026-11-05). */
      notaTransferencia: 'Tus vecinos te transfieren al llegar: tú les das tus datos, como siempre. Wera Cocina no guarda ninguna cuenta.',
      /**
       * ⚠️ The drawing's *Wera nunca recibe tu dinero* narrowed to what is true whatever comes later:
       * what a neighbour pays goes to her, and this app never touches it.
       */
      nota: 'Tus vecinos te pagan a ti, directo: Wera Cocina no toca ese dinero.',
    },
    comer: {
      titulo: 'Cómo se come',
      intro: 'Lo que haces en tu cocina. Cada oferta puede limitarlo.',
      llevar: 'Para llevar',
      llevarDetalle: 'La empacas y se la llevan',
      aqui: 'Para comer aquí',
      aquiDetalle: 'Tienes mesas y se la sirves',
      nota: 'Al menos una. Si están las dos, tus vecinos eligen al apartar, y para llevar va primero.',
    },
    desechable: {
      titulo: 'El desechable',
      intro: '¿Cobras el desechable? Escribe su precio: se suma cuando eligen para llevar, y lo ven antes de apartar.',
      campo: 'Precio de cada desechable',
      ejemplo: '5',
      guardar: 'Guardar',
      noLoCobro: 'No lo cobro',
      cobras: (precio: string) => `Cobras ${precio} por cada plato para llevar.`,
      noCobras: 'No cobras el desechable.',
      /** Call 28 (ruled 2026-11-05): each offer keeps the price it had when published. */
      nota: 'Cada oferta guarda el precio que tenía cuando la publicaste.',
      errores: {
        vacio: 'Escribe el precio, o toca No lo cobro.',
        forma: 'El precio no se ve bien. Escríbelo así: 5 o 5.50.',
      },
    },
    apartados: {
      titulo: 'Ajustes de apartados',
      quien: 'Quién puede apartar',
      todos: 'Todos',
      masDe: (n: number) => `Más de ${n}%`,
      /** The row's line in *Mi cocina*: `masDe`'s, with the thumb. */
      masDeCorto: (n: number) => `más de ${n}% de 👍`,
      todosCorto: 'todos',
      explica: 'Según su calificación: cuántos 👍 le han dado las cocinas.',
      /** ⚠️ Fewer than three thumbs always pass (`0080`) — said without naming anyone's gender. */
      nuevas: 'Quien todavía no tiene calificación siempre puede apartar.',
      /** Nobody is cancelled by it (`0080`): it applies when a neighbour reserves. */
      nadieSeCancela: 'Si lo cambias, ningún apartado se cancela.',
    },
    calificaciones: {
      titulo: 'Tus calificaciones',
      /** From five (`0080`): the average and how many. */
      cuantas: (n: number) => (n === 1 ? '1 calificación' : `${n} calificaciones`),
      enTuPagina: 'Tus vecinos la ven en tu página de Itacate.',
      /** Below five: how many, and nothing else (Q3, ruled 2026-11-10). */
      pocas: (n: number) =>
        n === 0
          ? 'Todavía no tienes calificaciones.'
          : n === 1
            ? 'Tienes 1 calificación.'
            : `Tienes ${n} calificaciones.`,
      desdeLaQuinta: 'Las ves aquí, y tus vecinos en tu página, desde la quinta.',
      loQueDicen: 'Lo que más dicen',
      deAyer: 'De ayer, en desorden',
      sinAyer: 'Ayer nadie te calificó.',
      /** The day after (`kitchen_ratings_counted`). */
      alDiaSiguiente: 'Cada calificación aparece aquí al día siguiente.',
      nuncaQuien: 'Nunca ves quién te calificó.',
      estrellasAyuda: (n: number) => `${n} de 5 estrellas`,
      /**
       * ⚠️ `10.9i` (his ruling of 2026-11-19, D5): *REPORTAR* ON EACH OF YESTERDAY'S RATINGS —
       * WhatsApp to him, as *Hubo un problema* does. He removes a rating by hand; nothing is
       * written to the database, and the message carries what she reads and nothing more.
       */
      reportar: 'Reportar',
      reportarAyuda: (n: number) => `Reportar esta calificación de ${n} de 5 estrellas`,
      /** The ruled words: *Quiero reportar una calificación de ayer: ★★☆☆☆ Tuve que esperar — Fonda Doña Lupe*. */
      reportarMensaje: (estrellas: string, etiquetas: string, cocina: string) =>
        `Quiero reportar una calificación de ayer: ${estrellas}${etiquetas === '' ? '' : ` ${etiquetas}`} — ${cocina}`,
      promedioAyuda: (promedio: string, n: number) => `${promedio} de 5 estrellas, ${n === 1 ? '1 calificación' : `${n} calificaciones`}`,
      /** `0080`'s eight tags: the good four after four or five stars, the other four after one to three. */
      etiqueta: {
        lista_a_tiempo: 'Lista a tiempo',
        buena_porcion: 'Buena porción',
        muy_rica: 'Muy rica',
        me_atendieron_bien: 'Me atendieron bien',
        tuve_que_esperar: 'Tuve que esperar',
        porcion_chica: 'Porción chica',
        no_me_gusto: 'No me gustó',
        me_atendieron_mal: 'Me atendieron mal',
      },
      sinLeer: 'No pudimos leer tus calificaciones. Revisa tu conexión a internet.',
    },
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
   * ⚠️ `10.5-v-d`: THE FIRST RUN'S LAST SCREEN (the family-shell page, ruled 2026-11-05): her
   * page as her neighbours see it, and *Ir a Hoy*. `yaEsta` is said only while the door would
   * send her kitchen (`@/lib/comoLaVen`'s `seVeEnItacate`); before a first offer it is not true,
   * so the page is introduced as what they will see. *¿Qué ofreces hoy?* came before it until
   * `10.9a-ii` (G32, ruled 2026-11-17: no first offer inside the first run).
   */
  primera: {
    yaEsta: 'Tu cocina ya está en Itacate',
    asiTeVen: 'Así te ven tus vecinos:',
    asiTeVeran: 'Así te verán tus vecinos',
    irAHoy: 'Ir a Hoy',
  },

  /**
   * ⚠️ `10.9a-ii`: THE FIRST RUN'S THIRD STEP (the owner's rulings of 2026-11-16 and 17, G32 and
   * G33; the family-shell page, round 7): her need first and the feature under it
   * (`loQueUsas.necesidad`, `loQueUsas.nombre`), nothing pre-checked; *Seguir* or *Decidir después*.
   * Drawn only while this build carries a feature Wera offers (`@/lib/loQueUsas`).
   */
  queMas: {
    titulo: '¿Qué más quieres usar?',
    seguir: 'Seguir',
    despues: 'Decidir después',
    leyendo: 'Leyendo…',
    sinLeer: 'No pudimos leer qué puedes usar. Revisa tu conexión a internet.',
    otraVez: 'Intentar de nuevo',
  },

  /**
   * ⚠️ `10.9a-ii`: *MI COCINA › LO QUE USAS* (G33, *Lo que usas* at the top of *Mi cocina*): each
   * feature Wera offers with its state; off, a tap opens what it is, what it asks of her and
   * *Activar*, then *Listo, ya está en tu Hoy*. *Tu menú · Próximamente* with *Me interesa*
   * (G44: recorded, and a Discord line naming nobody). The need lines are the ruled words —
   * *Tu menú a la mano* his rewording of 2026-11-17; `frase` and `pide` are the page's drawing.
   */
  loQueUsas: {
    titulo: 'Lo que usas',
    necesidad: {
      tarjeta: 'Que regresen',
      promociones: 'Dar a conocer algo nuevo',
      numeros: 'Saber cómo te va',
      menu: 'Tu menú a la mano',
    },
    nombre: {
      tarjeta: 'Tarjeta de lealtad',
      promociones: 'Promociones',
      numeros: 'Tus números',
      menu: 'Tu menú',
    },
    frase: {
      tarjeta: 'Tus clientes juntan sellos y, al completarla, les das un premio.',
      promociones: 'Un platillo nuevo, de temporada o tu día especial, en tu página de Itacate.',
      numeros: 'Cuántos platos entregas, cuántos vecinos vienen y cuándo.',
    },
    pide: {
      tarjeta: 'Elegir el premio, cuántos sellos, y pegar un cartel en tu mostrador.',
      promociones: 'Escribir qué ofreces y hasta cuándo.',
      numeros: 'Nada: se llenan solos con tus entregas.',
    },
    /** Under a feature she does not use, in its gender and number. */
    noUsas: {
      tarjeta: 'No la usas',
      promociones: 'No las usas',
      numeros: 'No los usas',
    },
    enTuHoy: 'En tu Hoy',
    loQueTePide: 'Lo que te pide',
    activar: 'Activar',
    activando: 'Activando…',
    volver: 'Mi cocina',
    listo: 'Listo, ya está en tu Hoy',
    verMiHoy: 'Ver mi Hoy',
    proximamente: 'Próximamente',
    meInteresa: 'Me interesa',
    anotado: 'Anotado',
    /** The toast after *Me interesa*. */
    gracias: 'Gracias: lo anotamos',
    /** `TD024`: Wera switched it off while she looked. */
    noDisponible: 'Ya no está disponible.',
  },

  /**
   * ⚠️ `10.9a-ii`: *CUÉNTANOS CÓMO NECESITAS TU MENÚ* at the foot of *Hoy* (G45, ruled 2026-11-17):
   * a text box in a sheet; what she writes stays in the database and Discord only hears that one
   * arrived. The line stays until she sends one or closes it with ✕. The sentence and the hint are
   * the family-shell page's drawing.
   */
  cuentanos: {
    titulo: 'Cuéntanos cómo necesitas tu menú',
    detalle: 'Tu menú · Próximamente',
    texto: 'Cómo te imaginas tu menú en Wera Cocina: cuándo lo cambias, qué lleva, quién lo ve.',
    ejemplo: 'Por ejemplo: el lunes subo el menú de la semana, con precios.',
    cuenta: (n: number, de: number) => `${n} de ${de}`,
    enviar: 'Enviar',
    enviando: 'Enviando…',
    ahoraNo: 'Ahora no',
    vacio: 'Escribe algo, aunque sea corto.',
    gracias: 'Gracias, lo leemos todo',
    quitar: 'Quitar de Hoy',
    /** The toast after its ✕, with *Deshacer*: *Tu menú* stays in *Lo que usas*. */
    quitado: 'Lo encuentras en Mi cocina › Lo que usas',
  },

  /**
   * ⚠️ `10.9f`: *TUS NÚMEROS* (the owner's rulings G24–G27 of 2026-11-17; the family-shell page's `cNumeros`, round 7):
   * answers, not indicators — *¿Cuántos platos has entregado?* — for *Día · Semana · Mes*, each against the whole
   * period before; only what passes through Itacate; the figures about people from five neighbours (the database
   * sends `null` under it). The questions, the words under them and the bars are the page's drawing; *menos de cinco*
   * for a period before under the floor, the tile's comparison and the subtitle without the card, this row's.
   */
  numeros: {
    titulo: 'Tus números',
    /** Under the title — what is counted, true today: the stamps only while her kitchen uses the card. */
    subtitulo: 'Lo que pasa por Itacate: tus apartados y quienes juntan sellos',
    subtituloSinTarjeta: 'Lo que pasa por Itacate: tus apartados entregados',
    periodos: { dia: 'Día', semana: 'Semana', mes: 'Mes' },
    este: { dia: 'Hoy', semana: 'Esta semana', mes: 'Este mes' },
    anterior: { dia: 'ayer', semana: 'la anterior', mes: 'el anterior' },
    preguntas: {
      platos: '¿Cuántos platos has entregado?',
      visitas: '¿Cuántas veces vinieron?',
      vecinos: '¿Cuántos vecinos distintos?',
      regresan: '¿Cuántos ya habían venido antes?',
      pesos: '¿Cuánto fue en apartados entregados?',
    },
    visitas: (n: string, una: boolean) => (una ? `${n} visita` : `${n} visitas`),
    sinApartar: (n: string) => `${n} sin apartar, con su sello`,
    deCuantos: (n: string, de: string) => `${n} de ${de}`,
    regresan: (porciento: number) => `${porciento}% regresan`,
    /** A figure about people under the floor of five (G27). */
    nada: '—',
    desdeCinco: 'Aparece desde cinco vecinos',
    menosDeCinco: 'menos de cinco',
    aPrecioPublicado: 'A precio publicado: lo que cobraste puede variar',
    /** *la anterior, 36*. */
    contra: (antes: string, cuanto: string) => `${antes}, ${cuanto}`,
    junto: (a: string, b: string) => `${a} · ${b}`,
    diasFuertes: 'Tus días fuertes',
    horasFuertes: 'Tus horas fuertes',
    dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    hora: (h: number) => `${h} h`,
    sinNombres: 'Cuentas de tus entregas, sin nombres.',
    /** Off, from its own screen (the shell's rule) — then *Hoy*, with *Deshacer*. */
    dejar: 'Dejar de ver tus números',
    dejando: 'Quitando…',
    dejados: 'Quitaste tus números de tu Hoy. Están en Mi cocina › Lo que usas',
    /** After *Deshacer*. */
    deshecho: 'Tus números están otra vez en tu Hoy',
    noSeDeshizo: (porque: string) => `No volvieron a tu Hoy. ${porque}`,
    vacioTitulo: 'Empiezan con tu primera entrega',
    vacioTexto: 'Cada apartado que entregas cuenta.',
    leyendo: 'Leyendo tus números…',
    sinLeer: 'No pudimos leer tus números. Revisa tu conexión a internet.',
    otraVez: 'Intentar de nuevo',
    /** The tile on *Hoy*: this week's plates against the whole week before. */
    platos: (n: string, uno: boolean) => (uno ? `${n} plato` : `${n} platos`),
    estaSemana: (contra: string) => `entregados esta semana · ${contra}`,
    /** The tile when its read failed or waits for a signal: it says so — never a first-time state that is not one. */
    tileSinLeer: ['—', 'No se pudieron leer'],
    volver: 'Hoy',
    /**
     * ⚠️ `10.9l` — HER NUMBERS WITH THE CARD (his ruling of 2026-11-19, night: *"Yes to everything"* on the drawing). The
     * summary row on top, *platos · visitas · sellos* (*vecinos* without the card), each against the period before; the
     * two sections; and the card's six questions in the drawing's words. The rest is this row's, said in the plan.
     */
    resumen: {
      platos: (uno: boolean) => (uno ? 'plato' : 'platos'),
      visitas: (uno: boolean) => (uno ? 'visita' : 'visitas'),
      sellos: (uno: boolean) => (uno ? 'sello' : 'sellos'),
      vecinos: (uno: boolean) => (uno ? 'vecino' : 'vecinos'),
      /** *vecinos* under the floor, in a tile too narrow for *Aparece desde cinco vecinos*. */
      desdeCinco: 'aparece desde cinco',
    },
    apartados: 'Tus apartados',
    tarjeta: 'Tu tarjeta de lealtad',
    preguntasTarjeta: {
      sellos: '¿Cuántas de tus visitas juntaron sello?',
      premios: '¿Cuántos premios ganaron?',
      juntan: '¿Cuántos juntan sellos ahora?',
      empezaron: '¿Cuántos empezaron tu tarjeta?',
      vuelven: '¿Cada cuánto vuelven quienes juntan sellos?',
      borradas: '¿Cuántas tarjetas se borraron?',
    },
    /** In a sentence after a number: *Cobraron 2 esta semana*. */
    estePeriodo: { dia: 'hoy', semana: 'esta semana', mes: 'este mes' },
    porciento: (n: number) => `${n}%`,
    /** A share of a period before with no visit at all. */
    sinVisitas: 'sin visitas',
    dondeSellos: (entrega: string, mostrador: string) => `${entrega} al entregar un apartado · ${mostrador} en el mostrador`,
    cobraron: (n: string, cuando: string) => `Cobraron ${n} ${cuando}`,
    porEntregar: (n: string) => `${n} por entregar`,
    tarjetas: (n: string, una: boolean) => (una ? `${n} tarjeta` : `${n} tarjetas`),
    /** The cards going are counted at a moment: now, against the same moment one period earlier. */
    haceUn: { dia: 'ayer a esta hora', semana: 'hace una semana', mes: 'hace un mes' },
    aUnSello: (n: string, uno: boolean) => (uno ? `${n} está a un sello del premio` : `${n} están a un sello del premio`),
    enDias: (n: string, uno: boolean) => (uno ? `${n} día` : `${n} días`),
    laMitad: 'Entre un sello y el siguiente, la mitad tarda menos',
    /** A middle gap from a period before under the floor: *menos de cinco* would read as days. */
    conMenosDeCinco: 'con menos de cinco vecinos',
    /** Under *¿Cuántas tarjetas se borraron?*: her rule today, in `10.9k`'s words (*2 semanas*, *1 mes*, *21 días*). */
    porPasar: (cuanto: string) => `Por pasar ${cuanto} sin venir`,
    nuncaSeBorran: 'Elegiste que nunca se borren',
    cambiarCuando: 'Cambiar cuándo se borran',
    sinNombresConSellos: 'Cuentas de tus entregas y tus sellos, sin nombres.',
  },
  /**
   * ⚠️ `10.9g-ii`: PROMOTIONS IN WERA COCINA — the owner's rulings of 2026-11-05 (calls 23–25) and G18, G28–G30
   * and G36 of 2026-11-16 and 17, as the family-shell page draws stage 4 (`cPromos`, `promoForm`, `promoSheet`,
   * `promoBand`, the tile). The drawn words are the page's; the rest is this row's, each said in the plan's
   * status entry. ⚠️ NOTHING HERE PROMISES A MESSAGE: *Avisar a quienes te siguen* is the analyst's (`10.9h`),
   * so the drawing's switch is not written.
   */
  promociones: {
    titulo: 'Promociones',
    volver: 'Hoy',
    /** Under the title, while any runs: *2 activas · hasta tres a la vez*. */
    activas: (n: number) => `${n} ${n === 1 ? 'activa' : 'activas'} · hasta tres a la vez`,
    crear: 'Crear promoción',
    tresActivas: 'Tienes tres activas. Termina una para crear otra.',
    queEs: 'Una promoción no se aparta ni lleva cantidad: eso es una oferta. Tus ofertas de esos días pueden llevar su marca.',
    activa: 'Activa',
    termino: 'Terminó',
    filaActiva: (tipo: string, dias: string, hasta: string) => `${tipo} · ${dias} · hasta el ${hasta}`,
    filaTerminada: (tipo: string, dia: string) => `${tipo} · terminó el ${dia}`,
    leyendo: 'Leyendo tus promociones…',
    sinLeer: 'No pudimos leer tus promociones. Revisa tu conexión a internet.',
    otraVez: 'Intentar de nuevo',
    /** Off, from its own screen (the shell's rule). ⚠️ Her running ones end with it (`0087`), so it asks first. */
    dejar: 'Dejar de usar promociones',
    dejando: 'Quitando…',
    dejarTitulo: '¿Dejar de usar promociones?',
    dejarTexto: (n: number) =>
      n === 1 ? 'Tu promoción activa termina hoy y ya no se ve en Itacate.' : `Tus ${n} promociones activas terminan hoy y ya no se ven en Itacate.`,
    dejarSi: 'Dejar de usarlas',
    dejarNo: 'Seguir con ellas',
    dejadas: 'Quitaste las promociones de tu Hoy. Están en Mi cocina › Lo que usas',
    /** After *Deshacer* — only when none was running, so nothing ended. */
    deshechoDejar: 'Las promociones están otra vez en tu Hoy',
    noSeDeshizoDejar: (porque: string) => `No volvieron a tu Hoy. ${porque}`,
    /** The four kinds (call 25) and what each tile says under its name. */
    tipos: { nuevo: 'Platillo nuevo', temporada: 'De temporada', dia: 'Un día especial', clientes: 'Para tus clientes' },
    tiposDetalle: {
      nuevo: 'Algo que no habías ofrecido',
      temporada: 'Lo que solo hay en esta época',
      dia: 'Jueves pozolero, viernes de pescado',
      clientes: 'Con tu tarjeta de lealtad',
    },
    /** The mark her offers wear and her band carries — *Un día especial*'s is its days, *Especial* before she picks one. */
    marcas: { nuevo: 'Nuevo', temporada: 'De temporada', especial: 'Especial', clientes: 'Con tu tarjeta de lealtad' },
    /** The muted hint in *¿Qué ofreces?*, and the band's words until she types hers. */
    ejemplos: {
      nuevo: 'Enchiladas potosinas',
      temporada: 'Romeritos con mole',
      dia: 'Jueves pozolero',
      clientes: 'Agua de jamaica gratis con tu comida',
    },
    todosLosDias: 'Todos los días',
    /** Each weekday as *los …* says it, Monday first (ISO's order). */
    losDias: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'],
    los: (dias: string) => `Los ${dias}`,
    /** Each weekday alone, Monday first — *Hasta el lunes 30 de noviembre*. */
    diaDeSemana: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
    /** The day chips, Monday first, and what a screen reader says of each. */
    diasCortos: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
    hastaEl: (dia: string) => `hasta el ${dia}`,
    mesDe: (mes: string, anio: number) => `${mes} ${anio}`,
    /** The conditions, written for her (the drawing's `condTxt`). */
    conTarjeta: 'Con tu tarjeta de lealtad.',
    periodo: (desde: string, hasta: string) => `del ${desde} al ${hasta}`,
    desde: (desde: string) => `desde el ${desde}`,
    conAnio: (dia: string, anio: string) => `${dia} de ${anio}`,
    en: (cocina: string, direccion: string | null) => (direccion === null ? `en ${cocina}.` : `en ${cocina}, ${direccion}.`),
    /** *Tu promoción* — the sheet a row opens. */
    tuPromocion: 'Tu promoción',
    seVe: 'Se ve en tu página.',
    noSeVe: 'Ahora no se ve en Itacate.',
    ofertasHoy: (n: number) => (n === 1 ? 'Una oferta de hoy lleva su marca.' : `${n} ofertas de hoy llevan su marca.`),
    terminada: 'Ya no se ve en Itacate.',
    terminar: 'Terminarla hoy',
    terminando: 'Terminando…',
    seguir: 'Seguir con ella',
    usarla: 'Usarla otra vez',
    cerrar: 'Cerrar',
    condiciones: 'Condiciones',
    /** ⚠️ No *Deshacer*: `0087` has no way back for an ended promotion — *Usarla otra vez* makes a new one. */
    terminaste: (que: string) => `Terminaste ${que}. Tus ofertas de hoy siguen.`,
    /** After *Publicar promoción*, with *Deshacer* for 8 seconds — her first, as a celebration. */
    publicaste: (que: string) => `Publicaste ${que}`,
    primera: 'Tu primera promoción ya se ve en tu página',
    deshecha: 'Listo: la promoción ya no está.',
    noSeDeshizo: (porque: string) => `No se pudo deshacer. ${porque}`,
    /** The tile on *Hoy* once she made one: the newest running, *y 1 más*; or none now. */
    tileHasta: (dia: string, mas: number) => (mas > 0 ? `Hasta el ${dia} · y ${mas} más` : `Hasta el ${dia}`),
    ninguna: ['Ninguna ahora', 'Crea una cuando quieras'],
    tileSinLeer: ['—', 'No se pudieron leer'],
    /** *¿Es parte de una promoción?* in *Publicar* (G30) — asked only while one runs that day. */
    parte: '¿Es parte de una promoción?',
    no: 'No',
    parteNota: 'Si lo es, tu oferta lleva su marca en Itacate.',
  },
  /** *Nueva promoción* — the form, top to bottom (the family-shell page's *Crear promoción*). */
  nuevaPromocion: {
    titulo: 'Nueva promoción',
    otraVez: 'Usarla otra vez',
    subtitulo: 'Para que tus vecinos vuelvan. No se aparta ni lleva cantidad.',
    volver: 'Volver',
    tipo: '¿Qué tipo?',
    que: '¿Qué ofreces?',
    mas: 'Cuéntales más (si quieres)',
    masEjemplo: 'Rojo o verde, grande, con tostadas',
    foto: 'Una foto (si quieres)',
    cuenta: (n: number, max: number) => `${n} de ${max}`,
    dias: '¿Qué días?',
    todos: 'Todos',
    eligeTuDia: 'Elige tu día: los jueves, por ejemplo.',
    hasta: '¿Hasta cuándo?',
    hastas: { semana: 'Esta semana', dos: 'Dos semanas', mes: 'Fin de mes', otra: 'Otra fecha…' },
    hastaNota: (dia: string) => `Hasta el ${dia}. Ese día termina sola.`,
    hastaSinElegir: 'Hasta ocho semanas. Ese día termina sola.',
    calendario: 'Elige su último día',
    calendarioCerrar: 'Cerrar',
    /** *Para tus clientes* (G28): seen by all, marked; shown in Itacate to get it, no scan. */
    clientes: 'La ven todos, con la marca Con tu tarjeta de lealtad',
    clientesDetalle: 'La usan quienes juntan sellos en tu tarjeta: la enseñan en Itacate.',
    condiciones: 'Condiciones · las verán tus vecinos',
    cambiar: 'Cambiar',
    /** Back to the conditions written from the fields, after she changed them. */
    escribirlas: 'Que se escriban solas',
    asiLaVeran: 'Así la verán en tu página',
    marcaNota: 'Y tus ofertas de esos días llevan la marca',
    publicar: 'Publicar promoción',
    publicando: 'Publicando…',
    /** *De temporada*'s hint, from 1 November to 24 December — a hint, never a default. */
    posadas: 'Ya vienen las posadas, del 16 al 24 de diciembre:',
    posadasEjemplos: ['Romeritos con mole', 'Bacalao a la vizcaína', 'Ponche de frutas'],
    errores: {
      que: 'Escribe qué ofreces.',
      dia: 'Elige qué día es tu día especial.',
      hasta: 'Elige hasta cuándo.',
      plazo: 'Elige un último día de aquí a ocho semanas.',
      condiciones: 'Escribe las condiciones.',
      condicionesLargas: 'Las condiciones son muy largas: hasta 400 letras. Toca Cambiar y acórtalas.',
    },
  },
  /** A promotion's call refused, in words (`0087`'s codes; `@/lib/promociones`' `promocionErrorMessage`). */
  promocionErrores: {
    soloLaDuena: 'Solo la dueña de la cocina crea y termina promociones.',
    noDisponible: 'Las promociones todavía no están disponibles.',
    tres: 'Tienes tres activas. Termina una para crear otra.',
    sinTarjeta: 'Para tus clientes necesita tu tarjeta de lealtad abierta.',
    noSeUne: 'Esa promoción no corre ese día. Elige otra, o publica sin promoción.',
    yaNoSeDeshace: 'Ya no se puede deshacer: termínala hoy en Promociones.',
  },
  /**
   * ⚠️ `10.9e-ii`: THE LOYALTY CARD IN WERA COCINA — the owner's rulings G4–G19, G23, G34 and G35 of
   * 2026-11-16 and 17, as the family-shell page draws stage 3 (`cTarjeta`, `cSetup`, `cSellar`, `cFres`,
   * `cCartel`, `tcerrarSheet`). The drawn words are the page's; the rest is this row's, each said in the
   * plan's status entry. ⚠️ NOTHING HERE PROMISES A MESSAGE: whether holders hear of a closing is the
   * analyst's (`10.9h`), so the drawing's *y les avisamos* is not written.
   */
  tarjeta: {
    titulo: 'Tarjeta de lealtad',
    asiLaVen: 'Así la ven tus vecinos en Itacate',
    /** The card as drawn (G41): its name, her kitchen, the count and what it gives. */
    nombre: 'Tarjeta de lealtad',
    cuenta: (n: number, de: number) => `${n} de ${de}`,
    igual: (de: number, premio: string) => `${de} sellos = ${premio}`,
    /** `10.9k`: *2 semanas*, *un mes*, *21 días* — as she chose them. */
    venceSiNoVienen: (dias: number) => {
      const p = siPasan(dias);
      return `Los sellos se borran si ${p.pasa} ${p.cuanto} sin venir`;
    },
    kpi: {
      tarjetas: (n: number) => (n === 1 ? 'tarjeta activa' : 'tarjetas activas'),
      sellos: (n: number) => (n === 1 ? 'sello hoy' : 'sellos hoy'),
      premios: (n: number) => (n === 1 ? 'premio por entregar' : 'premios por entregar'),
    },
    /** *Hoy*'s tile once set up (the page's `cardTile`). */
    mosaico: {
      sellosHoy: (n: number) => (n === 1 ? '1 sello hoy' : `${n} sellos hoy`),
      premios: (n: number) => (n === 1 ? '1 premio por entregar' : `${n} premios por entregar`),
      activas: (n: number) => (n === 1 ? '1 tarjeta activa' : `${n} tarjetas activas`),
      /** Closed, while those who started it may finish it (G12). */
      cerrada: (dia: string) => `Cerrada · la completan hasta el ${dia}`,
    },
    sellar: 'Sellar',
    cartel: 'Tu cartel para el mostrador',
    cartelDetalle: 'Con el nombre de tu cocina, para imprimir',
    cambiar: 'Cambiar el premio, los sellos o cuándo se borran',
    cambiarDetalle: 'Vale para las tarjetas nuevas',
    cerrar: 'Cerrar la tarjeta',
    cerrarTitulo: '¿Cerrar tu tarjeta?',
    cerrarTexto: 'Nadie empieza una nueva. Quienes ya la tienen pueden completarla y cobrar su premio 30 días más.',
    cerrando: 'Cerrando…',
    seguirConElla: 'Seguir con ella',
    cerradaNota: 'Cerraste tu tarjeta. Quienes ya la tienen la completan 30 días más',
    /** On the card's screen once closed, while its 30 days run. */
    cerradaHasta: (dia: string) => `Cerraste tu tarjeta. Quienes ya la tienen pueden completarla y cobrar su premio hasta el ${dia}.`,
    /** The same, to a helper — she did not close it (found on the emulator). */
    cerradaHastaAyudante: (dia: string) =>
      `La tarjeta de esta cocina está cerrada. Quienes ya la tienen pueden completarla y cobrar su premio hasta el ${dia}.`,
    abrirOtraVez: 'Abrirla otra vez',
    abrirOtraVezDetalle: 'Con el premio, los sellos y los días que elijas',
    leyendo: 'Leyendo tu tarjeta…',
    sinLeer: 'No pudimos leer tu tarjeta.',
    otraVez: 'Intentar de nuevo',
    /** A helper, before the owner prepared it. */
    sinPreparar: 'Tu cocina todavía no prepara su tarjeta.',
    /** The toast of her first stamp given (the page's `firstToast('sello', …)`). */
    primerSello: 'Diste tu primer sello',
  },

  /** `10.9e-ii` (G7, G8, G15, G34): the setup on one screen, nothing pre-chosen, hints only. */
  prepararTarjeta: {
    titulo: 'Tu tarjeta de lealtad',
    editar: 'Los cambios valen para las tarjetas nuevas',
    volver: 'Volver',
    premio: '¿Qué les das al completarla?',
    premioEjemplo: 'Una comida corrida',
    cuenta: (n: number, de: number) => `${n} de ${de}`,
    sellos: '¿Cuántos sellos?',
    dias: '¿Cuándo se borran sus sellos si no vuelve?',
    /**
     * ⚠️ `10.9k` (the owner's rulings of 2026-11-19): the chips by their days — a month is 30 days — and *Otro…*,
     * which opens a box she types in and reads *21 días* once chosen.
     */
    fichas: { 0: 'Nunca', 14: '2 semanas', 30: '1 mes', 60: '2 meses', 90: '3 meses' } as Readonly<Record<number, string>>,
    otro: 'Otro…',
    diasN: (n: number) => `${n} días`,
    /** `10.9k`: *Otro…*'s sheet — typed, never clicked through (his words: *"type the number instead of using endless clicks"*). */
    hojaDias: {
      titulo: '¿Cuántos días sin venir?',
      unidad: 'días',
      menos: 'Un día menos',
      mas: 'Un día más',
      /** The live line: *Se borran si pasan* **21 días** *sin venir.* — the days drawn bold. */
      vivo: (dias: number) => {
        const p = siPasan(dias);
        return { antes: `Se borran si ${p.pasa} `, cuanto: p.cuanto, despues: ' sin venir.' };
      },
      ejemplo: (dia: string) => `Si su último sello fuera hoy, se borrarían el ${dia}.`,
      rango: (min: number, max: number) => `Elige de ${min} a ${max} días.`,
      listo: 'Listo',
      cerrar: 'Cerrar',
    },
    asiLaVeran: 'Así la verán tus vecinos',
    /** The preview before she wrote her reward. */
    premioDeMuestra: 'Tu premio',
    faltaPremio: 'Escribe qué les das al completarla.',
    faltanSellos: 'Elige cuántos sellos.',
    faltanDias: 'Elige cuándo se borran sus sellos.',
    activar: 'Activar',
    activando: 'Activando…',
    guardar: 'Guardar',
    guardando: 'Guardando…',
    guardado: 'Guardado: vale para las tarjetas nuevas',
    abierta: 'Tu tarjeta está abierta otra vez',
    /** What a screen reader says of a hint chip. */
    sugerido: 'sugerido',
  },

  /** `10.9e-ii` (G12, G41): the card's conditions, naming the kitchen as the one who promises. */
  condiciones: {
    junta: (de: number, cocina: string, premio: string) => `Junta ${de} sellos en ${cocina} y te dan ${premio}.`,
    uno: 'Un sello por visita, uno al día.',
    /** `10.9k`: *2 semanas*, *un mes*, *21 días* — as she chose them. */
    seBorran: (dias: number) => {
      const p = siPasan(dias);
      return `Tus sellos se borran si ${p.pasa} ${p.cuanto} sin que vengas.`;
    },
    noSeBorran: 'Tus sellos no se borran.',
    promesa: (cocina: string, direccion: string | null) =>
      direccion === null ? `La promesa es de ${cocina}.` : `La promesa es de ${cocina}, ${direccion}.`,
  },

  /** `10.9e-ii` (G16, G19): *Sellar* — this phone's code, changing every minute, and today's lines. */
  sellar: {
    titulo: 'Sellar',
    detalle: 'Que escaneen tu código, o escanea el suyo',
    volver: 'Volver',
    cambiaEn: (cuanto: string) => `Cambia en ${cuanto}`,
    escanear: 'Escanear a tu cliente',
    hoy: 'Hoy',
    nadieHoy: 'Todavía nadie hoy. Cada sello y cada premio aparece aquí.',
    preparando: 'Preparando tu código…',
    /** No key on this phone yet, and no signal to make one. */
    sinLlave: 'Tu código se prepara la primera vez que haya señal. Mientras, escanea el de tu cliente.',
    sinLlaveFallo: 'No pudimos preparar tu código.',
    otraVez: 'Intentar de nuevo',
    /** With no signal: her code still works; what it gives arrives later. */
    sinSenal: 'Sin señal: tu código sirve igual. Lo que den con él aparece aquí cuando vuelva la señal.',
    etiquetaQR: 'Tu código para sellar',
    /** A code the database no longer holds (she was removed and invited again; a fourth phone): a new one, on her tap. */
    renovar: '¿A tus clientes no les sirve tu código? Pide uno nuevo',
    renovando: 'Pidiendo uno nuevo…',
    /** Today's lines (`kitchen_card`'s `today`). */
    alguien: 'Alguien',
    sello: (n: number, de: number) => `sello ${n} de ${de}`,
    gano: 'completó su tarjeta',
    cobro: (premio: string) => `cobra su premio: ${premio}`,
    entregaselo: 'entrégaselo',
    alEntregar: 'al entregar su apartado',
    /** A scan of hers still on this phone. */
    enCola: {
      sello: 'Un sello escaneado sin señal',
      premio: 'Un premio escaneado sin señal',
      detalle: (hora: string) => `${hora} · se envía solo cuando vuelva la señal`,
    },
    /** A scan of hers sent late, which did not give what it was for. */
    noSeDio: {
      sello: (hora: string) => `El sello escaneado a las ${hora} no se dio`,
      premio: (hora: string) => `El premio escaneado a las ${hora} no se dio`,
    },
  },

  /** `10.9e-ii` (G10, G16): *Escanear a tu cliente* — her code, or her six digits — and what it gave. */
  escanearCliente: {
    titulo: 'Escanea su código',
    volver: 'Volver',
    escaner: {
      boton: 'Escanear su código',
      apunta: 'Apunta al código en su teléfono',
      sinPermiso: 'Sin la cámara no se puede escanear. Escribe su número aquí abajo.',
      ajustes: 'Permitir la cámara en Ajustes',
      noEs: 'Ese no es el código de un cliente en Itacate.',
      noAbre: 'La cámara no abrió. Escribe su número aquí abajo.',
    },
    escribir: 'O escribe su número',
    numeroEjemplo: '000 000',
    buscar: 'Buscar',
    buscando: 'Buscando su tarjeta…',
    /** *Ana R. · 5 de 8 · 2 premios*. */
    resumen: (n: number, de: number, premios: number) =>
      premios === 0 ? `${n} de ${de}` : `${n} de ${de} · ${premios === 1 ? '1 premio' : `${premios} premios`}`,
    sinTarjeta: 'Todavía no tiene tu tarjeta: con este sello la empieza',
    darSello: 'Dar sello',
    yaTiene: 'Ya tiene su sello de hoy',
    entregarPremio: 'Entregar premio',
    cualLeDas: '¿Cuál le das?',
    ganadoEl: (dia: string) => `Ganado el ${dia}`,
    listo: 'Listo',
    otroCliente: 'Escanear a otro cliente',
    /** With no signal: nothing can be read about her, so the stamp waits on the phone. */
    sinSenal: {
      titulo: 'Sin señal',
      texto: 'Ahora no podemos ver su tarjeta. Su sello se guarda en este teléfono y se envía solo cuando vuelva la señal.',
      darSello: 'Dar sello sin señal',
      guardado: 'Guardado en este teléfono. Se envía solo cuando vuelva la señal.',
      premioGuardado: 'Su premio se guardó en este teléfono y se envía solo cuando vuelva la señal. Entrégaselo.',
      /** The same scan again, still on the phone: it goes once. */
      yaGuardado: 'Ese sello ya está guardado en este teléfono. Se envía una sola vez.',
      premioYaGuardado: 'Ese premio ya está guardado en este teléfono. No lo entregues otra vez.',
    },
    /** This scan gave a reward (one a scan, `0085`). */
    otroPremio: 'Para darle otro premio, escanea su código otra vez cuando cambie.',
    /** What each answer says (`0085`'s results). */
    resultado: {
      primer: (nombre: string, de: number) => `Primer sello de ${nombre} aquí · 1 de ${de}`,
      sello: (nombre: string, n: number, de: number) => `Sello para ${nombre} · ${n} de ${de}`,
      gano: (nombre: string, premio: string) => `${nombre} completó su tarjeta: ganó ${premio}`,
      yaHoy: (nombre: string) => `${nombre} ya tiene su sello de hoy`,
      cerrada: 'Tu tarjeta está cerrada y no tiene una en curso aquí.',
      propia: 'Trabaja en tu cocina: aquí no junta sellos.',
      noValido: 'Ese código ya no sirve. Pídele que lo enseñe otra vez.',
      repite: 'Ese código coincide con el de otro teléfono. Espera al siguiente minuto y escanéalo otra vez.',
      cobrado: (nombre: string, premio: string) => `Le diste ${premio} a ${nombre}`,
      yaCobrado: (nombre: string, premio: string) => `${nombre} ya había cobrado ${premio}`,
      yaUsado: 'Ese código ya dio un premio. Para el siguiente, que te enseñe el código del próximo minuto.',
    },
  },

  /** `10.9e-ii` (G35): the counter poster, in her kitchen's own identity — Wera all but absent, Itacate small. */
  cartel: {
    titulo: 'Tu cartel',
    detalle: 'Tu cocina, en grande',
    volver: 'Volver',
    junta: (de: number, premio: string) => `Junta ${de} sellos y llévate ${premio}`,
    miraHoy: 'Mira lo que hay hoy',
    escanea: 'Escanéalo con tu cámara',
    enItacate: 'en Itacate',
    imprimir: 'Imprimir',
    compartir: 'Mandarlo como PDF',
    compartirDetalle: 'Por WhatsApp a tu papelería, o guárdalo',
    preparando: 'Preparando…',
    fallo: 'No se pudo preparar tu cartel. Intenta de nuevo.',
    /** The PDF's name, and the document's title. */
    archivo: 'Cartel',
  },

  /** `10.9e-ii`: what the database refuses, said in words. */
  tarjetaErrores: {
    soloLaDuena: 'Solo la dueña de la cocina puede cambiar su tarjeta.',
    noDisponible: 'La tarjeta todavía no está disponible.',
    terminos: 'Revisa el premio, los sellos y los días.',
    codigo: 'Ese número no tiene seis dígitos.',
    viejo: 'Ese escaneo es de hace más de 7 días.',
    noEsSuPremio: 'Ese premio ya no está en su tarjeta.',
    demasiados: 'Demasiados códigos que no sirven. Espera unos minutos y vuelve a intentar.',
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
    /** `10.9e-ii`: *18 de diciembre* — a card's last day, a reward's — `Date.getMonth()`'s order. */
    meses: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    delMes: (dia: number, mes: string) => `${dia} de ${mes}`,
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
    /** `10.5b-iii-b`: her stars on a card and a dish's kitchen row, from five ratings. */
    estrellas: (promedio: string) => `★ ${promedio}`,
    conEstrellas: (distancia: string, estrellas: string) => `${distancia} · ${estrellas}`,
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
    /** `10.9g-iii`: a promotion's mark on a card, for a screen reader — *Promoción: Los jueves*. */
    promocionAyuda: (marca: string) => `Promoción: ${marca}`,
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
    /** `10.5b-iii-b`: her stars, from five ratings — else *Todavía sin calificaciones*. */
    calificaciones: (n: number) => (n === 1 ? '(1 calificación)' : `(${n} calificaciones)`),
    sinCalificaciones: 'Todavía sin calificaciones',
    estrellasAyuda: (promedio: string, n: number) => `${promedio} de 5 estrellas, ${n} calificaciones`,
    etiqueta: {
      lista_a_tiempo: 'Lista a tiempo',
      buena_porcion: 'Buena porción',
      muy_rica: 'Muy rica',
      me_atendieron_bien: 'Me atendieron bien',
    },
    /** `10.5b-iii-b`: how she takes payment, as chips — each chip `platillo.pago`'s. */
    comoPagas: 'Cómo pagas aquí',
    /** `10.9g-iii`: her promotion's band — the newest, *y 2 más*, *Condiciones* opening hers under it. */
    promocion: 'Promoción',
    yMas: (n: number) => `y ${n} más`,
    yMasAyuda: (n: number) => (n === 1 ? 'Ver la otra promoción' : `Ver las otras ${n} promociones`),
    condiciones: 'Condiciones',
    ocultarCondiciones: 'Ocultar condiciones',
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
    /**
     * ⚠️ `10.5b-iii-a`: WHAT RESERVING NEEDS SHE KNOW BEFORE SHE TAPS, as the family-shell page
     * draws the dish (stage 2): under the window, that she picks her hour; how it is eaten
     * (calls 26, 27); how she pays at the kitchen (call 12).
     */
    apartaYPasa: 'Apártalo y pasa a la hora que elijas',
    comer: { ambas: 'Aquí o para llevar', llevar: 'Para llevar', aqui: 'Solo para comer aquí' },
    comerDetalle: { ambas: 'Tú eliges al apartar', llevar: 'La cocina te la empaca', aqui: 'Te la sirven en la cocina' },
    pagasEnLaCocina: 'Pagas en la cocina',
    pago: { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' },
  },
} as const;
