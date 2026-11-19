// ============================================================================
// EVERY ROUND TRIP THIS APP MAKES TO THE DATABASE. Plan tasks `10.4b-iii-a` (her
// kitchens), `10.4b-iii-b` (making one: her trade, her address, her pin),
// `10.4b-iii-c` (her way out: what goes with her account, the deletion, Apple),
// `10.5-iii-c` (her kitchen deleted alone, her login kept),
// `10.4b-iv-a` (what she publishes: her list, publishing, withdrawing),
// `10.4h` (address first: her line with no pin, and her pin cleared), `10.5-ii`
// (her page in Itacate, and the pictures that go up before what points at them),
// `10.5-i-b-ii` (Google's point for her address, kept as a 30-day copy),
// `10.5b-iv-a` (her kitchen's reservations, the handover and the fonda's thumb),
// `10.5b-iv-c` (her settings, her stars, − and +, and the read before Apple is told),
// `10.9a-i` (what her kitchen uses, and what she tells Wera about the menu), `10.9b-ii`
// (her role, who works at her kitchen, *Quitar a …* and *Salir de esta cocina*) and `10.9b-iii`
// (a helper's code: *Invitar a alguien*, the kitchen's name before she joins, and joining) and `10.9e-ii`
// (the loyalty card: its terms, closing it, its counts, this phone's key, a neighbour's code scanned).
//
// ⚠️ THE IMPURE HALF OF `src/api/` (ADR-035 §2.11): the only module here that
// imports the live client, so no node suite can load it; every name it sends is
// a constant from a pure module beside it (`@/api/kitchen`, `@/api/place`,
// `@/api/account`, `@/api/listing`, `@/api/pagina`, `@/api/fotos`,
// `@/api/apartados`, `@/api/ajustes`, `@/api/calificaciones`, `@/api/servicios`, `@/api/equipo`,
// `@/api/invitar`, `@/api/tarjeta`), which the
// suite and the contract checks read. Screens reach these through `@/api/hooks`.
// ============================================================================

import type { FunctionRegion } from '@supabase/supabase-js';

import {
  AJUSTES_COLUMNS,
  AJUSTES_OWNER_COLUMN,
  AJUSTES_TABLE,
  setAjustesArgs,
  toAjustes,
  type Ajustes,
  type AjustesFields,
  type AjustesPatch,
} from '@/api/ajustes';
import {
  APPLE_REVOKE,
  APPLE_REVOKE_REGION,
  APPLE_REVOKE_TIMEOUT_MS,
  DELETE_MY_ACCOUNT,
  DELETE_MY_BUSINESS,
  OWNERS_TABLE,
  OWNER_ACTIVE_COLUMN,
  OWNER_COLUMNS,
  OWNER_ROLE,
  OWNER_ROLE_COLUMN,
  PENDING_COLUMNS,
  PENDING_NULL_COLUMNS,
  PENDING_OWNER_COLUMN,
  PENDING_TABLE,
  PENDING_UNTIL_COLUMN,
  deletedFrom,
  revokeBody,
  type DeleteArgs,
  type DeleteBusinessArgs,
  type Deleted,
  type OwnerRow,
} from '@/api/account';
import {
  HAND_OVER_RESERVATION,
  RATE_NEIGHBOUR,
  RESERVATION_COLUMNS,
  RESERVATION_DAY_COLUMN,
  RESERVATION_HISTORY_ORDER,
  RESERVATION_LINES_TABLE,
  RESERVATION_LINE_ORDER,
  RESERVATION_NEIGHBOURS,
  RESERVATION_ORDER,
  RESERVATION_OWNER_COLUMN,
  RESERVATION_TABLE,
  entregadoFrom,
  neighboursArgs,
  pulgarDadoFrom,
  reservasFrom,
  vecinosFrom,
  type HandOverArgs,
  type Pulgar,
  type RateNeighbourArgs,
  type Reserva,
  type SobreElVecino,
} from '@/api/apartados';
import { MY_KITCHEN_RATINGS, calificacionesFrom, ratingsArgs, type Calificaciones } from '@/api/calificaciones';
import {
  MY_KITCHEN_FEATURES,
  SEND_MENU_REQUEST,
  SET_KITCHEN_FEATURES,
  featuresArgs,
  loQueUsaFrom,
  menuRequestArgs,
  setFeaturesArgs,
  type Estado,
  type LoQueUsa,
  type Servicio,
} from '@/api/servicios';
import { KITCHEN_FOLLOWERS, followersArgs, teSiguenFrom } from '@/api/seguidores';
import { KITCHEN_NUMBERS, numbersArgs, numerosFrom, type Numeros } from '@/api/numeros';
import type { DireccionCalls } from '@/api/direccion';
import {
  LEAVE_KITCHEN,
  MEMBERS_TABLE,
  MEMBER_ACTIVE_COLUMN,
  MEMBER_COLUMNS,
  MEMBER_KITCHEN_COLUMN,
  MEMBER_ROLE_COLUMN,
  MEMBER_USER_COLUMN,
  MY_ROLE,
  DUENA,
  activoPatch,
  leaveArgs,
  roleArgs,
  rolFrom,
  type MemberRow,
  type Quitar,
  type Rol,
} from '@/api/equipo';
import {
  INVITE_HELPER,
  KITCHEN_OF_CODE,
  REDEEM_INVITE,
  codeArgs,
  invitacionFrom,
  inviteArgs,
  nombreDeCocinaFrom,
  unidaFrom,
  type Invitacion,
} from '@/api/invitar';
import {
  PHOTO_BUCKET,
  PHOTO_TYPE,
  alreadyStored,
  bytesOf,
  photoHeaders,
  photoUrl,
  type FotoNueva,
  type PhotoSize,
} from '@/api/fotos';
import {
  COCINA_KIND,
  GIRO_COLUMN,
  KIND_COLUMN,
  KITCHEN_COLUMNS,
  KITCHEN_GIROS,
  KITCHEN_ORDER,
  ONBOARD_WORKSPACE,
  WORKSPACE_TABLE,
  girosFrom,
  toKitchen,
  type Giro,
  type Kitchen,
  type KitchenRow,
  type OnboardArgs,
} from '@/api/kitchen';
import {
  LINES_TABLE,
  LINE_ORDER,
  LISTING_COLUMNS,
  LISTING_LIMIT,
  LISTING_ORDER,
  LISTING_OWNER_COLUMN,
  LISTING_TABLE,
  PUBLISH_LISTING,
  SET_LISTING_QUANTITY,
  WITHDRAW_LISTING,
  cantidadFrom,
  listingsFrom,
  orderTerm,
  type Listing,
  type PublishArgs,
  type SetQuantityArgs,
  type WithdrawArgs,
} from '@/api/listing';
import {
  CLEAR_STORE_PIN,
  PLACE_ACTIVE_COLUMN,
  PLACE_COLUMNS,
  PLACE_ORDER,
  PLACE_OWNER_COLUMN,
  PLACE_TABLE,
  SET_GOOGLE_POINT,
  SET_STORE_ADDRESS,
  SET_STORE_DIRECTIONS,
  SET_STORE_PIN,
  toPlace,
  type ClearStorePinArgs,
  type Place,
  type PlaceRow,
  type SetGooglePointArgs,
  type SetStoreAddressArgs,
  type SetStoreDirectionsArgs,
  type SetStorePinArgs,
} from '@/api/place';
import {
  PAGE_COLUMNS,
  PAGE_OWNER_COLUMN,
  PAGE_TABLE,
  SET_KITCHEN_PAGE,
  toPage,
  type Page,
  type PageFields,
  type SetPageArgs,
} from '@/api/pagina';
import type { KitchenCalls } from '@/api/registro';
import {
  CARD_OF_CODE,
  CLOSE_CARD,
  GIVE_REWARD,
  GIVE_STAMP,
  KITCHEN_CARD,
  REGISTER_KITCHEN_KEY,
  SET_CARD_TERMS,
  cardFrom,
  keyFrom,
  kitchenArgs,
  kitchenCardFrom,
  type CardRow,
  type CodeArgs,
  type KeyRow,
  type KitchenCardRow,
  type RewardArgs,
  type StampArgs,
  type TermsArgs,
} from '@/api/tarjeta';
import {
  CREATE_PROMOTION,
  END_PROMOTION,
  KITCHEN_PROMOTIONS,
  UNDO_PROMOTION,
  kitchenArgs as promotionsKitchenArgs,
  promocionesFrom,
  type CreateArgs,
  type PromotionArgs,
  type PromotionsRow,
} from '@/api/promociones';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/lib/supabase';

/**
 * Her kitchens, the first-made first. An empty array is an answer — "no kitchen
 * yet" — not a failure: `workspace_select` (`0001`) returns exactly the
 * businesses she is an active member of, and the filter keeps the shops out.
 */
export async function myKitchens(): Promise<Kitchen[]> {
  let query = supabase.from(WORKSPACE_TABLE).select(KITCHEN_COLUMNS).eq(KIND_COLUMN, COCINA_KIND);
  for (const column of KITCHEN_ORDER.split(',')) query = query.order(column);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as KitchenRow[]).map(toKitchen);
}

/** The kitchens' trades, in their order (`kitchen_giros()`, `0072`). */
export async function kitchenGiros(): Promise<Giro[]> {
  const { data, error } = await supabase.rpc(KITCHEN_GIROS);
  if (error) throw error;
  return girosFrom(data);
}

/** Makes her kitchen — the business, her owner membership and its first place — and returns its id. */
export async function onboardKitchen(args: OnboardArgs): Promise<string> {
  const { data, error } = await supabase.rpc(ONBOARD_WORKSPACE, args);
  if (error) throw error;
  if (typeof data !== 'string') throw new Error(`${ONBOARD_WORKSPACE} returned ${typeof data}, expected a kitchen id`);
  return data;
}

/**
 * Her trade, by the owner's plain update (Wera's `setMainGiro`). ⚠️
 * `.select().single()` AND NOT A BARE UPDATE: a refusal is a 200 with no row,
 * which would otherwise come back looking saved.
 */
export async function setKitchenGiro(kitchenId: string, giro: string): Promise<void> {
  const { error } = await supabase
    .from(WORKSPACE_TABLE)
    .update({ [GIRO_COLUMN]: giro })
    .eq('id', kitchenId)
    .select('id')
    .single();
  if (error) throw error;
}

/**
 * Her kitchen's place — the first active one of THIS kitchen, or `null`.
 * ⚠️ FILTERED ON THE KITCHEN: unfiltered, a shop's owner's first place is her
 * shop's store (`@/api/place`'s header).
 */
export async function firstPlace(kitchenId: string): Promise<Place | null> {
  let query = supabase
    .from(PLACE_TABLE)
    .select(PLACE_COLUMNS)
    .eq(PLACE_OWNER_COLUMN, kitchenId)
    .eq(PLACE_ACTIVE_COLUMN, true);
  for (const column of PLACE_ORDER.split(',')) query = query.order(column);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as PlaceRow[];
  return rows.length === 0 ? null : toPlace(rows[0]);
}

/** Her address, through `set_store_address` (`0069`). */
export async function setPlaceAddress(args: SetStoreAddressArgs): Promise<void> {
  const { error } = await supabase.rpc(SET_STORE_ADDRESS, args);
  if (error) throw error;
}

/** Her pin and its line of directions, through `set_store_pin` (`0072`). ⚠️ It writes both, every call. */
export async function setPlacePin(args: SetStorePinArgs): Promise<void> {
  const { error } = await supabase.rpc(SET_STORE_PIN, args);
  if (error) throw error;
}

/** Her line of directions alone, through `set_store_directions` (`0075`); her pin untouched. */
export async function setPlaceDirections(args: SetStoreDirectionsArgs): Promise<void> {
  const { error } = await supabase.rpc(SET_STORE_DIRECTIONS, args);
  if (error) throw error;
}

/** Her own pin cleared, through `clear_store_pin` (`0075`); her line untouched. */
export async function clearPlacePin(args: ClearStorePinArgs): Promise<void> {
  const { error } = await supabase.rpc(CLEAR_STORE_PIN, args);
  if (error) throw error;
}

/**
 * Google's point for her address, through `set_google_point` (`0078`, `10.5-i-b-ii`):
 * a 30-day copy, stamped by the database. ⚠️ SENT AFTER HER ADDRESS: a new address
 * clears it (`0078`'s trigger).
 */
export async function setPlaceGooglePoint(args: SetGooglePointArgs): Promise<void> {
  const { error } = await supabase.rpc(SET_GOOGLE_POINT, args);
  if (error) throw error;
}

/**
 * Her last publications at this kitchen, the newest first, each with its lines
 * in her order. ⚠️ FILTERED ON THE KITCHEN (`@/api/listing`'s header): the walls
 * show a login every kitchen she belongs to. ⚠️ THE LINES' ORDER IS THE EMBED'S
 * OWN (`referencedTable`) — to-many, so it sorts the lines inside each one.
 */
export async function myListings(kitchenId: string): Promise<Listing[]> {
  let query = supabase.from(LISTING_TABLE).select(LISTING_COLUMNS).eq(LISTING_OWNER_COLUMN, kitchenId);
  for (const { column, ascending } of LISTING_ORDER.split(',').map(orderTerm)) query = query.order(column, { ascending });
  const { data, error } = await query.order(LINE_ORDER, { referencedTable: LINES_TABLE }).limit(LISTING_LIMIT);
  if (error) throw error;
  return listingsFrom(data);
}

/**
 * ⚠️ `10.5b-iv-a`: HER KITCHEN'S RESERVATIONS FROM `desde` ON (`YYYY-MM-DD`, the day she
 * collects) — and before `antes`, for the history — her hour first, each with its lines and their dishes. FILTERED ON THE KITCHEN,
 * as her list is: the walls show a login every kitchen she belongs to. ⚠️ THE LINES' ORDER
 * IS THE EMBED'S OWN (`referencedTable`), as `myListings`' is.
 */
export async function myReservations(kitchenId: string, desde: string, antes: string | null = null): Promise<Reserva[]> {
  let query = supabase
    .from(RESERVATION_TABLE)
    .select(RESERVATION_COLUMNS)
    .eq(RESERVATION_OWNER_COLUMN, kitchenId)
    .gte(RESERVATION_DAY_COLUMN, desde);
  if (antes !== null) query = query.lt(RESERVATION_DAY_COLUMN, antes);
  const order = antes === null ? RESERVATION_ORDER : RESERVATION_HISTORY_ORDER;
  for (const { column, ascending } of order.split(',').map(orderTerm)) query = query.order(column, { ascending });
  const { data, error } = await query.order(RESERVATION_LINE_ORDER, { referencedTable: RESERVATION_LINES_TABLE });
  if (error) throw error;
  return reservasFrom(data);
}

/** `10.5b-iv-a`: who reserved each of the last 30 days' orders, while it waits, and its thumb (`0080`). */
export async function reservationNeighbours(kitchenId: string): Promise<Record<string, SobreElVecino>> {
  const { data, error } = await supabase.rpc(RESERVATION_NEIGHBOURS, neighboursArgs(kitchenId));
  if (error) throw error;
  return vecinosFrom(data);
}

/** `10.5b-iv-a`: *Ya cobré y lo entregué* — and *Sí pasó* (`0079`, `0080`). ⚠️ Always recorded; a retry keeps the first moment. */
export async function handOverReservation(args: HandOverArgs): Promise<void> {
  const { data, error } = await supabase.rpc(HAND_OVER_RESERVATION, args);
  if (error) throw error;
  entregadoFrom(data);
}

/** `10.5b-iv-a`: the fonda's thumb on one order (`0080`). A retry of the same thumb answers it. */
export async function rateNeighbour(args: RateNeighbourArgs): Promise<Pulgar> {
  const { data, error } = await supabase.rpc(RATE_NEIGHBOUR, args);
  if (error) throw error;
  return pulgarDadoFrom(data);
}

/** Publishes the window and its lines in one call (`0072`). ⚠️ The id is the phone's; a retry returns it. */
export async function publishListing(args: PublishArgs): Promise<string> {
  const { data, error } = await supabase.rpc(PUBLISH_LISTING, args);
  if (error) throw error;
  if (typeof data !== 'string') throw new Error(`${PUBLISH_LISTING} returned ${typeof data}, expected the publication's id`);
  return data;
}

/** Takes a publication down (`0072`); a second call keeps the first moment. */
export async function withdrawListing(args: WithdrawArgs): Promise<void> {
  const { error } = await supabase.rpc(WITHDRAW_LISTING, args);
  if (error) throw error;
}

/** `10.5b-iv-c`: − and + — how many of one line she offers now (`0079`). Answers what she offers and what is taken. */
export async function setListingQuantity(args: SetQuantityArgs): Promise<{ readonly count: number; readonly taken: number }> {
  const { data, error } = await supabase.rpc(SET_LISTING_QUANTITY, args);
  if (error) throw error;
  return cantidadFrom(data);
}

/**
 * `10.5b-iv-c`: her settings — six columns of her page's row (`0079`, `0080`), or the
 * defaults when she has no row. Read apart from her page (`@/api/ajustes`' header).
 */
export async function kitchenAjustes(kitchenId: string): Promise<Ajustes> {
  const { data, error } = await supabase.from(AJUSTES_TABLE).select(AJUSTES_COLUMNS).eq(AJUSTES_OWNER_COLUMN, kitchenId).maybeSingle();
  if (error) throw error;
  return toAjustes(data as Partial<AjustesFields> | null);
}

/** `10.5b-iv-c`: one setting, through her page's one door (`set_kitchen_page`); it answers with the row as saved. */
export async function setKitchenAjustes(kitchenId: string, patch: AjustesPatch): Promise<Ajustes> {
  const { data, error } = await supabase.rpc(SET_KITCHEN_PAGE, setAjustesArgs(kitchenId, patch));
  if (error) throw error;
  return toAjustes(data as Partial<AjustesFields> | null);
}

/** `10.5b-iv-c`: her stars, as a kitchen may see them (`0080`): the day after, from five, never who. */
export async function myKitchenRatings(kitchenId: string): Promise<Calificaciones | null> {
  const { data, error } = await supabase.rpc(MY_KITCHEN_RATINGS, ratingsArgs(kitchenId));
  if (error) throw error;
  return calificacionesFrom(data);
}

/**
 * `10.9a-i`: what her kitchen uses, what Wera offers, Próximamente (`0081`) — any member. ⚠️ An answer
 * it cannot read is an error, never *nothing chosen*: a screen must not draw her choices as none.
 */
export async function myKitchenFeatures(kitchenId: string): Promise<LoQueUsa> {
  const { data, error } = await supabase.rpc(MY_KITCHEN_FEATURES, featuresArgs(kitchenId));
  if (error) throw error;
  const loQueUsa = loQueUsaFrom(data);
  if (loQueUsa === null) throw new TypeError(`${MY_KITCHEN_FEATURES}: an answer this build cannot read`);
  return loQueUsa;
}

/** `10.9a-i`: her choices, one or several — the owner only; it answers the read as the database left it. */
export async function setKitchenFeatures(kitchenId: string, choices: Readonly<Partial<Record<Servicio, Estado>>>): Promise<LoQueUsa> {
  const { data, error } = await supabase.rpc(SET_KITCHEN_FEATURES, setFeaturesArgs(kitchenId, choices));
  if (error) throw error;
  const loQueUsa = loQueUsaFrom(data);
  if (loQueUsa === null) throw new TypeError(`${SET_KITCHEN_FEATURES}: an answer this build cannot read`);
  return loQueUsa;
}

/** `10.9a-i`: *Cuéntanos cómo necesitas tu menú* — kept by Wera, never sent anywhere; the owner only. */
export async function sendMenuRequest(kitchenId: string, text: string): Promise<LoQueUsa> {
  const { data, error } = await supabase.rpc(SEND_MENU_REQUEST, menuRequestArgs(kitchenId, text));
  if (error) throw error;
  const loQueUsa = loQueUsaFrom(data);
  if (loQueUsa === null) throw new TypeError(`${SEND_MENU_REQUEST}: an answer this build cannot read`);
  return loQueUsa;
}

/**
 * ⚠️ `10.5b-iv-c`: IS A PLATE STILL TO HAND OVER AT ANY OF THESE BUSINESSES — asked before
 * Apple is told about her deletion (`@/api/account`'s header). `reservation_state`'s
 * `apartado` as filters: none of three moments, its hold not over at the phone's `now`.
 */
export async function plateStillPending(businessIds: readonly string[], now: Date): Promise<boolean> {
  if (businessIds.length === 0) return false;
  let query = supabase.from(PENDING_TABLE).select(PENDING_COLUMNS).in(PENDING_OWNER_COLUMN, [...businessIds]);
  for (const column of PENDING_NULL_COLUMNS.split(',')) query = query.is(column, null);
  const { data, error } = await query.gt(PENDING_UNTIL_COLUMN, now.toISOString()).limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * Her page (`10.5-ii`, `0076`): the open kitchen's row, or the page of defaults
 * when she has never saved one — no row is an answer, not a failure.
 */
export async function kitchenPage(kitchenId: string): Promise<Page> {
  const { data, error } = await supabase.from(PAGE_TABLE).select(PAGE_COLUMNS).eq(PAGE_OWNER_COLUMN, kitchenId).maybeSingle();
  if (error) throw error;
  return toPage(data as Partial<PageFields> | null);
}

/** What she changed on her page, through its one door (`0076`); it answers with the page as saved. */
export async function setKitchenPage(args: SetPageArgs): Promise<Page> {
  const { data, error } = await supabase.rpc(SET_KITCHEN_PAGE, args);
  if (error) throw error;
  return toPage(data as Partial<PageFields> | null);
}

/**
 * ⚠️ `10.5-ii`: EVERY FILE OF EVERY PICTURE TAKEN, into `cocina`, before what
 * points at it is saved — so a page or a dish never names a file that is not
 * there. One file at a time, the large one first. Already there is a success: the
 * retry of a save whose first attempt got this far (`alreadyStored`). Anything
 * else throws, and nothing is saved.
 */
export async function uploadPictures(fotos: readonly FotoNueva[]): Promise<void> {
  for (const foto of fotos) {
    for (const archivo of foto.archivos) {
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(`${foto.path}/${archivo.name}`, bytesOf(archivo.base64), { contentType: PHOTO_TYPE, upsert: false });
      if (error !== null && !alreadyStored(error)) throw error;
    }
  }
}

/**
 * ⚠️ `10.5-ii`: WHERE ONE SAVED PICTURE'S FILE IS, AND THE HEADERS THAT OPEN IT —
 * her own token, so the bucket's walls decide (`0076`) — Wera's `photoRequest`.
 * ⚠️ THE TOKEN IS HANDED IN, from `useAuth()`'s session: `supabase.auth` has
 * exactly one caller (`test/data-layer.test.ts`).
 */
export function photoRequest(
  path: string,
  size: PhotoSize,
  token: string,
): { readonly uri: string; readonly headers: Record<string, string> } {
  return { uri: photoUrl(SUPABASE_URL, path, size), headers: photoHeaders(token, SUPABASE_PUBLISHABLE_KEY) };
}

/** The writes and the read that make her kitchen, for `@/api/registro`. */
export const kitchenCalls: KitchenCalls = {
  onboard: onboardKitchen,
  setGiro: setKitchenGiro,
  firstPlace,
  setAddress: setPlaceAddress,
  setPin: setPlacePin,
  setDirections: setPlaceDirections,
  setGooglePoint: setPlaceGooglePoint,
};

/** The writes her address screen's *Guardar* sends, for `@/api/direccion`. */
export const direccionCalls: DireccionCalls = {
  setAddress: setPlaceAddress,
  setPin: setPlacePin,
  clearPin: clearPlacePin,
  setDirections: setPlaceDirections,
  setGooglePoint: setPlaceGooglePoint,
};

/**
 * Every active owner of every business she belongs to (`10.4b-iii-c`) — what
 * `businessesThatGo` reads to say which businesses go with her account. ⚠️ Not
 * filtered by kind: her shop in Wera goes too.
 */
export async function accountOwners(): Promise<OwnerRow[]> {
  const { data, error } = await supabase
    .from(OWNERS_TABLE)
    .select(OWNER_COLUMNS)
    .eq(OWNER_ROLE_COLUMN, OWNER_ROLE)
    .eq(OWNER_ACTIVE_COLUMN, true);
  if (error) throw error;
  return (data ?? []) as unknown as OwnerRow[];
}

/** Deletes her account (`0073`). ⚠️ The arguments arrive built by `deleteArgs`: a name for each business. */
export async function deleteMyAccount(args: DeleteArgs): Promise<Deleted> {
  const { data, error } = await supabase.rpc(DELETE_MY_ACCOUNT, args);
  if (error) throw error;
  return deletedFrom(data);
}

/**
 * Deletes one kitchen she alone owns and keeps her login (`0077`, `10.5-iii-c`).
 * ⚠️ The arguments arrive built by `deleteKitchenArgs`: the kitchen's id and the
 * name she typed. No Apple: no login goes.
 */
export async function deleteMyBusiness(args: DeleteBusinessArgs): Promise<void> {
  const { error } = await supabase.rpc(DELETE_MY_BUSINESS, args);
  if (error) throw error;
}

/**
 * Tells Apple she is leaving (Wera's `5R-k`). ⚠️ THE ONLY CALL HERE THAT IS NOT
 * TO POSTGRES: the Edge Function `@/api/account` names, with her own session,
 * told the code is Cocina's (`revokeBody`). It throws like every wrapper here,
 * and its one caller catches: a deletion is never refused because Apple, or the
 * function, could not be reached.
 */
export async function revokeApple(code: string): Promise<void> {
  const { error } = await supabase.functions.invoke(APPLE_REVOKE, {
    body: revokeBody(code),
    region: APPLE_REVOKE_REGION as FunctionRegion,
    timeout: APPLE_REVOKE_TIMEOUT_MS,
  });
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// `10.9b-ii` — her role, who works at her kitchen, *Quitar a …*, *Salir de esta cocina*
// ----------------------------------------------------------------------------

/** Her role at one kitchen (`my_role`, `0001`), or `null` when she is no active member of it. */
export async function myRole(kitchenId: string): Promise<Rol | null> {
  const { data, error } = await supabase.rpc(MY_ROLE, roleArgs(kitchenId));
  if (error) throw error;
  return rolFrom(data);
}

/** Who works at THIS kitchen now — its active memberships, by name and role. The owner's list. */
export async function kitchenTeam(kitchenId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from(MEMBERS_TABLE)
    .select(MEMBER_COLUMNS)
    .eq(MEMBER_KITCHEN_COLUMN, kitchenId)
    .eq(MEMBER_ACTIVE_COLUMN, true);
  if (error) throw error;
  return (data ?? []) as unknown as MemberRow[];
}

/**
 * *Quitar a …* (`activo` false) and its *Deshacer* (true): the owner's update of one membership
 * (`workspace_member_update`, `0001`). ⚠️ NEVER AN OWNER'S — the filter says so, whatever a stale
 * list holds. ⚠️ AN RLS UPDATE REFUSAL IS A 200 WITH NO ROW, so the row is asked back and
 * `.single()` turns a refusal into `PGRST116`.
 */
export async function setMemberActive({ kitchenId, userId }: Quitar, activo: boolean): Promise<void> {
  const { error } = await supabase
    .from(MEMBERS_TABLE)
    .update(activoPatch(activo))
    .eq(MEMBER_KITCHEN_COLUMN, kitchenId)
    .eq(MEMBER_USER_COLUMN, userId)
    .neq(MEMBER_ROLE_COLUMN, DUENA)
    .select(MEMBER_USER_COLUMN)
    .single();
  if (error) throw error;
}

/** *Salir de esta cocina* (`leave_kitchen`, `0082`): her own membership ended; `TD025` for an owner. */
export async function leaveKitchen(kitchenId: string): Promise<void> {
  const { error } = await supabase.rpc(LEAVE_KITCHEN, leaveArgs(kitchenId));
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// `10.9b-iii` — a helper's code: *Invitar a alguien*, *Unirme a …*, joining
// ----------------------------------------------------------------------------

/** *Invitar a alguien* (`invite_helper`, `0083`): a new code for one person, 24 hours. The owner's alone. */
export async function inviteHelper(kitchenId: string): Promise<Invitacion> {
  const { data, error } = await supabase.rpc(INVITE_HELPER, inviteArgs(kitchenId));
  if (error) throw error;
  const invitacion = invitacionFrom(data);
  if (invitacion === null) throw new Error(`${INVITE_HELPER} answered no code`);
  return invitacion;
}

/** The name of the kitchen a live code would join (`kitchen_of_code`, `0083`); `TD005`/`TD003` when it would not. */
export async function kitchenOfCode(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc(KITCHEN_OF_CODE, codeArgs(codigo));
  if (error) throw error;
  const nombre = nombreDeCocinaFrom(data);
  if (nombre === null) throw new Error(`${KITCHEN_OF_CODE} answered no name`);
  return nombre;
}

/** Joining with the code (`redeem_invite`, `0028`): her helper's membership, at once. Answers the kitchen she joined. */
export async function joinWithCode(codigo: string): Promise<{ readonly kitchenId: string; readonly nombre: string }> {
  const { data, error } = await supabase.rpc(REDEEM_INVITE, codeArgs(codigo));
  if (error) throw error;
  const unida = unidaFrom(data);
  if (unida === null) throw new Error(`${REDEEM_INVITE} answered no kitchen`);
  return unida;
}

// ----------------------------------------------------------------------------
// `10.9d-ii` — how many neighbours follow her kitchen
// ----------------------------------------------------------------------------

/**
 * *Te siguen N* (`kitchen_followers`, `0084`): how many neighbours follow her kitchen — any member,
 * never who. ⚠️ An answer that is not a count is an error, never a 0 that is not one.
 */
export async function kitchenFollowers(kitchenId: string): Promise<number> {
  const { data, error } = await supabase.rpc(KITCHEN_FOLLOWERS, followersArgs(kitchenId));
  if (error) throw error;
  const n = teSiguenFrom(data);
  if (n === null) throw new TypeError(`${KITCHEN_FOLLOWERS}: an answer this build cannot read`);
  return n;
}

// ----------------------------------------------------------------------------
// `10.9f` — her numbers (`0086`)
// ----------------------------------------------------------------------------

/**
 * *Tus números* (`kitchen_numbers`, `0086`): what passed through Itacate at her kitchen — the owner's. ⚠️ An
 * answer this build cannot read is an error, never zeros drawn as hers.
 */
export async function kitchenNumbers(kitchenId: string): Promise<Numeros> {
  const { data, error } = await supabase.rpc(KITCHEN_NUMBERS, numbersArgs(kitchenId));
  if (error) throw error;
  const numeros = numerosFrom(data);
  if (numeros === null) throw new TypeError(`${KITCHEN_NUMBERS}: an answer this build cannot read`);
  return numeros;
}

// ----------------------------------------------------------------------------
// `10.9e-ii` — the loyalty card (`0085`): its terms, closing it, its counts and today's lines, this
// phone's key, and a neighbour's code scanned. ⚠️ EVERY ONE A POST (supabase-js's `rpc`, no `get`):
// a code is never checked in a read-only call (`25006`), and `kitchen_card` is read the same way.
// ⚠️ AN ANSWER THIS BUILD CANNOT READ IS AN ERROR, never zeros or a card drawn empty.
// ----------------------------------------------------------------------------

/** *Activar* / *Guardar* (`set_card_terms`) — the owner's; it answers the card as the database left it. */
export async function setCardTerms(args: TermsArgs): Promise<KitchenCardRow> {
  const { data, error } = await supabase.rpc(SET_CARD_TERMS, args);
  if (error) throw error;
  const card = kitchenCardFrom(data);
  if (card === null) throw new TypeError(`${SET_CARD_TERMS}: an answer this build cannot read`);
  return card;
}

/** *Cerrar la tarjeta* (`close_card`) — the owner's; nobody starts a new one, those started finish for 30 days. */
export async function closeCard(kitchenId: string): Promise<KitchenCardRow> {
  const { data, error } = await supabase.rpc(CLOSE_CARD, kitchenArgs(kitchenId));
  if (error) throw error;
  const card = kitchenCardFrom(data);
  if (card === null) throw new TypeError(`${CLOSE_CARD}: an answer this build cannot read`);
  return card;
}

/** The card's screen, *Hoy*'s tile and *Sellar*'s lines (`kitchen_card`) — any member. */
export async function kitchenCard(kitchenId: string): Promise<KitchenCardRow> {
  const { data, error } = await supabase.rpc(KITCHEN_CARD, kitchenArgs(kitchenId));
  if (error) throw error;
  const card = kitchenCardFrom(data);
  if (card === null) throw new TypeError(`${KITCHEN_CARD}: an answer this build cannot read`);
  return card;
}

/** This phone's *Sellar* key and secret, handed once (`register_kitchen_key`) — any member. */
export async function registerKitchenKey(kitchenId: string): Promise<KeyRow> {
  const { data, error } = await supabase.rpc(REGISTER_KITCHEN_KEY, kitchenArgs(kitchenId));
  if (error) throw error;
  const key = keyFrom(data);
  if (key === null) throw new TypeError(`${REGISTER_KITCHEN_KEY}: an answer this build cannot read`);
  return key;
}

/** Whose code it is, and her card here (`card_of_code`) — writes nothing but a miss. */
export async function cardOfCode(args: CodeArgs): Promise<CardRow> {
  const { data, error } = await supabase.rpc(CARD_OF_CODE, args);
  if (error) throw error;
  const card = cardFrom(data);
  if (card === null) throw new TypeError(`${CARD_OF_CODE}: an answer this build cannot read`);
  return card;
}

/** *Dar sello* (`give_stamp`), at the scan's moment — from the screen, or from the queue. */
export async function giveStamp(args: StampArgs): Promise<CardRow> {
  const { data, error } = await supabase.rpc(GIVE_STAMP, args);
  if (error) throw error;
  const card = cardFrom(data);
  if (card === null) throw new TypeError(`${GIVE_STAMP}: an answer this build cannot read`);
  return card;
}

/** *Entregar premio* (`give_reward`), at the scan's moment — from the screen, or from the queue. */
export async function giveReward(args: RewardArgs): Promise<CardRow> {
  const { data, error } = await supabase.rpc(GIVE_REWARD, args);
  if (error) throw error;
  const card = cardFrom(data);
  if (card === null) throw new TypeError(`${GIVE_REWARD}: an answer this build cannot read`);
  return card;
}

// ----------------------------------------------------------------------------
// `10.9g-ii` — promotions (`0087`): her kitchen's, and the owner's three writes. Every write answers
// her list as the database left it. ⚠️ AN ANSWER THIS BUILD CANNOT READ IS AN ERROR, never an empty
// list drawn as hers.
// ----------------------------------------------------------------------------

function promociones(name: string, data: unknown): PromotionsRow {
  const row = promocionesFrom(data);
  if (row === null) throw new TypeError(`${name}: an answer this build cannot read`);
  return row;
}

/** *Promociones*, *Hoy*'s tile and *¿Es parte de una promoción?* (`kitchen_promotions`) — any member. */
export async function kitchenPromotions(kitchenId: string): Promise<PromotionsRow> {
  const { data, error } = await supabase.rpc(KITCHEN_PROMOTIONS, promotionsKitchenArgs(kitchenId));
  if (error) throw error;
  return promociones(KITCHEN_PROMOTIONS, data);
}

/** *Publicar promoción* (`create_promotion`) — the owner's; a retry under the same id is the same promotion. */
export async function createPromotion(args: CreateArgs): Promise<PromotionsRow> {
  const { data, error } = await supabase.rpc(CREATE_PROMOTION, args);
  if (error) throw error;
  return promociones(CREATE_PROMOTION, data);
}

/** *Terminarla hoy* (`end_promotion`) — the owner's, at once. */
export async function endPromotion(args: PromotionArgs): Promise<PromotionsRow> {
  const { data, error } = await supabase.rpc(END_PROMOTION, args);
  if (error) throw error;
  return promociones(END_PROMOTION, data);
}

/** *Deshacer* (`undo_promotion`) — the owner's, within two minutes of its making (`TD032` after). */
export async function undoPromotion(args: PromotionArgs): Promise<PromotionsRow> {
  const { data, error } = await supabase.rpc(UNDO_PROMOTION, args);
  if (error) throw error;
  return promociones(UNDO_PROMOTION, data);
}
