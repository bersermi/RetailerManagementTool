// ============================================================================
// EVERY WORD ITACATE SHOWS, IN ONE FILE (ADR-035 §2.11). Plan tasks `10.2a`
// (the skeleton), `10.5-iii-a` (signing in), `10.5-iii-b` (her way out),
// `10.5-iv-a-i` (the kitchens close to her), `10.5-iv-a-ii` (a kitchen's page
// and a dish's), `10.5-v-b` (the shell: the tab bar, *Tú*, *Dónde buscar*) and
// `10.5b-iii-a` (she reserves and collects: *Apartar*, *Apartados*, her yes, her score).
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

  /**
   * ⚠️ `10.5-v-b`: THE TAB BAR — *Cerca · Apartados · Mis cocinas · Tú*, the owner's ruling
   * of 2026-11-05 (the family-shell page's call 4). *Apartados* is drawn since reserving
   * (`10.5b-iii-a`); *Mis cocinas* waits for the stamp card (`10.9`) (`@/navigation/pestanas`).
   */
  pestanas: {
    cerca: 'Cerca',
    apartados: 'Apartados',
    misCocinas: 'Mis cocinas',
    tu: 'Tú',
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
    /** Under the title: where the distances are measured from. */
    desdeTuUbicacion: 'Según tu ubicación',
    desdeCodigo: (cp: string) => `Cerca del código postal ${cp}`,
    cambiarCodigo: 'Cambiar',
    /** What a screen reader says for *Cambiar*, which opens *Dónde buscar* (`10.5-v-b`). */
    cambiarDonde: 'Cambiar dónde buscar',
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
    /**
     * ⚠️ `10.5b-iii-b`: HER STARS ON A CARD AND ON A DISH'S KITCHEN ROW (the owner's answer 10 of
     * 2026-11-05: *the stars go on the card*; the family-shell page's *350 m · ★ 4.8*), from five ratings.
     */
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
    /** `10.5-iv-a-ii`: what a screen reader says for a card, which now opens a page. */
    abrirPlatillo: (platillo: string, cocina: string) => `${platillo}, de ${cocina}`,
    abrirCocina: (cocina: string) => `${cocina}, sin ofertas ahora`,
    /**
     * `10.5-iv-a-iv` — *Ordenar*, her pick of the list's order (the owner's answer 2 of
     * 2026-11-05). The list opens on *Ahora* (his answer 1).
     */
    ordenar: 'Ordenar',
    orden: { ahora: 'Ahora', cerca: 'Más cerca', barato: 'Más barato' },
    /** The button at the head of the list, and what a screen reader says for it. */
    ordenarPor: (orden: string) => `Ordenar: ${orden}`,
    /**
     * ⚠️ `10.5-v-b`: *Ordenar* OPENS A SHEET, as the family-shell page draws it — each
     * order with a line under it, the page's words.
     */
    ordenDetalle: { ahora: 'Lo que puedes recoger ya, primero', cerca: 'Por distancia', barato: 'Por precio' },
  },

  /**
   * ⚠️ `10.5-iv-b-i`: THE MAP, WITH THE LIST SLIDING OVER IT — the owner's answer 4 of
   * 2026-11-05 (C), as the family-shell page draws *Cerca*: the handle's two words, a
   * pin she taps (*En el mapa*, *Quitar*), and what a screen reader says on the map.
   */
  mapa: {
    subir: 'Subir la lista',
    bajar: 'Bajar la lista',
    enElMapa: 'En el mapa',
    quitar: 'Quitar',
    /** The round button over the map that brings it back to where she searches from. */
    volverATi: 'Volver a donde estás',
    volverAlCodigo: (cp: string) => `Volver al código postal ${cp}`,
    /** Her dot — her location, or her postal code's centre where her dot would be (his answer 5). */
    estasAqui: 'Estás aquí',
    tuCodigo: (cp: string) => `Código postal ${cp}`,
    /** A pin, and a circle of kitchens that overlap until she zooms in (his ruling of 2026-11-03). */
    pin: (cocina: string, enOferta: boolean) => (enOferta ? cocina : `${cocina}, sin ofertas ahora`),
    grupo: (n: number) => `${n} cocinas aquí. Toca para acercar el mapa.`,
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
    /**
     * ⚠️ `10.5b-iii-b`: HER STARS, FROM FIVE RATINGS (the family-shell page's call 20, ruled
     * 2026-11-05: *★ 4.8 (23)*, else *Todavía sin calificaciones*) — counted the day after (`0080`).
     */
    calificaciones: (n: number) => (n === 1 ? '(1 calificación)' : `(${n} calificaciones)`),
    sinCalificaciones: 'Todavía sin calificaciones',
    /** What a screen reader says for her stars. */
    estrellasAyuda: (promedio: string, n: number) => `${promedio} de 5 estrellas, ${n} calificaciones`,
    /** Her three most given good tags (`0080`: good ones only), as the neighbours tap them. */
    etiqueta: {
      lista_a_tiempo: 'Lista a tiempo',
      buena_porcion: 'Buena porción',
      muy_rica: 'Muy rica',
      me_atendieron_bien: 'Me atendieron bien',
    },
    /** ⚠️ `10.5b-iii-b`: how she takes payment, as chips (call 20) — each chip `ES.platillo.pago`'s. */
    comoPagas: 'Cómo pagas aquí',
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

  /**
   * ⚠️ `10.5b-iii-a`: *APARTAR* — the dish's foot and the sheet, slice 3's design as the
   * owner ruled it on 2026-11-05 (the family-shell page, stage 2: her hour in quarter hours,
   * how she eats it when both are open, how she pays beside the button, the total before she
   * reserves) and `10.5b-ii`'s final design of 2026-11-10 (*Antes de tu primer apartado*, her
   * name and score on the sheet, a kitchen above her score). No sentence speaks of penalties:
   * a reservation is drawn as a handover — her hour, how she pays, her code.
   */
  apartar: {
    boton: (precio: string) => `Apartar · ${precio}`,
    yaLoApartaste: 'Ya lo apartaste · ver tu código',
    limite: (n: number) => (n === 1 ? 'Ya tienes un apartado' : `Ya tienes ${n} apartados`),
    verTusApartados: 'Ver tus apartados',
    sinHoras: 'Ya no da tiempo de apartarlo',
    enMostrador: 'Puedes pasar a comprarla en mostrador.',
    calificacion: (minimo: number, suyo: number) => `Esta cocina aparta a quien tiene más de ${minimo}% de 👍. Tú tienes ${suyo}%.`,
    calificacionDetalle: 'Puedes pasar a comprarla en mostrador, o apartar en otra cocina.',
    verTuCalificacion: 'Ver tu calificación',
    /** The sheet. */
    titulo: (platillo: string) => `Apartar ${platillo}`,
    comoComes: '¿Para llevar o para comer aquí?',
    forma: { llevar: 'Para llevar', aqui: 'Para comer aquí' },
    aQueHora: '¿A qué hora pasas?',
    notaLlevar: 'La cocina tendrá tu comida lista y empacada a esa hora.',
    notaAqui: 'La cocina te la sirve a esa hora, para comer ahí.',
    comoPagas: 'Cómo pagas',
    /** What a screen reader says for the chip beside the button, which opens the methods. */
    elegirPago: (pago: string) => `Cómo pagas: ${pago}. Toca para cambiarlo`,
    pagoDetalle: {
      efectivo: 'En la cocina, al recoger',
      tarjeta: 'En la terminal de la cocina',
      transferencia: 'Al llegar, a la cuenta que te dé la cocina',
    },
    total: 'Total',
    conDesechable: (platillo: string, desechable: string) => `${platillo} + ${desechable} del desechable`,
    pie: 'Pagas directo a la cocina. Puedes cancelar hasta una hora antes de tu hora.',
    tuNombre: 'La cocina verá tu nombre y tu calificación.',
    /** Done, on the sheet: her code, and the way to it. */
    listo: '¡Listo, ya lo apartaste!',
    tuCodigo: 'Tu código',
    verTuApartado: 'Ver tu apartado',
    /** ⚠️ `10.5b-iii-b`: under her code, once her phone lets Itacate remind her (`@/lib/avisos`). */
    teAvisamos: 'Te avisamos 15 minutos antes de tu hora.',
    /** Her reservations or her standing could not be read: the foot says why and asks again. */
    reintentar: 'Intentar de nuevo',
    /** ⚠️ `0080`: her express yes, once, before her first reservation — the final design's words. */
    antes: {
      titulo: 'Antes de tu primer apartado',
      comoFunciona:
        'Apartas sin pagar por adelantado. Para que eso funcione, las cocinas te califican con 👍 o 👎 cuando pasas por tu comida, o si no pasas.',
      queVen:
        'Las cocinas donde apartas ven tu nombre y tu porcentaje. Algunas apartan solo a quien tiene cierto porcentaje. Tú lo ves en Tú, sin saber quién te calificó.',
      asiTeVeran: 'Así te verán hoy',
      aviso: 'Aviso de privacidad',
      /**
       * ⚠️ `10.5b-iii-b`: THE TERMS, ACCEPTED WITH HER YES — before her first reservation, so
       * before her first rating (a rating follows a pickup, and a pickup a reservation): Google
       * asks that the terms be accepted before anyone rates. Her yes keeps its moment (`0080`).
       */
      terminos: 'Términos de uso',
      acepto: 'Acepto y sigo',
    },
    /** Why it did not go through — `@/api/apartados`' `Falla`, each with what she can do. */
    fallas: {
      yaNoHay: 'Ya no queda de este platillo, o la oferta terminó.',
      limite: 'Ya tienes los apartados que puedes tener por ahora.',
      tuCocina: 'Esta es tu propia cocina: aquí no puedes apartar.',
      calificacion: 'Esta cocina aparta solo a quien tiene cierto porcentaje de 👍.',
      sinSi: 'Antes de tu primer apartado, acepta cómo funciona.',
      cambio: 'Algo cambió en esta oferta. Revisa tu hora y cómo pagas, e intenta de nuevo.',
      yaNoPendiente: 'Este apartado ya no está pendiente.',
      /** `TD022`: not collected, or the day after its window is over. */
      yaNoSeCalifica: 'Este apartado ya no se puede calificar.',
      sesion: 'Tu sesión se cerró. Entra de nuevo.',
      sinSenal: 'Sin conexión a internet. Intenta de nuevo en un momento.',
      otra: 'Algo salió mal. Intenta de nuevo.',
    },
  },

  /**
   * ⚠️ `10.5b-iii-a`: *APARTADOS*, THE SECOND TAB — her code, her hour, what to pay and how, the
   * address with *Cómo llegar*, *Ya lo tengo* as a swipe, and *¿Cambio de planes?* (the family-shell
   * page, stage 2, call 15: *Cancelar* until an hour before her hour, then *No voy a poder ir*).
   * *Se liberó* is the ruled word for a plate nobody came for (`10.5-v-a`).
   */
  apartados: {
    titulo: 'Apartados',
    detalle: 'Lo que apartaste',
    cargando: 'Buscando tus apartados…',
    vacio: 'Aparta un platillo y aquí verás tu código',
    vacioDetalle: 'Lo dices en la cocina, pagas y listo.',
    verCocinas: 'Ver cocinas cerca',
    /** *Comida corrida · 1 · para llevar*. */
    plato: (nombre: string, cantidad: number, comer: string) => `${nombre} · ${cantidad} · ${comer}`,
    comer: { llevar: 'para llevar', aqui: 'para comer aquí' },
    tuCodigo: 'Tu código',
    dilo: { llevar: 'Dilo o enséñalo al recoger.', aqui: 'Dilo o enséñalo al llegar.' },
    /** Her hour: *a las 17:45*, *a la 1:00*. */
    aLas: (hora: string) => (hora.startsWith('1:') ? `a la ${hora}` : `a las ${hora}`),
    /** Until when: *hasta las 16:00*, *hasta la 1:30*. */
    hasta: (hora: string) => (hora.startsWith('1:') ? `hasta la ${hora}` : `hasta las ${hora}`),
    pasa: (cuando: string) => `Pasa ${cuando}`,
    manana: (aLas: string) => `mañana ${aLas}`,
    elDia: (dia: string, aLas: string) => `el ${dia} ${aLas}`,
    faltanMin: (min: number) => `faltan ${min} min`,
    faltanHoras: (horas: number, min: number) => (min === 0 ? `faltan ${horas} h` : `faltan ${horas} h ${min} min`),
    yaEstaLista: 'ya está lista',
    notaLlevar: (hasta: string) => `Tu comida estará lista y empacada a esa hora. La cocina la guarda ${hasta}.`,
    notaAqui: (hasta: string) => `Te la sirven al llegar, para comer ahí. La cocina la guarda ${hasta}.`,
    paga: {
      efectivoLlevar: (total: string) => `Paga ${total} en efectivo al recoger. Si puedes, lleva el importe exacto.`,
      efectivoAqui: (total: string) => `Paga ${total} en efectivo en la cocina. Si puedes, lleva el importe exacto.`,
      tarjeta: (total: string) => `Paga ${total} con tarjeta en la cocina.`,
      transferencia: (total: string) => `Transfiere ${total} al llegar: la cocina te da sus datos.`,
    },
    concepto: 'En el concepto pon',
    conceptoValor: (codigo: string) => `Itacate ${codigo}`,
    transferenciaNota: 'La cocina te entrega cuando ve tu pago en su banco.',
    desliza: { llevar: 'Desliza cuando ya lo tengas', aqui: 'Desliza cuando te la sirvan' },
    /** What a screen reader hears on the swipe, and the one action it may take instead. */
    deslizaAyuda: 'Ya lo tengo. Desliza a la derecha, o usa la acción para confirmar.',
    yaLoTengo: 'Ya lo tengo',
    cancelarHasta: (hasta: string) => `¿Cambio de planes? Cancelar, ${hasta}`,
    noVoy: 'No voy a poder ir',
    hojaCancelar: {
      titulo: '¿Cancelar tu apartado?',
      texto: 'Lo liberamos para que otro vecino lo aproveche.',
      si: 'Sí, cancelarlo',
      no: 'No, lo mantengo',
    },
    hojaNoVoy: {
      titulo: '¿No vas a poder ir?',
      texto: 'Lo liberamos para que otro vecino lo aproveche.',
      si: 'Sí, liberarlo',
      no: 'Sí voy a ir',
    },
    yaLoTienes: 'Ya lo tienes. ¡Buen provecho!',
    /**
     * ⚠️ `10.5b-iii-b`: HER STARS ABOUT THE KITCHEN, after *Ya lo tengo* (`10.5b-ii`'s final design,
     * the page's *After Ya lo tengo*): one tap of the stars, then the tags of their band and a note
     * only Wera reads. From *Anteriores* too, until the day after the window (`rate_until`).
     */
    calificar: {
      pregunta: '¿Qué tal estuvo?',
      /** What a screen reader says for each star. */
      estrella: (n: number) => (n === 1 ? '1 estrella' : `${n} estrellas`),
      nota: 'Cuéntale algo a Wera (opcional)',
      notaAyuda: 'Solo lo lee Wera, no la cocina.',
      listo: 'Listo',
      gracias: 'Gracias. La cocina lo verá junto con las demás calificaciones.',
      /** On a past reservation she may still rate. */
      calificar: 'Calificar',
      titulo: (cocina: string) => `¿Qué tal estuvo ${cocina}?`,
      /** Her stars, once given, on the past reservation. */
      tuCalificacion: 'Tu calificación',
      /** Her tags: the good four after four or five stars, the other four after one to three (`0080`). */
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
    },
    /**
     * ⚠️ A PLATE WHOSE WINDOW ENDED WITH NO HANDOVER — *se liberó* — that she may still say she
     * has: `confirm_my_pickup` takes her *Ya lo tengo* until a day after the window (`0079`), and
     * it keeps the clock's *No se presentó* off her score when the kitchen forgot *Entregar*.
     */
    porConfirmar: {
      titulo: '¿Ya lo tienes?',
      texto: (hasta: string) => `La cocina lo guardó ${hasta}. Si ya lo tienes, confírmalo.`,
    },
    /** ⚠️ `0080`: the kitchen's cancel is built and switched off — read correctly the day it turns on. */
    laCocinaCancelo: 'La cocina canceló tu apartado',
    razon: { se_acabo: 'Se les acabó.', cerramos: 'Tuvieron que cerrar.', otro: '' },
    anteriores: 'Anteriores',
    estado: {
      apartado: 'Apartado',
      recogido: 'Entregado',
      cancelado: 'Lo cancelaste',
      no_va: 'Lo liberaste',
      liberado: 'Se liberó',
      cancelado_cocina: 'La cocina lo canceló',
    },
  },

  /**
   * ⚠️ `10.5b-iii-b`: HER REMINDER, 15 MINUTES BEFORE HER HOUR — scheduled by her own phone
   * when her reservations are read (`@/lib/avisos`), nothing sent by any server (the family-shell
   * page, stage 2: *"scheduled by her own phone when she reserves. Nothing leaves it."*).
   */
  recordatorio: {
    /** The channel her phone's settings name (Android). */
    canal: 'Tus apartados',
    titulo: (aLas: string) => `Tu comida estará lista ${aLas}`,
    texto: (cocina: string, codigo: string) => `${cocina} · Tu código: ${codigo}`,
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
   * ⚠️ `10.5-v-b`: *TÚ*, THE LAST TAB — what she sets once, as the family-shell page
   * draws it (the owner's ruling of 2026-11-05): her account, *Dónde buscar*, the aviso,
   * help by WhatsApp, *Cerrar sesión* and *Eliminar mi cuenta*, and *Itacate, de Wera*.
   * It replaced *Tu cuenta* (`10.5-iv-a-i`), a screen pushed from the list's band.
   */
  tu: {
    titulo: 'Tú',
    detalle: 'Tu cuenta',
    /** How she signs in — the providers' names, and *tu correo* for an address and a password. */
    entrasCon: (formas: readonly string[]) =>
      formas.length <= 1
        ? `Entras con ${formas[0] ?? ''}`
        : `Entras con ${formas.slice(0, -1).join(', con ')} o con ${formas[formas.length - 1]}`,
    forma: { google: 'Google', apple: 'Apple', correo: 'tu correo' },
    dondeBuscar: 'Dónde buscar',
    miUbicacion: 'Mi ubicación',
    codigoPostal: (cp: string) => `Código postal ${cp}`,
    aviso: 'Aviso de privacidad',
    ayuda: 'Ayuda por WhatsApp',
    /** What lands in the owner's chat — it names this app and, when there is one, her address. */
    ayudaMensaje: 'Hola, necesito ayuda con Itacate.',
    ayudaMensajeConCorreo: (email: string) => `Hola, necesito ayuda con Itacate. Mi correo es ${email}`,
    deWera: 'Itacate, de Wera',
    version: 'Estás probando una versión temprana de Itacate: la iremos llenando con actualizaciones.',
    /**
     * ⚠️ `10.5b-iii-a`: HER SCORE, the final design of 2026-11-10 — the share of thumbs up among
     * her last 20 from any kitchen, from her third, each label's count, never which kitchen or
     * when; *¿Algo no cuadra? Escríbenos* is her way to a person (LFPDPPP Art. 26).
     */
    calificacion: 'Tu calificación como vecina',
    porcentaje: (pct: number) => `👍 ${pct}%`,
    deCalificaciones: (n: number) => `de ${n} calificaciones de las cocinas donde apartaste`,
    nueva: 'Nueva en Itacate',
    nuevaDetalle: 'Tu porcentaje aparece desde tu tercera calificación.',
    etiqueta: {
      a_tiempo: 'Llegó a tiempo',
      amable: 'Persona amable',
      tarde: 'Se presentó tarde',
      no_se_presento: 'No se presentó',
      pago: 'Problemas con el pago',
    },
    nunca: 'Las cocinas ven tu porcentaje cuando apartas. Nunca ves qué cocina te calificó ni cuándo.',
    algoNoCuadra: '¿Algo no cuadra? Escríbenos',
    algoNoCuadraMensaje: 'Hola, tengo una duda sobre mi calificación en Itacate.',
    algoNoCuadraMensajeConCorreo: (email: string) => `Hola, tengo una duda sobre mi calificación en Itacate. Mi correo es ${email}`,
  },

  /**
   * ⚠️ `10.5-v-b`: *DÓNDE BUSCAR* — her location, or a postal code, at her pick (the
   * owner's answer 5 of 2026-11-05). Its two lines say what the aviso's section 10 says.
   */
  donde: {
    titulo: 'Dónde buscar',
    volver: 'Volver',
    miUbicacion: 'Mi ubicación',
    miUbicacionDetalle: 'Itacate la usa solo mientras la tienes abierta. Nunca sale de tu teléfono.',
    codigo: 'Un código postal',
    codigoDetalle: 'Para ver las cocinas cerca de otra colonia',
    codigoEnUso: (cp: string) => `Ahora buscas cerca del ${cp}`,
  },

  /** A sheet from the foot of the screen (`@/ui/Hoja`): what a screen reader says for the veil. */
  hoja: {
    cerrar: 'Cerrar',
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
      /**
       * ⚠️ `10.5b-iii-b`: `0079`'s `TD014` — a fonda who uses Itacate too, while a neighbour holds a
       * plate at a kitchen that would go with her account (ruled 2026-11-10: refused until each is
       * handed over or its window ends).
       */
      reservaPendiente:
        'Alguien tiene un apartado por recoger en tu cocina. Podrás eliminar tu cuenta cuando se lo entregues o cuando termine su horario.',
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
