import type { Address, Kitchen } from '@/api/cocinas';
import { apiErrorMessage } from '@/api/errors';
import { COLORS, colorOf, defaultsFor, type ColorCode } from '@/api/pagina';
import type { Apartado } from '@/api/apartados';
import {
  DEMASIADOS_INTENTOS,
  FUERA_DE_RANGO,
  NO_ES_TU_PREMIO,
  NO_SE_OFRECE,
  marcaDe,
  type CardStateRow,
  type MyCardRow,
  type RewardRow,
  type ScanRow,
} from '@/api/tarjeta';
import { digitosDe, leerQR } from '@/lib/codigo';
import { ES } from '@/strings';

// ============================================================================
// THE LOYALTY CARD IN ITACATE — WHAT EACH SCREEN SAYS, PURE. Plan task `10.9e-iii`, on `0085`'s answers
// (`@/api/tarjeta`), the door's `card` (`@/api/cocinas`' `tarjetaOf`) and her phone's own code
// (`@/lib/codigo`). The owner's rulings G4–G17, G38, G41 and G42 of 2026-11-16 and 17, as the
// family-shell page draws stage 3:
//   - HER CARD IN THE KITCHEN'S COLOUR AND LOGO (G41, `vistaDe`): *3 de 8*, the stamps, *8 sellos = una
//     comida corrida*, *2 premios por cobrar*, *Vence el … si no vienes*; else, before her first stamp, the
//     kitchen's invitation and its conditions, the kitchen as the one who promises (G12, `condicionesDe` —
//     Wera Cocina's, copied and held to it by `test/gemelos.test.ts`);
//   - A SCAN (`codigoDeCocinaDe`) AND WHAT IT GAVE (`desenlaceDe`) — each of `0085`'s answers in words;
//   - *MI CÓDIGO* WATCHING HER CARDS (`novedadDe`): the kitchen scanned her code, so her phone learns it
//     by reading `my_cards` again — a stamp, a reward won, her *Cobras* claimed;
//   - *CERCA*'S MARK (G38, `marcaDeCocina`), *MIS COCINAS*' ROWS (`filasDeTarjetas`), *LO QUE CADA COCINA
//     VE DE TI* (G42, `loQueVenDe`) and what *Eliminar mi cuenta* takes with it (`alEliminarDe`).
// Nothing here talks; `test/tarjetaVecina.test.ts` pins every rule in Mexico City's zone.
// ============================================================================

/** *Una comida corrida* → *una comida corrida*, inside a sentence (the page's `lc1`). Wera Cocina's. */
export function enFrase(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/**
 * ⚠️ THE CARD'S CONDITIONS (G12, G41; the page's `termsTxt`) — what she starts on, the kitchen as the one
 * who promises, with its address. Wera Cocina's, word for word (`cocina/src/lib/tarjeta.ts`).
 */
export function condicionesDe(cocina: string, direccion: string | null, sellos: number, premio: string, dias: number): string {
  return [
    ES.condiciones.junta(sellos, cocina, enFrase(premio)),
    ES.condiciones.uno,
    dias > 0 ? ES.condiciones.seBorran(dias) : ES.condiciones.noSeBorran,
    ES.condiciones.promesa(cocina, direccion),
  ].join(' ');
}

/** Her street and colonia, as the conditions name them — `null` when they are not whole. Wera Cocina's. */
export function direccionCorta(address: { readonly street: string; readonly number: string; readonly colonia: string } | null): string | null {
  if (address === null) return null;
  const calle = `${address.street.trim()} ${address.number.trim()}`.trim();
  const colonia = address.colonia.trim();
  if (calle === '' || colonia === '') return null;
  return `${calle}, ${colonia}`;
}

/** A kitchen's conditions from the door — `null` when it has no card a first stamp could start. */
export function condicionesDeCocina(cocina: Pick<Kitchen, 'name' | 'tarjeta'> & { readonly address: Address }): string | null {
  const t = cocina.tarjeta;
  if (t === null) return null;
  return condicionesDe(cocina.name, direccionCorta(cocina.address), t.sellos, t.premio, t.dias);
}

// ---- dates, in the phone's zone (the kitchen's, in the pilot) — Wera Cocina's ----------------

/** *18 de diciembre*. */
export function diaDe(at: Date): string {
  return ES.fechas.delMes(at.getDate(), ES.fechas.meses[at.getMonth()]);
}

/** `kept_until` (an instant) or `expires_on` (`YYYY-MM-DD`, the kitchen's day) as a day she reads. */
export function diaDeTexto(texto: string | null): string | null {
  if (texto === null) return null;
  const soloDia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  const at = soloDia === null ? new Date(texto) : new Date(Number(soloDia[1]), Number(soloDia[2]) - 1, Number(soloDia[3]));
  return Number.isNaN(at.getTime()) ? null : diaDe(at);
}

// ---- her card, as drawn ------------------------------------------------------------------------

/** Her cards by kitchen id — `my_cards` is a list, every screen asks by kitchen. */
export function porCocina(cards: readonly MyCardRow[] | undefined): ReadonlyMap<string, MyCardRow> {
  return new Map((cards ?? []).map((card) => [card.id, card]));
}

/**
 * Whether the card shows anywhere at all — *Escanear* and *Mi código* at the top of *Mis cocinas* (G39):
 * a kitchen in the door has a card she could start, or she holds one, or ⚠️ THIS PHONE KEEPS HER KEY
 * (`conLlave`): with no signal at open nothing can be read, and her code still works with none — at a
 * counter with bad signal *Mi código* must stay one tap away (found on the emulator, `10.9e-iii`).
 * ⚠️ With Wera's switch off nothing does (`0085`: the door's `card` is null for every kitchen, nobody can
 * have stamps, and no phone has asked for a key), so an update carrying this screen shows nothing of the
 * card until the switch goes on.
 */
export function hayTarjetas(cocinas: readonly Kitchen[] | undefined, cards: readonly MyCardRow[] | undefined, conLlave = false): boolean {
  return conLlave || (cards?.length ?? 0) > 0 || (cocinas ?? []).some((cocina) => cocina.tarjeta !== null);
}

/** Her card's colour (G41): the kitchen's page colour — the door's kitchen, with her trade's default — else `my_cards`'. */
export function colorDeTarjeta(card: Pick<MyCardRow, 'page'>, cocina: Pick<Kitchen, 'page' | 'giro'> | null): ColorCode {
  if (cocina !== null) return colorOf(cocina.page, cocina.giro);
  const dicho = card.page?.color ?? null;
  return (COLORS as readonly (string | null)[]).includes(dicho) ? (dicho as ColorCode) : defaultsFor(null).color;
}

/** What her card at a kitchen draws (the page's `kcardHtml`). */
export interface VistaDeTarjeta {
  readonly cocinaId: string;
  readonly nombre: string;
  readonly color: ColorCode;
  readonly logo: string | null;
  readonly sellos: number;
  readonly de: number;
  readonly premio: string;
  /** *Vence el 5 de diciembre si no vienes* — `null` with *Nunca*, or no stamp going. */
  readonly vence: string | null;
  /** Her rewards to claim, newest first, as the database sends them. */
  readonly premios: readonly RewardRow[];
  /** Closed by the kitchen, while she may still finish and claim (G12): its last day. */
  readonly cerradaHasta: string | null;
}

/**
 * Her card at a kitchen, or `null` when there is nothing to draw: no terms (a card past its 30 days after
 * closing reads empty). ⚠️ `of`, `reward` and `expiry_days` are HER card's terms — what it started on — else
 * the kitchen's current ones (`0085`'s `card_state`), never the door's.
 */
export function vistaDe(card: MyCardRow, cocina: Pick<Kitchen, 'page' | 'giro'> | null): VistaDeTarjeta | null {
  if (card.of === null || card.reward === null) return null;
  const venceDia = card.stamps > 0 ? diaDeTexto(card.expires_on) : null;
  return {
    cocinaId: card.id,
    nombre: card.name,
    color: colorDeTarjeta(card, cocina),
    logo: cocina?.page.logo ?? card.page?.logo_path ?? null,
    sellos: Math.min(card.stamps, card.of),
    de: card.of,
    premio: card.reward,
    vence: venceDia === null ? null : ES.tarjeta.vence(venceDia),
    premios: card.rewards,
    cerradaHasta: card.open ? null : diaDeTexto(card.kept_until),
  };
}

/** A scan's card as `my_cards` would send it, for `vistaDe` — the kitchen's colour comes from the door. */
export function cardDeEscaneo(cocina: { readonly id: string; readonly name: string }, card: CardStateRow): MyCardRow {
  return { ...card, id: cocina.id, name: cocina.name, colonia: null, page: null };
}

/**
 * The conditions of the card she HOLDS (*Tu primer sello en …*): her card's own terms — what it started on —
 * with the kitchen's address from the door when the door sends it. `null` with no terms.
 */
export function condicionesDeSuTarjeta(card: MyCardRow, puerta: { readonly address: Address } | null): string | null {
  if (card.of === null || card.reward === null) return null;
  return condicionesDe(card.name, puerta === null ? null : direccionCorta(puerta.address), card.of, card.reward, card.expiry_days ?? 0);
}

/**
 * A kitchen whose card she holds, for its circle (`@/ui/Circulo`) — the door's when it sends it, else what
 * `my_cards` says of it: its name, colonia, colour and logo (a kitchen quiet for two weeks is not in the door).
 */
export function cocinaDeTarjeta(card: MyCardRow, puerta: Kitchen | null): Kitchen {
  if (puerta !== null) return puerta;
  const color = colorDeTarjeta(card, null);
  return {
    id: card.id,
    name: card.name,
    giro: null,
    address: { street: '', number: '', colonia: card.colonia ?? '', city: '', postalCode: '' },
    directions: null,
    point: null,
    page: { sentence: null, color, cover: null, logo: card.page?.logo_path ?? null, mapsLink: null },
    offers: [],
    summary: { weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: null, repeats: [] },
    pagos: ['efectivo'],
    comeres: ['llevar'],
    minScore: null,
    estrellas: null,
    servicios: [],
    tarjeta: null,
  };
}

/** *2 premios por cobrar* and, under it, the first one's words — *y más* when there are more. */
export function premiosTexto(premios: readonly RewardRow[]): { readonly titulo: string; readonly detalle: string } | null {
  if (premios.length === 0) return null;
  const primero = premios[0].reward;
  return { titulo: ES.tarjeta.premios(premios.length), detalle: premios.length > 1 ? ES.tarjeta.yMas(primero) : primero };
}

/** The rewards to pick from: what, and *Ganado el 5 de noviembre*. */
export function premiosDe(premios: readonly RewardRow[]): readonly { readonly id: string; readonly que: string; readonly cuando: string }[] {
  return premios.map((r) => ({ id: r.id, que: r.reward, cuando: ES.cobrar.ganadoEl(diaDeTexto(r.won_at) ?? '') }));
}

/** *Cerca*'s mark (G38) for a kitchen: *5/8* with its screen-reader words — `null` with no stamp going there. */
export function marcaDeCocina(cards: ReadonlyMap<string, MyCardRow>, cocinaId: string): { readonly texto: string; readonly ayuda: string } | null {
  const card = cards.get(cocinaId);
  const texto = marcaDe(card);
  if (texto === null || card === undefined || card.of === null) return null;
  return { texto, ayuda: ES.tarjeta.marcaAyuda(card.stamps, card.of) };
}

// ---- a scan --------------------------------------------------------------------------------------

/** What her camera or her thumbs gave: the kitchen's code, and the phone it names when it was a QR. */
export interface CodigoDeCocina {
  readonly code: string;
  readonly key: string | null;
}

/**
 * A QR the camera read: a kitchen's *Sellar* code (`WERA1:c:…`). A neighbour's own code, or anything not
 * ours, is `null` — the camera says *Ese no es el código de una cocina* and reads on.
 */
export function codigoDeCocinaDe(texto: string): CodigoDeCocina | null {
  const leido = leerQR(texto);
  if (leido === null || leido.lado !== 'c') return null;
  return { code: leido.code, key: leido.key };
}

/** Six digits she typed under the camera — no phone named: the database tries the kitchen's phones. */
export function tecleadoDe(texto: string): CodigoDeCocina | null {
  const code = digitosDe(texto);
  return code === null ? null : { code, key: null };
}

/**
 * Which kitchen a scan is narrowed to (`p_workspace_id`): the page's, for six digits typed — never for a QR, which
 * names its phone, and `kitchen_code_owner` asks for both (the review of `10.9e-iii`: kitchen B's QR scanned from
 * kitchen A's page was a miss).
 */
export function cocinaDelEscaneo(codigo: CodigoDeCocina, cocinaDeLaPagina: string | null): string | null {
  return codigo.key === null ? cocinaDeLaPagina : null;
}

/** Whether a claim's answer ends the claim: any answer but a code that did not fit (`no_valido`, `repite`). */
export function terminaElCobro(resultado: ScanRow['result']): boolean {
  return resultado !== 'no_valido' && resultado !== 'repite';
}

/** What a scan gave, as a screen draws it. */
export type Desenlace =
  | { readonly kind: 'primer' | 'sello' | 'gano' | 'yaHoy'; readonly cocina: { readonly id: string; readonly name: string }; readonly card: CardStateRow }
  | { readonly kind: 'cobrado' | 'yaCobrado'; readonly cocina: { readonly id: string; readonly name: string }; readonly premio: string; readonly card: CardStateRow | null }
  | { readonly kind: 'nada'; readonly texto: string };

/** `stamp_with_code`'s and `claim_with_code`'s answers, each in words — the database's, never guessed. */
export function desenlaceDe(scan: ScanRow): Desenlace {
  const R = ES.escanear.resultado;
  const cocina = scan.kitchen;
  switch (scan.result) {
    case 'primer':
    case 'sello':
    case 'gano':
    case 'ya_hoy':
      if (cocina === null || scan.card === null) return { kind: 'nada', texto: R.noValido };
      return { kind: scan.result === 'ya_hoy' ? 'yaHoy' : scan.result, cocina, card: scan.card };
    case 'cobrado':
    case 'ya_cobrado':
      if (cocina === null) return { kind: 'nada', texto: R.noValido };
      return { kind: scan.result === 'cobrado' ? 'cobrado' : 'yaCobrado', cocina, premio: scan.claimed ?? '', card: scan.card };
    case 'cerrada':
      return { kind: 'nada', texto: cocina === null ? R.cerradaSin : R.cerrada(cocina.name) };
    case 'propia':
      return { kind: 'nada', texto: R.propia };
    case 'no_valido':
      return { kind: 'nada', texto: R.noValido };
    case 'repite':
      return { kind: 'nada', texto: R.repite };
  }
}

/** The line a scan's answer reads, at the head of what it drew. */
export function tituloDe(d: Desenlace): string {
  const R = ES.escanear.resultado;
  switch (d.kind) {
    case 'primer':
      return R.primer(d.cocina.name);
    case 'sello':
      return R.sello(d.cocina.name, d.card.stamps, d.card.of ?? 0);
    case 'gano':
      return R.gano(d.cocina.name);
    case 'yaHoy':
      return R.yaHoy(d.cocina.name);
    case 'cobrado':
      return R.cobrado(enFrase(d.premio), d.cocina.name);
    case 'yaCobrado':
      return R.yaCobrado(enFrase(d.premio));
    case 'nada':
      return d.texto;
  }
}

/** Whether the answer gave her what she came for — a stamp, a reward won or claimed. */
export function dio(d: Desenlace): boolean {
  return d.kind === 'primer' || d.kind === 'sello' || d.kind === 'gano' || d.kind === 'cobrado';
}

/**
 * *¿Cobrar tu premio ahora?* (the page's `cobrarq`): after a stamp — or *ya tienes tu sello de hoy* — at a
 * kitchen where she has a reward to claim. Never after the last stamp: the celebration comes first, and its
 * *Ver mis premios* is the way to claim.
 */
export function preguntarCobro(d: Desenlace): readonly RewardRow[] {
  if (d.kind !== 'primer' && d.kind !== 'sello' && d.kind !== 'yaHoy') return [];
  return d.card.rewards;
}

/** A refusal in words (`0085`'s codes) — a wall or a wrong input, never a scan's answer. */
export function tarjetaErrorMessage(thrown: unknown): string {
  const code = typeof thrown === 'object' && thrown !== null ? (thrown as { code?: unknown }).code : undefined;
  if (code === NO_SE_OFRECE) return ES.tarjeta.errores.noDisponible;
  if (code === DEMASIADOS_INTENTOS) return ES.tarjeta.errores.demasiados;
  if (code === NO_ES_TU_PREMIO) return ES.tarjeta.errores.noEsTuPremio;
  if (code === FUERA_DE_RANGO) return ES.tarjeta.errores.codigo;
  return apiErrorMessage(thrown);
}

// ---- *Mi código*: what the kitchen's scan of it did ------------------------------------------

/** What changed in her cards while *Mi código* was on the screen. */
export type Novedad =
  | { readonly kind: 'primer' | 'sello'; readonly cocina: { readonly id: string; readonly name: string }; readonly card: MyCardRow }
  | { readonly kind: 'gano'; readonly cocina: { readonly id: string; readonly name: string }; readonly premio: RewardRow }
  | { readonly kind: 'cobrado'; readonly cocina: { readonly id: string; readonly name: string }; readonly premio: string };

/**
 * ⚠️ THE KITCHEN SCANNED HER CODE: her phone is told nothing, so *Mi código* reads `my_cards` again and
 * compares. A reward that left her list was claimed; a reward new to it was won (G17: the card back to
 * zero that visit); a stamp is her count up, or her stamp of today new. A kitchen new to her list with
 * stamps is a card she just started — *Tu primer sello* with its conditions (her first ever, or the first
 * of a new card after a reward: either way, terms she starts on now). The claim comes first, then the
 * reward won, then the stamp: one visit, one thing said.
 */
export function novedadDe(antes: readonly MyCardRow[], despues: readonly MyCardRow[]): Novedad | null {
  const previas = porCocina(antes);
  const idsAhora = new Set(despues.flatMap((c) => c.rewards.map((r) => r.id)));
  for (const previa of antes) {
    const cobrado = previa.rewards.find((r) => !idsAhora.has(r.id));
    if (cobrado !== undefined) return { kind: 'cobrado', cocina: { id: previa.id, name: previa.name }, premio: cobrado.reward };
  }
  const idsAntes = new Set(antes.flatMap((c) => c.rewards.map((r) => r.id)));
  for (const card of despues) {
    const nuevo = card.rewards.find((r) => !idsAntes.has(r.id));
    if (nuevo !== undefined) return { kind: 'gano', cocina: { id: card.id, name: card.name }, premio: nuevo };
  }
  for (const card of despues) {
    const previa = previas.get(card.id);
    if (previa === undefined) {
      if (card.stamps > 0) return { kind: 'primer', cocina: { id: card.id, name: card.name }, card };
      continue;
    }
    if (card.stamps > previa.stamps || (card.stamped_today && !previa.stamped_today)) {
      return { kind: 'sello', cocina: { id: card.id, name: card.name }, card };
    }
  }
  return null;
}

// ---- the celebration, on the spot or at her next open (G17) ----------------------------------

/**
 * The reward to celebrate, or `null`: the newest she has to claim that this phone has not celebrated (`vistos`, by
 * id), and every such id — all marked at once, so two rewards arriving together are one celebration, the newest's.
 * ⚠️ NOTHING CELEBRATED ON THIS PHONE YET (`vistos` null) celebrates her newest once — a phone she just signed in on
 * shows *¡Ganaste!* for a reward she has not claimed, then never again for any she holds then.
 */
export function festejoDe(
  cards: readonly MyCardRow[] | undefined,
  vistos: ReadonlySet<string> | null,
): { readonly cocina: MyCardRow; readonly premio: RewardRow; readonly ids: readonly string[] } | null {
  let mejor: { cocina: MyCardRow; premio: RewardRow; at: number } | null = null;
  const ids: string[] = [];
  for (const cocina of cards ?? []) {
    for (const premio of cocina.rewards) {
      if (vistos !== null && vistos.has(premio.id)) continue;
      ids.push(premio.id);
      const at = Date.parse(premio.won_at);
      const cuando = Number.isNaN(at) ? Number.NEGATIVE_INFINITY : at;
      if (mejor === null || cuando > mejor.at) mejor = { cocina, premio, at: cuando };
    }
  }
  return mejor === null ? null : { cocina: mejor.cocina, premio: mejor.premio, ids };
}

// ---- *Mis cocinas* -------------------------------------------------------------------------------

/** The kitchens with a reward to claim — a row each at the top of *Mis cocinas* (the page's `rwrow`), most recent first. */
export function conPremios(cards: readonly MyCardRow[] | undefined): readonly MyCardRow[] {
  return (cards ?? []).filter((card) => card.rewards.length > 0);
}

/** A kitchen row's card part: *5/8 · 2 premios* — `null` with no card there. */
export function bitsDeTarjeta(card: MyCardRow | undefined): string | null {
  if (card === undefined) return null;
  const bits: string[] = [];
  if (card.of !== null && card.stamps > 0) bits.push(ES.tarjeta.progreso(card.stamps, card.of));
  if (card.rewards.length > 0) bits.push(ES.tarjeta.premiosCorto(card.rewards.length));
  return bits.length === 0 ? null : bits.join(' · ');
}

/** The same row for a screen reader — *3 de 8 sellos, 2 premios por cobrar*, never the raw *3/8*. */
export function ayudaDeTarjeta(card: MyCardRow | undefined): string | null {
  if (card === undefined) return null;
  const partes: string[] = [];
  if (card.of !== null && card.stamps > 0) partes.push(ES.tarjeta.progresoAyuda(card.stamps, card.of));
  if (card.rewards.length > 0) partes.push(ES.tarjeta.premios(card.rewards.length));
  return partes.length === 0 ? null : partes.join(', ');
}

// ---- *Lo que cada cocina ve de ti* (G42) ---------------------------------------------------------

/** One kitchen, and what reaches it of her today. */
export interface LoQueVe {
  readonly id: string;
  readonly nombre: string;
  readonly lineas: readonly string[];
}

/**
 * ⚠️ WORDED AS WHAT IS TRUE TODAY (G42), from what this app knows she did: each kitchen where she reserved
 * in her last 30 days (`my_reservations`) or holds a card (`my_cards`). A reservation shows the kitchen her
 * name and her score (`0080`); a stamp or a claim, her name in its day's lines, and her card when she shows
 * her code or scans its (`0085`); following, only a count (`0084`); her location, nothing. Most recent first
 * as each list sends them, cards first.
 */
export function loQueVenDe(apartados: readonly Apartado[] | undefined, cards: readonly MyCardRow[] | undefined): readonly LoQueVe[] {
  const L = ES.loQueVen;
  const conTarjeta = new Map((cards ?? []).map((c) => [c.id, c.name]));
  const conApartado = new Map<string, string>();
  for (const a of apartados ?? []) if (!conApartado.has(a.cocina.id)) conApartado.set(a.cocina.id, a.cocina.nombre);
  const ids = [...new Set([...conTarjeta.keys(), ...conApartado.keys()])];
  return ids.map((id) => {
    const tarjeta = conTarjeta.has(id);
    const aparta = conApartado.has(id);
    const lineas = [
      aparta && tarjeta ? L.nombreAmbos : aparta ? L.nombreApartas : L.nombreSello,
      ...(aparta ? [L.calificacion] : []),
      ...(tarjeta ? [L.sellos] : []),
      L.sigues,
      L.ubicacion,
    ];
    return { id, nombre: conTarjeta.get(id) ?? conApartado.get(id) ?? '', lineas };
  });
}

// ---- before *Eliminar mi cuenta* -----------------------------------------------------------------

/**
 * What goes with her account of the card (`0085`'s `delete_my_account`): her rewards still to claim and her
 * stamps going — said before she confirms, never a block. `null` with neither.
 */
export function alEliminarDe(cards: readonly MyCardRow[] | undefined): string | null {
  const T = ES.tarjeta;
  const conPremio = (cards ?? []).filter((c) => c.rewards.length > 0);
  const conSellos = (cards ?? []).filter((c) => c.stamps > 0);
  const premios = conPremio.reduce((n, c) => n + c.rewards.length, 0);
  if (premios === 0 && conSellos.length === 0) return null;
  if (premios === 0) return T.soloSellos(T.y(conSellos.map((c) => c.name)));
  const frase = T.alEliminarPremios(premios, T.y(conPremio.map((c) => c.name)));
  return conSellos.length === 0 ? frase : `${frase} ${T.alEliminarSellos(T.y(conSellos.map((c) => c.name)))}`;
}
