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
   * ⚠️ SCAFFOLDING, AND IT IS DELETED BY THE TASK THAT BUILDS EACH SCREEN.
   * 5a-ii ships the shell — the tab bar, the scale and the formatter — and
   * three of its four routes are empty rooms with the right name on the door.
   * The screens themselves are 5d–5h.
   */
  placeholder: {
    pending: 'Esta pantalla todavía no existe.',
  },
} as const;
