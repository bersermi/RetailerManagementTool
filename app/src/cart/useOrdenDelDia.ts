// ============================================================================
// THE DAY'S ORDER, ON THE PHONE. Plan task `14.2` — the hook Vender reads its
// order through. Every rule is `@/cart/orden`'s, with its suite; what is here
// is WHEN: when the phone reads the sales, when it keeps the order, and when
// the counter starts drawing it.
//
// ⚠️⚠️ A NEW ORDER IS DRAWN ONLY WHEN THE COUNTER ASKS (`tomar`) — Vender asks on
// arriving at the screen and after every sale, when it goes back to *Todo* at the
// top anyway (call 8) — NEVER WHEN THE READ LANDS. The owner's call 6: *"set once
// a day, never moved while she works."* On a phone whose six months were not
// read yet — a cashier's, whose Inicio never reads them, or any phone opened
// without signal — the read lands while she may already be reaching for a tile,
// and moving the tiles then is the one thing the ruling forbids. Until then the
// counter draws the order it kept, of whatever day: stale is a worse order,
// never a false figure.
//
// ⚠️ ON THE FIRST RENDER IT DRAWS THE NEWEST IT CAN — today's when the rows are
// already on the phone (the owner's, read by Inicio), else the one kept — so a
// counter opened with everything at hand never flashes yesterday's order.
//
// ⚠️ KEPT IN THE DEVICE STORE, WHICH HOLDS A DEVICE'S THINGS: this is not the
// shop's setting but this phone's copy of what the shop's own sales say, keyed
// by the shop (`@/cart/orden`'s header has why it must be kept at all).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';

import { isoDay } from '@/api/catalog';
import { useSales, useWorkspace } from '@/api/hooks';
import {
  ORDEN_KEY,
  guardarOrden,
  leerOrden,
  ordenNuevo,
  paraTienda,
  vigente,
  type OrdenDelDia,
} from '@/cart/orden';
import { deviceStore, readKey, writeKey } from '@/lib/store';

export function useOrdenDelDia(): {
  /** The order the counter draws, or `null` for the catalog's own (by name). */
  readonly orden: OrdenDelDia | null;
  /** Draw the newest order the phone has — on arriving, and after a sale. */
  readonly tomar: () => void;
} {
  const shopId = useWorkspace()?.id ?? null;
  const today = isoDay(new Date());
  const [kept, setKept] = useState<OrdenDelDia | null>(() => leerOrden(readKey(deviceStore(), ORDEN_KEY)));
  const needs = shopId !== null && !vigente(kept, today, shopId);
  const { sales } = useSales({ enabled: needs });
  const nuevo = needs ? ordenNuevo(sales.state, sales.days, today, shopId) : null;
  const latest = nuevo ?? kept;
  const newest = useRef(latest);
  newest.current = latest;
  const [drawn, setDrawn] = useState<OrdenDelDia | null>(() => latest);

  // ⚠️ KEPT AS SOON AS IT IS SET, drawn only when asked (see the header). Once
  // kept it is today's, so `needs` turns false and this runs no more today.
  useEffect(() => {
    if (nuevo === null) return;
    writeKey(deviceStore(), ORDEN_KEY, guardarOrden(nuevo));
    setKept(nuevo);
  }, [nuevo]);

  const tomar = useCallback(() => setDrawn(newest.current), []);
  return { orden: paraTienda(drawn, shopId), tomar };
}
