// ============================================================================
// *MIS COCINAS*, HER PINNED RESERVATION AND *¿SEGUIR A …?* — PURE. Plan task `10.9d-ii`, the
// owner's rulings G20–G23 and G39 of 2026-11-17, as the family-shell page draws stage 3:
// three tabs, *Cerca · Mis cocinas · Tú*; *Apartados* is no longer a tab — an active
// reservation is pinned at the top of *Cerca* and heads *Mis cocinas*, whose tab carries a
// dot while it lasts; past ones at its foot. *Mis cocinas* lists the kitchens she follows,
// whether each published today, and a kitchen that left reads *dejó Itacate* for 30 days.
// `test/misCocinas.test.ts` pins every rule.
//
// ⚠️ NOTHING HERE IS KEPT ON THE PHONE: *¿Seguir a …?* is asked "once, after her first pickup"
// (G20) with no memory of its own — the first plate she collected at a kitchen she does not
// follow, while that plate can still be rated (`rate_until`, the database's clock). A second
// plate there is not her first, so it is never asked there again; *Ahora no* under the same plate
// is kept in memory while the app runs (`@/ui/PreguntaSeguir`); a first plate that left her 30 days
// (`my_reservations`) makes a later one "first" again.
// ⚠️ A KITCHEN SHE FOLLOWS NEED NOT BE IN THE DOOR (one quiet for two weeks is not), so a page of
// its own (`@/ui/PaginaSeguida`) is drawn from `my_follows`' row when the door does not send it.
// ============================================================================

import type { Apartado } from '@/api/apartados';
import type { Kitchen } from '@/api/cocinas';
import { DIAS_QUE_SE_VE_QUE_SE_FUE, switchesDe, type Seguida, type Siguiendo } from '@/api/siguiendo';
import { aLasDe, platoTexto, seccionesDe } from '@/lib/apartados';
import { diasAtras, publicoTexto } from '@/lib/lista';
import { dayOf, daysFrom } from '@/lib/ventana';
import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// The reservation pinned at the top of *Cerca* and of *Mis cocinas*
// ----------------------------------------------------------------------------

/** What the pinned row says it is. */
export type Fijado =
  /** Still to collect — the soonest. */
  | { readonly kind: 'pendiente'; readonly apartado: Apartado; readonly mas: number }
  /** Cancelled by the kitchen while its window is open: she must not walk over for nothing. */
  | { readonly kind: 'aviso'; readonly apartado: Apartado; readonly mas: number }
  /** It *se liberó* less than a day ago: she may still say *Ya lo tengo*. */
  | { readonly kind: 'porConfirmar'; readonly apartado: Apartado; readonly mas: number };

/**
 * The one reservation pinned, or `null`. ⚠️ WHAT *APARTADOS* WOULD HAVE SHOWN HER FIRST, in its
 * order — a cancel by the kitchen, then what is still to collect (the soonest), then a plate she
 * may still confirm — so nothing she must act on lives only behind a screen she has to look for.
 * `mas` is how many more of those three there are, said as *y 1 más*.
 */
export function fijadoDe(apartados: readonly Apartado[] | undefined, ahora: Date): Fijado | null {
  if (apartados === undefined) return null;
  const { avisos, pendientes, porConfirmar } = seccionesDe(apartados, ahora);
  const todos = avisos.length + pendientes.length + porConfirmar.length;
  if (avisos.length > 0) return { kind: 'aviso', apartado: avisos[0], mas: todos - 1 };
  if (pendientes.length > 0) return { kind: 'pendiente', apartado: pendientes[0], mas: todos - 1 };
  if (porConfirmar.length > 0) return { kind: 'porConfirmar', apartado: porConfirmar[0], mas: todos - 1 };
  return null;
}

/** Her hour as the pinned row says it: *hoy a las 17:45*, *mañana a las 9:00*, *el Lun 27 a las 9:00*; yesterday's, *a las 23:30*. */
export function cuandoTexto(hora: Date, ahora: Date): string {
  const dias = daysFrom(ahora, hora);
  const aLas = aLasDe(hora);
  // An hour already gone yesterday (a window past midnight still holds her plate): its time alone, as `pasaTexto`.
  if (dias < 0) return aLas;
  if (dias === 0) return ES.fijado.hoy(aLas);
  if (dias === 1) return ES.apartados.manana(aLas);
  return ES.apartados.elDia(dayOf(hora, ahora), aLas);
}

/** The pinned row's two lines. */
export function fijadoTextos(fijado: Fijado, ahora: Date): { readonly titulo: string; readonly detalle: string } {
  const { apartado, mas } = fijado;
  const y = mas > 0 ? ` · ${ES.fijado.mas(mas)}` : '';
  if (fijado.kind === 'aviso') return { titulo: ES.fijado.aviso, detalle: `${apartado.cocina.nombre} · ${platoTexto(apartado)}${y}` };
  const detalle = `${ES.fijado.detalle(apartado.cocina.nombre, apartado.codigo)}${y}`;
  if (fijado.kind === 'porConfirmar') return { titulo: ES.fijado.porConfirmar, detalle };
  return { titulo: ES.fijado.tuApartado(cuandoTexto(apartado.hora, ahora)), detalle };
}

/** The dot on *Mis cocinas*' tab: while a reservation is pinned. */
export function hayPunto(apartados: readonly Apartado[] | undefined, ahora: Date): boolean {
  return fijadoDe(apartados, ahora) !== null;
}

// ----------------------------------------------------------------------------
// *Tus cocinas* — the kitchens she follows, and those that left
// ----------------------------------------------------------------------------

/** One row of *Tus cocinas*. */
export interface FilaSeguida {
  readonly seguida: Seguida;
  /** It published for today (`last_day`): *Publicó hoy*, in the drawing's red for what is live. */
  readonly publicoHoy: boolean;
  /** *Publicó hoy*, *Publicó ayer*, *Publicó el martes* — or `null` when it published nothing in four weeks. */
  readonly cuando: string | null;
}

/** A kitchen she followed that left — *dejó Itacate*, for 30 days. */
export interface FilaSeFue {
  readonly id: string;
  readonly nombre: string;
}

export interface MisCocinas {
  readonly filas: readonly FilaSeguida[];
  readonly seFueron: readonly FilaSeFue[];
}

/**
 * *Tus cocinas*: ⚠️ ONLY THE KITCHENS SHE FOLLOWS (G21 as drawn) — a bell without following is no
 * row here. Those that published for today first, then the most recent, then by name; a kitchen
 * that left, by its name, while its 30 days last (the database drops it after them too).
 */
export function misCocinasDe(siguiendo: Siguiendo | null | undefined, ahora: Date): MisCocinas {
  if (siguiendo === null || siguiendo === undefined) return { filas: [], seFueron: [] };
  const filas = siguiendo.cocinas
    .filter((seguida) => seguida.siguiendo)
    .map((seguida) => {
      const atras = seguida.ultimoDia === null ? null : diasAtras(seguida.ultimoDia, ahora);
      return {
        seguida,
        publicoHoy: atras !== null && atras <= 0,
        cuando: seguida.ultimoDia === null ? null : publicoTexto(seguida.ultimoDia, ahora),
        atras,
      };
    })
    .sort((a, b) => {
      if (a.publicoHoy !== b.publicoHoy) return a.publicoHoy ? -1 : 1;
      const da = a.atras ?? Number.POSITIVE_INFINITY;
      const db = b.atras ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.seguida.nombre.localeCompare(b.seguida.nombre, 'es');
    })
    .map(({ seguida, publicoHoy, cuando }) => ({ seguida, publicoHoy, cuando }));
  const limite = ahora.getTime() - DIAS_QUE_SE_VE_QUE_SE_FUE * 86_400_000;
  const seFueron = siguiendo.seFueron
    .filter((seFue) => seFue.cuando.getTime() > limite)
    .map(({ id, nombre }) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return { filas, seFueron };
}

/** A row's second line: when it last published, else where it is. */
export function detalleDe(fila: FilaSeguida): string {
  return fila.cuando ?? fila.seguida.colonia ?? ES.misCocinas.sinOfertas;
}

// ----------------------------------------------------------------------------
// *¿Seguir a …?* — once, after her first pickup at a kitchen (G20)
// ----------------------------------------------------------------------------

/**
 * Whether to ask *¿Seguir a …?* under this plate: she collected it, it is the FIRST plate she
 * collected at that kitchen in her list, she does not follow the kitchen, and it is still within
 * its rating window — the after-the-plate moment, bounded by the database's `rate_until` (the day
 * after its window), rated or not.
 * ⚠️ `siguiendo` not read yet asks nothing: never a question she already answered.
 */
export function preguntarSeguir(
  apartado: Apartado,
  apartados: readonly Apartado[],
  siguiendo: Siguiendo | null | undefined,
  ahora: Date,
): boolean {
  if (apartado.estado !== 'recogido') return false;
  if (siguiendo === null || siguiendo === undefined) return false;
  if (switchesDe(siguiendo, apartado.cocina.id).siguiendo) return false;
  const primero = apartados
    .filter((a) => a.estado === 'recogido' && a.cocina.id === apartado.cocina.id)
    .reduce<Apartado | null>((antes, a) => (antes === null || a.hora.getTime() < antes.hora.getTime() ? a : antes), null);
  if (primero?.id !== apartado.id) return false;
  // ⚠️ The window, never "not rated yet": her first star is sent at once and her list read again,
  // and the question must not vanish under her thumb while she rates.
  return apartado.calificarHasta !== null && ahora.getTime() <= apartado.calificarHasta.getTime();
}

// ----------------------------------------------------------------------------
// A followed kitchen the door does not send — her page from `my_follows`
// ----------------------------------------------------------------------------

/**
 * A kitchen she follows in the shape her circle draws (`@/ui/Circulo`): the door's own while it sends
 * her, else what `my_follows` sent — her name, trade, colonia, page and last day, with nothing on offer.
 * ⚠️ NEVER HANDED TO HER FULL PAGE (`@/ui/PaginaDeCocina`): `my_follows` sends no stars and no ways of
 * paying, and that page would read *Todavía sin calificaciones* of a kitchen that has them. A kitchen
 * out of the door opens `@/ui/PaginaSeguida`, which says only what this row knows.
 */
export function cocinaDeSeguida(seguida: Seguida, puerta: Kitchen | null): Kitchen {
  if (puerta !== null) return puerta;
  return {
    id: seguida.id,
    name: seguida.nombre,
    giro: seguida.giro,
    address: { street: '', number: '', colonia: seguida.colonia ?? '', city: '', postalCode: '' },
    directions: null,
    point: null,
    page: seguida.pagina,
    offers: [],
    summary: { weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: seguida.ultimoDia, repeats: [] },
    pagos: ['efectivo'],
    comeres: ['llevar'],
    minScore: null,
    estrellas: null,
    servicios: [],
  };
}
