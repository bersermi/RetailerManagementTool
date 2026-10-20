import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogLine, isoDay, search, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import {
  CONDITIONS,
  KEEPINGS,
  MAX_PHOTOS,
  PACKAGINGS,
  addressComplete,
  dayBookable,
  draftReady,
  formatSlot,
  pickupDays,
  pickupBands,
  prefillFrom,
  productAmount,
  requestTitle,
  sentToday,
  slotTooSoon,
  slotValid,
  storeAddressLine,
  whatsappMessage,
  type CollectionPrefill,
  type CollectionRequest,
  type CollectionStatus,
  type Condition,
  type Keeping,
  type Packaging,
  type StoreAddress,
} from '@/api/collection';
import { canWriteCatalog } from '@/api/catalogWrite';
import {
  useCancelCollection,
  useCatalog,
  useCollectionReaches,
  useCollectionRequests,
  useMagnitude,
  useMyRole,
  useRequestCollection,
  useStoreAddresses,
  useUnitFactors,
  useWorkspace,
  type LocalPhoto,
} from '@/api/hooks';
import { magnitudeNote, outsized, type Typical, type Typicals } from '@/api/magnitude';
import {
  FOOT_REASONS,
  WASTE_DAYS,
  WASTE_REASONS,
  reasonHint,
  reasonLabel,
  wasteOccurredAt,
  wasteReasonOf,
  type WasteDay,
  type WasteReason,
} from '@/api/waste';
import { whatsappUrl } from '@/auth/support';
import { qtySent, reviewOf, type Review, type ReviewRow } from '@/cart/cart';
import { takePhoto } from '@/capture/photo';
import { canCommit, commitOf, type Basketful } from '@/cart/commit';
import { useCart, useCartStore, useCorrects, useExpiries, useReason, useWasteDay } from '@/cart/store';
import {
  addDays,
  calendarMonths,
  formatClock,
  formatDayTile,
  formatExpiryDay,
  weekdayInitials,
} from '@/format/date';
import { commitToQueue } from '@/lib/commitRunner';
import { newWriteId, nowIso } from '@/lib/ids';
import { SUPPORT_WHATSAPP } from '@/lib/supportWhatsapp';
import { usePilotVisit } from '@/pilot/usePilotVisit';
import { correctingLine } from '@/api/corrections';
import { setTabGuard } from '@/navigation/salida';
import { comproFace, sendButton, type ComproFace } from '@/offline/teLoCompro';
import { useOnline } from '@/offline/useOnline';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { TITULO } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { EMPTIED_BLOOM_MS } from '@/theme/pulse';
import { BotonLleno } from '@/ui/BotonLleno';
import { Buscador } from '@/ui/Buscador';
import { Cantidad } from '@/ui/Cantidad';
import { CierreCarrito } from '@/ui/CierreCarrito';
import { Hecho } from '@/ui/Hecho';
import { HojaCarrito } from '@/ui/HojaCarrito';
import { Interruptor } from '@/ui/Interruptor';
import { Retrato } from '@/ui/Retrato';
import { Separador } from '@/ui/Separador';
import { TecladoListo } from '@/ui/TecladoListo';
import { Vacio } from '@/ui/Vacio';
import { Corrigiendo } from '@/ui/Corrigiendo';
import { Pregunta as Salir } from '@/ui/Pregunta';
import { VaciarCarrito } from '@/ui/VaciarCarrito';
import { Velo } from '@/ui/Velo';

// ============================================================================
// DESPERDICIO — what the shop lost, and what it asks Wera to collect. Plan task
// `6a-i`, redrawn by `8l` from the owner's brief and rulings of 2026-10-16.
//
// ⚠️⚠️ TWO DOORS, THE OWNER'S: *"There are essentially 2 versions of waste"* —
// **Tirar**, what the shop throws away, *"for his benefit, for analytics and to
// provide insights"*; and **Te lo compro**, what the shop asks Wera to collect
// and, if it can, buy. The doors are the screen's first question; a switch at
// the top moves between the two once inside. ⚠️ **A cashier never sees either**
// — *"Allow to owners and managers only"* — so she lands on Tirar, which is the
// screen she had before `8l`.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ TIRAR IS NO LONGER REASON-FIRST, AND THAT IS HIS RULING OVER §2.8
// ----------------------------------------------------------------------------
// §2.8 said *"Reason-first waste entry"* and `0019`'s header refused a default
// cause. He was shown both and ruled, 2026-10-16: *"by simply throwing something
// away the user should be able to log easily the waste with basic data … with
// some default values that can simplify the recording."* So Tirar opens on the
// catalog; **`caducado` and *hoy* are ALREADY CHOSEN, and drawn as chosen**, in
// the bar and in the cart's foot, where a tap changes either before the slide.
// ⚠️ A DEFAULT SHOWN IS NOT A DEFAULT HIDDEN — the cause is on the bar beside
// the count every moment the slide can be reached. ADR-035 §2.8 records the
// ruling; `@/api/waste`'s header says what the database still refuses.
//
// ⚠️ EACH LINE CARRIES ITS OWN EXPIRY (*caducidad por producto*), `sin fecha`
// until somebody reads one, and the write-off its day — hoy, ayer or antier, the
// three `0057`'s 72-hour clamp can hold. Both are in the cart (`@/cart/store`).
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THERE IS NO PESO TOTAL ON TIRAR, AND THAT IS ÁREA 9's RULING
// ----------------------------------------------------------------------------
// Ruled 2026-09-14: ***"Números and Desperdicio SHOW WASTE AS QUANTITY AND NOT AS
// COST OR AS A RATE, until something fixes `0011`."*** C8.2 seeds the pilot's
// catalog deliberately short, so a peso figure here would read `$0.00` for the
// products most likely to spoil. The retail value IS still recorded
// (`waste.total_net`); what is refused is reporting it. `UNPRICED_WASTE` in
// `@/cart/cart` is what makes an unpriced line invisible to a shopkeeper.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ TE LO COMPRO: ONE PRODUCT, ONE QUARTER OF AN HOUR, THE PREVIOUS ANSWERS
// ----------------------------------------------------------------------------
// *"The user will record only 1 product per Te lo compro entry, that allows me
// to promote each product easier … prefill each entry with the equivalent values
// of the previous one."* And: *"If the user picks 9:45 then he should be able to
// dispatch the waste from 9:45 to 10:00."* `0060` holds both; `@/api/collection`
// computes them. ⚠️ **A prefilled answer says so** in a band above it — his
// standing rule that a proposal must not look decided.
//
// ⚠️ THE DOOR OPENS ONLY FOR A STORE WITH AN ADDRESS INSIDE THE AREA (`0058`,
// 06400 and 06470 today). Closed, it is drawn and says why — never hidden, so the
// service is discoverable by the shop it does not reach yet.
//
// ⚠️⚠️ AND ONLY WITH A SIGNAL — `8g`, 2026-10-20, the offline report's round 3
// (the owner's *"Do all the fixes"*). Offline the door is shut and says
// `ES.offline.collectNeedsSignal`, and opens by itself when the signal returns;
// a request already open stays open, and *Guardar solicitud* then WAITS for the
// signal instead of failing (`useRequestCollection`). Every rule is
// `@/offline/teLoCompro`'s; this file only draws them.
//
// ⚠️ THE PHOTOS ARE `8m`'s: up to three, taken with the camera on step one
// (the owner's canvas: a thumbnail each, then *📷 Otra foto*), uploaded under
// the request's own id when it is saved (`useRequestCollection`). A native
// module, so a phone without the new build cannot run this screen's update.
//
// ----------------------------------------------------------------------------
// ⚠️ THE OWNER'S PHONE IS THE WHOLE INSTRUMENT (`R9`, §2.11). What is checkable
// was pushed out: the vocabulary and the defaults are `@/api/waste`, the payload
// `@/cart/cart`, the pickup's arithmetic `@/api/collection`, the days
// `@/format/date`; the wires are `docs/checks/6a-i-waste-contract.sh` and
// `docs/checks/8k-collection-contract.sh`.
// ============================================================================

/**
 * The bar carrying *Listo* above the quantity pad. ⚠️ ITS OWN ID AND NOT
 * VENDER'S: `InputAccessoryView` matches by string, and a shared spelling across
 * two mounted screens is a bar that attaches to whichever mounted last.
 */
const PAD_ID = 'wera.waste.pad';

type Modo = 'puertas' | 'tirar' | 'compro';
const MODOS = ['tirar', 'compro'] as const;

/** Where Te lo compro stands for this store — the door's four faces. */
type Acceso =
  | { readonly kind: 'checking' }
  | { readonly kind: 'noAddress' }
  | { readonly kind: 'outside'; readonly postalCode: string }
  | { readonly kind: 'open'; readonly address: StoreAddress };

function useAcceso(): Acceso {
  const { data } = useStoreAddresses();
  const address = data === undefined || data.length === 0 ? null : data[0];
  const complete = addressComplete(address);
  const reaches = useCollectionReaches(complete && address !== null ? address.postalCode : '');
  if (data === undefined) return { kind: 'checking' };
  if (address === null || !complete) return { kind: 'noAddress' };
  if (reaches === undefined) return { kind: 'checking' };
  return reaches ? { kind: 'open', address } : { kind: 'outside', postalCode: address.postalCode };
}

/** The device's `HH:MM` — the shop's own clock, for which quarters have begun. */
function nowClock(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function Desperdicio() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const role = useMyRole();
  const mayCollect = canWriteCatalog(role);
  const acceso = useAcceso();

  // ⚠️ A RESTORED BIN ROUND OPENS ON TIRAR, and so does a write-off handed back
  // by `Corregir` (`documentos.tsx`) while this tab was already mounted — the
  // basket going from empty to full is the signal, read on the change.
  const cart = useCart('waste');
  const [modo, setModo] = useState<Modo>(() => (cart.length > 0 ? 'tirar' : 'puertas'));
  const had = useRef(cart.length);
  useEffect(() => {
    if (had.current === 0 && cart.length > 0) setModo('tirar');
    had.current = cart.length;
  }, [cart.length]);

  // ⚠️ `role === null` IS *NOT KNOWN YET*, and the doors are drawn meanwhile:
  // only an answer of `staff` sends her straight to Tirar.
  const shown: Modo = role === 'staff' ? 'tirar' : modo;

  // ⚠️⚠️ `8g`'s review (2026-10-20), THE OWNER'S RULING: *"when someone closes a
  // screen such as Desperdicio -> Te Lo Compro the Desperdicio screen should be
  // reset, not just paused for it to be resumed"* — after asking, when something
  // was filled in. A tab is never closed, so the request lived on: now every way
  // out of it (another tab, this tab again, Android's back, the switch to Tirar)
  // asks if it must, then clears the request and returns to the doors.
  const [requestDirty, setRequestDirty] = useState(false);
  const [requestKey, setRequestKey] = useState(0);
  const [pending, setPending] = useState<{ go: () => void } | null>(null);
  const resetRequest = useCallback(() => {
    setRequestKey((k) => k + 1);
    setRequestDirty(false);
    setModo('puertas');
  }, []);
  const leaveRequest = useCallback(
    (go: () => void) => {
      if (shown !== 'compro') return go();
      if (requestDirty) return setPending({ go });
      resetRequest();
      go();
    },
    [shown, requestDirty, resetRequest],
  );
  useFocusEffect(
    useCallback(() => {
      setTabGuard({ onLeave: leaveRequest });
      const back = BackHandler.addEventListener('hardwareBackPress', () => {
        if (shown !== 'compro') return false;
        leaveRequest(() => router.navigate('/'));
        return true;
      });
      return () => {
        setTabGuard(null);
        back.remove();
      };
    }, [leaveRequest, shown]),
  );

  return (
    <KeyboardAvoidingView
      // ⚠️ NO `paddingTop: insets.top` — the tab navigator draws a header below
      // the notch already (the owner's report on Vender, 2026-09-24).
      style={{ flex: 1, backgroundColor: PALETTE.desperdicioFondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={scale.tabBarHeight + insets.bottom}
    >
      {shown === 'puertas' || !mayCollect ? null : (
        <View style={{ paddingHorizontal: scale.space, paddingTop: scale.space }}>
          <Interruptor
            options={MODOS}
            labels={{ tirar: ES.waste.doors.tirar, compro: ES.waste.doors.compro }}
            picked={shown}
            // ⚠️ `8g`: switching to Tirar leaves the request — asked like any way out.
            onPick={(next) => (next === 'tirar' ? leaveRequest(() => setModo('tirar')) : setModo(next))}
            ink={PALETTE.desperdicio}
            soft={PALETTE.desperdicioSuave}
          />
        </View>
      )}

      {shown === 'puertas' ? (
        <Puertas
          acceso={acceso}
          isOwner={role === 'owner'}
          onTirar={() => setModo('tirar')}
          onCompro={() => setModo('compro')}
        />
      ) : shown === 'tirar' ? (
        <Tirar />
      ) : (
        <TeLoCompro key={requestKey} acceso={acceso} isOwner={role === 'owner'} onDirty={setRequestDirty} />
      )}

      {/* ⚠️ MOUNTED ONCE AND OUTSIDE EVERY CONDITIONAL. `InputAccessoryView`
          renders into the KEYBOARD rather than into the layout. */}
      <TecladoListo padId={PAD_ID} label={ES.counter.done} />

      <Salir
        shown={pending !== null}
        title={ES.leave.request.title}
        body={ES.leave.request.body}
        keep={ES.leave.request.keep}
        go={ES.leave.request.go}
        onKeep={() => setPending(null)}
        onGo={() => {
          const next = pending;
          setPending(null);
          resetRequest();
          next?.go();
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// The doors
// ============================================================================

function Puertas({
  acceso,
  isOwner,
  onTirar,
  onCompro,
}: {
  acceso: Acceso;
  isOwner: boolean;
  onTirar: () => void;
  onCompro: () => void;
}) {
  const { scale } = useDensity();
  const { data } = useCollectionRequests();
  const online = useOnline();
  const recent = newestFirst(data ?? []).slice(0, 3);
  return (
    <ScrollView contentContainerStyle={{ padding: scale.space, gap: scale.space }}>
      <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>
        {ES.waste.doors.question}
      </Text>

      <Puerta
        icon="delete-outline"
        title={ES.waste.doors.tirar}
        hint={ES.waste.doors.tirarHint}
        tone="claro"
        onPress={onTirar}
      />

      <PuertaCompro
        acceso={acceso}
        face={comproFace(acceso.kind, online)}
        isOwner={isOwner}
        onOpen={onCompro}
      />

      {recent.length === 0 ? null : <Solicitudes requests={recent} mayCancel={false} />}
    </ScrollView>
  );
}

/**
 * The Te lo compro door in whichever face it is in — the store's four, or
 * `needsSignal` (`comproFace`, `8g` round 3). `acceso` carries the address and
 * the código postal the faces print; `face` is what is drawn.
 */
function PuertaCompro({
  acceso,
  face,
  isOwner,
  onOpen,
}: {
  acceso: Acceso;
  face: ComproFace;
  isOwner: boolean;
  onOpen: () => void;
}) {
  if (face === 'needsSignal') {
    // ⚠️ `8g`, 2026-10-20, THE OFFLINE REPORT'S ROUND 3: SHUT AND SAYING WHY, in
    // the place `Revisando tu zona…` spun for ever. No tap, no button — it opens
    // by itself when the signal returns, because `face` is re-read with it.
    return (
      <Puerta
        icon="truck-outline"
        title={ES.waste.doors.compro}
        hint={ES.waste.doors.comproHint}
        tag={ES.offline.collectNeedsSignal}
        tone="cerrado"
      />
    );
  }
  if (face === 'open' && acceso.kind === 'open') {
    return (
      <Puerta
        icon="truck-outline"
        title={ES.waste.doors.compro}
        hint={ES.waste.doors.comproHint}
        tag={ES.waste.doors.inZone(acceso.address.postalCode)}
        tone="lleno"
        onPress={onOpen}
      />
    );
  }
  if (face === 'noAddress') {
    // ⚠️ THE OWNER'S DOOR LEADS TO THE ONE PLACE HE CAN FIX IT — Ajustes'
    // *Domicilio*, which is his alone; a manager is told who can.
    return (
      <Puerta
        icon="truck-outline"
        title={ES.waste.doors.compro}
        hint={isOwner ? ES.waste.doors.noAddressOwner : ES.waste.doors.noAddressManager}
        tone="cerrado"
        onPress={isOwner ? () => router.push('/ajustes') : undefined}
      />
    );
  }
  return (
    <Puerta
      icon="truck-outline"
      title={ES.waste.doors.compro}
      hint={acceso.kind === 'outside' ? ES.waste.doors.comproClosedHint : ES.waste.doors.comproHint}
      tag={acceso.kind === 'outside' ? ES.waste.doors.outOfZone(acceso.postalCode) : ES.waste.doors.checking}
      tone="cerrado"
    />
  );
}

/**
 * One door. ⚠️ `cerrado` IS DRAWN AND INERT, never hidden — and it carries its
 * reason as words, so the grey is never the only thing saying *closed* (`R11`).
 * A closed door with somewhere to go (the owner's Ajustes) keeps its chevron.
 */
function Puerta({
  icon,
  title,
  hint,
  tag,
  tone,
  onPress,
}: {
  icon: 'delete-outline' | 'truck-outline';
  title: string;
  hint: string;
  tag?: string;
  tone: 'claro' | 'lleno' | 'cerrado';
  onPress?: () => void;
}) {
  const { scale } = useDensity();
  const lleno = tone === 'lleno';
  const cerrado = tone === 'cerrado';
  const ground = lleno ? PALETTE.desperdicio : cerrado ? PALETTE.fondo : PALETTE.superficie;
  const ink = lleno ? PALETTE.superficie : cerrado ? PALETTE.tintaApagada : PALETTE.desperdicio;
  const sub = lleno ? PALETTE.superficie : PALETTE.tintaApagada;
  const Frame = onPress === undefined ? View : Pressable;
  return (
    <Frame
      {...(onPress === undefined
        ? {}
        : { accessibilityRole: 'button' as const, accessibilityLabel: `${title}. ${hint}`, onPress })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.space,
        padding: scale.space,
        borderRadius: scale.space,
        borderWidth: 1,
        borderColor: lleno ? PALETTE.desperdicio : PALETTE.linea,
        backgroundColor: ground,
      }}
    >
      <View
        style={{
          width: scale.tapTarget * 1.25,
          height: scale.tapTarget * 1.25,
          borderRadius: scale.tapTarget,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: lleno ? PALETTE.desperdicio : cerrado ? PALETTE.linea : PALETTE.desperdicioSuave,
          borderWidth: lleno ? 1 : 0,
          borderColor: PALETTE.desperdicioSuave,
        }}
      >
        <MaterialCommunityIcons name={icon} size={scale.iconSize} color={ink} />
      </View>
      <View style={{ flex: 1, gap: scale.rowGap / 2 }}>
        <Text style={{ fontSize: scale.titleSize, ...TITULO, color: ink }}>{title}</Text>
        <Text style={{ fontSize: scale.smallSize, color: sub }}>{hint}</Text>
        {tag === undefined ? null : (
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: scale.rowGap,
              paddingVertical: scale.rowGap / 4,
              borderRadius: scale.space,
              backgroundColor: lleno ? PALETTE.superficie : PALETTE.linea,
            }}
          >
            <Text
              style={{
                fontSize: scale.smallSize,
                fontWeight: '600',
                color: lleno ? PALETTE.desperdicio : PALETTE.tintaApagada,
              }}
            >
              {tag}
            </Text>
          </View>
        )}
      </View>
      {onPress === undefined ? null : (
        <MaterialCommunityIcons name="chevron-right" size={scale.iconSize} color={ink} />
      )}
    </Frame>
  );
}

// ============================================================================
// Tirar
// ============================================================================

function Tirar() {
  const { scale } = useDensity();

  // ⚠️ THE SAME LIST AS PRODUCTOS AND VENDER — C3.1, *"there are no buy-only or
  // sell-only subsets"*: anything the shop sells is something it can lose.
  const { loading, entries, failed, locationId } = useCatalog('');
  const factors = useUnitFactors();
  // ⚠️ §2.8's THIRD GUARD EARNS ITS PLACE HERE MORE THAN ANYWHERE: a write-off
  // has nobody on the other side of it, and `9999 kg` in the bin is queried by
  // no one.
  const typicals = useMagnitude();
  const workspace = useWorkspace();

  const [typed, setTyped] = useState('');
  const box = useRef<TextInput>(null);
  const rows = search(entries, typed);

  const list = useRef<FlatList<CatalogEntry>>(null);
  const editing = useRef<number | null>(null);

  // ⚠️ IT WAITS FOR THE KEYBOARD TO BE UP rather than firing on focus —
  // `vender.tsx`'s measurement.
  useEffect(() => {
    const up = Keyboard.addListener('keyboardDidShow', () => {
      const at = editing.current;
      if (at === null || at < 0) return;
      list.current?.scrollToIndex({ index: at, viewPosition: 0.5, animated: true });
    });
    return () => up.remove();
  }, []);

  const cart = useCart('waste');
  const chosen = useReason();
  const reason = wasteReasonOf(chosen);
  const day = useWasteDay();
  const expiries = useExpiries();
  // ⚠️ `8p`: the write-off this basket re-keys — dropped by the store the moment
  // she picks another day, which is her answer.
  const corrects = useCorrects('waste');
  // ⚠️ `8g`: while the cart is a correction, which document it is — the strip
  // and the *Vaciar* box say so (`@/ui/Corrigiendo`).
  const correcting = corrects === null ? null : ES.counter.cart.correctionWhat.waste;
  const openShop = useCartStore((state) => state.openShop);
  const openReason = useCartStore((state) => state.openReason);
  const setWasteDay = useCartStore((state) => state.setWasteDay);
  const clear = useCartStore((state) => state.clear);

  // ⚠️ THE GUARD IS THE WHOLE POINT: `openShop(null)` on a restored store means
  // *the shop changed* and drops the basket, and `useWorkspace` answers `null`
  // on every cold start.
  useEffect(() => {
    if (workspace !== null) openShop(workspace.id);
  }, [workspace, openShop]);

  const today = isoDay(new Date());

  const [cartOpen, setCartOpen] = useState(false);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openCart = useCallback(() => setCartOpen(true), []);

  const [asking, setAsking] = useState(false);
  const [emptied, setEmptied] = useState(false);
  const [recorded, setRecorded] = useState(false);
  // ⚠️ §5's readings (plan `5P-a`) — a no-op on any build made without
  // `EXPO_PUBLIC_PILOT`.
  const pilot = usePilotVisit('desperdicio', workspace?.id ?? null, locationId);
  useEffect(() => {
    if (recorded) pilot.confirmed();
  }, [recorded, pilot]);
  const bloom = useRef(new Animated.Value(0)).current;

  // ⚠️ `reviewOf` FOR THE ROWS, ITS TOTAL DELIBERATELY UNUSED — área 9. It still
  // needs `prices_include_tax`: waste prices on the SALE shape (`MONEY_KIND`).
  const review: Review | null =
    workspace === null ? null : reviewOf(cart, entries, 'waste', workspace.pricesIncludeTax);

  const basketful: Basketful | null =
    workspace === null
      ? null
      : {
          cart,
          entries,
          factors,
          scope: 'waste',
          pricesIncludeTax: workspace.pricesIncludeTax,
          workspaceId: workspace.id,
          locationId,
          reason,
          expiries,
          corrects,
        };

  // ⚠️ THE EMPTYING ANIMATION — started in an effect, never in the handler that
  // sets the state: on the native driver that is motion versus silence.
  useEffect(() => {
    if (!emptied) return;
    bloom.setValue(0);
    const run = Animated.timing(bloom, {
      toValue: 1,
      duration: EMPTIED_BLOOM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    run.start(({ finished }) => {
      if (!finished) return;
      setEmptied(false);
      setCartOpen(false);
    });
    return () => run.stop();
  }, [emptied, bloom]);

  useEffect(() => {
    if (cart.length === 0) setAsking(false);
  }, [cart.length]);

  // ⚠️ `Vaciar carrito` LEAVES THE CAUSE AND THE DAY STANDING: emptying is *I
  // keyed the wrong products*, not *I picked the wrong day*.
  const emptyCart = useCallback(() => {
    setAsking(false);
    clear('waste');
    setEmptied(true);
  }, [clear]);

  const commit = useCallback(() => {
    if (basketful === null) return;
    pilot.committed();
    const now = nowIso();
    const done = commitOf({ ...basketful, occurredAt: wasteOccurredAt(now, day) }, { id: newWriteId(), now });
    // ⚠️ EVERY REFUSAL IS A PROGRAMMING ERROR AND NONE HAS A SENTENCE (`R4`) —
    // `canCommit` is what decided the slide was drawn at all.
    if (!done.ok) return;
    commitToQueue(done.write);
    clear('waste');
    // ⚠️ THE NEXT WRITE-OFF STARTS FROM THE OWNER'S DEFAULTS AGAIN — caducado and
    // hoy — never from the cause and day the last one happened to carry.
    openReason(null);
    setWasteDay(0);
    setCartOpen(false);
    setRecorded(true);
  }, [basketful, clear, openReason, setWasteDay, pilot, day]);

  const canRecord = basketful !== null && canCommit(basketful);

  return (
    <View style={{ flex: 1 }} onTouchStart={pilot.onTouchStart}>
      {corrects === null ? null : (
        <View style={{ paddingHorizontal: scale.space, paddingTop: scale.rowGap }}>
          <Corrigiendo line={correctingLine('waste', corrects)} onCancel={() => setAsking(true)} />
        </View>
      )}
      <Buscador value={typed} onChange={setTyped} box={box} placeholder={ES.catalog.search} />

      <FlatList
        ref={list}
        // ⚠️ A `FlatList` FOR `productos.tsx`'s REASON: ~100 products (C8.3) on
        // two low-end Androids (C1.1).
        data={rows}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item, index }) => (
          <Fila
            entry={item}
            factors={factors}
            typical={typicals[item.id]}
            today={today}
            onEdit={(on) => {
              editing.current = on ? index : null;
            }}
          />
        )}
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio line={catalogLine(loading, typed, failed)} />}
        contentContainerStyle={{ paddingBottom: scale.space }}
        onScrollToIndexFailed={({ index }) => {
          list.current?.scrollToOffset({ offset: index * scale.rowHeight, animated: true });
        }}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
      />

      <Barra
        lines={cart.length}
        day={day}
        reason={reason}
        onOpen={openCart}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        canRecord={canRecord}
      />

      <Carrito
        open={cartOpen}
        onClose={closeCart}
        review={review}
        entries={entries}
        factors={factors}
        typicals={typicals}
        today={today}
        day={day}
        reason={reason}
        onDay={setWasteDay}
        onReason={openReason}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        correcting={correcting}
        canRecord={canRecord}
        asking={asking}
        emptied={emptied}
        bloom={bloom}
        onConfirmEmpty={emptyCart}
        onCancelEmpty={() => setAsking(false)}
      />

      {/* ⚠️ THE SAME QUESTION, ASKED FROM THE BAR — only while the sheet is
          CLOSED: the sheet renders its own copy inside its `Modal`, and nested
          modals on iOS animate against each other. */}
      {!cartOpen ? (
        <VaciarCarrito
          asking={asking}
          emptied={emptied}
          bloom={bloom}
          count={cart.length}
          correcting={correcting}
          onConfirm={emptyCart}
          onCancel={() => setAsking(false)}
        />
      ) : null}

      <Hecho shown={recorded} word={ES.waste.recorded} onDone={() => setRecorded(false)} />
    </View>
  );
}

/**
 * ⚠️ THE FIVE CAUSES — reached from the cart's *Otro* chip since `8l`. Two are
 * on the foot already (caducado, dañado); this window holds all five so the
 * chosen one is always findable, in the ENUM's order (`WASTE_REASONS`, `0003`'s
 * declaration order, which is the order a reason breakdown comes back in).
 *
 * ⚠️ TWO ROWS CARRY A LINE UNDER THE NAME AND THREE DO NOT — `reasonHint`.
 */
function Motivos({
  open,
  chosen,
  onChoose,
  onClose,
}: {
  open: boolean;
  chosen: WasteReason;
  onChoose: (reason: WasteReason) => void;
  onClose: () => void;
}) {
  const { scale } = useDensity();
  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Velo label={ES.waste.pickClose} onPress={onClose} />
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale.space * 2 }}
        >
          <View
            style={{
              width: '100%',
              maxHeight: '70%',
              borderRadius: scale.space,
              backgroundColor: PALETTE.fondo,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: scale.rowGap,
                paddingHorizontal: scale.space,
                paddingVertical: scale.space,
                borderBottomWidth: 1,
                borderBottomColor: PALETTE.linea,
              }}
            >
              <Text style={{ flex: 1, fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                {ES.waste.pickReason}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ES.waste.pickClose}
                onPress={onClose}
                style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
                  {ES.waste.pickClose}
                </Text>
              </Pressable>
            </View>
            <FlatList
              data={WASTE_REASONS}
              keyExtractor={(one) => one}
              ItemSeparatorComponent={Separador}
              renderItem={({ item }) => {
                const here = item === chosen;
                const hint = reasonHint(item);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: here }}
                    accessibilityLabel={reasonLabel(item)}
                    onPress={() => onChoose(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: scale.rowGap,
                      minHeight: scale.rowHeight,
                      paddingHorizontal: scale.space,
                      paddingVertical: scale.rowGap,
                      backgroundColor: here ? PALETTE.desperdicioSuave : PALETTE.superficie,
                    }}
                  >
                    <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: scale.bodySize, fontWeight: here ? '700' : '600', color: PALETTE.tinta }}
                      >
                        {reasonLabel(item)}
                      </Text>
                      {hint === '' ? null : (
                        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{hint}</Text>
                      )}
                    </View>
                    {/* ⚠️ `R11`: the chosen row is filled AND ticked AND bolder. */}
                    {here ? (
                      <MaterialCommunityIcons name="check" size={scale.iconSize} color={PALETTE.desperdicio} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * ⚠️⚠️ ONE ROW, AND IT IS THE WHOLE CONTROL — C3.3: a quantity greater than zero
 * IS the line. `8l` gave it the owner's drawing: the initials tile, and under
 * the name the line's expiry once it is in the basket (*Caduca hoy*, *Sin
 * fecha*), on a tinted ground. ⚠️ NO PRICE ON THE ROW — his drawing has none,
 * and on this screen a price decides nothing a shopkeeper can act on.
 *
 * ⚠️ NO AMBER BUT THE MAGNITUDE WORD: `9999 kg` in the bin is the typo with
 * nobody on the other side of it to catch.
 */
function Fila({
  entry,
  factors,
  typical,
  today,
  onEdit,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  typical: Typical | undefined;
  today: string;
  onEdit: (editing: boolean) => void;
}) {
  const { scale } = useDensity();
  const base = useCartStore((state) => {
    for (const line of state.carts.waste) if (line.variantId === entry.id) return line.base;
    return 0;
  });
  const expiry = useCartStore((state) => state.expiries[entry.id] ?? null);
  const counted = base > 0;
  const big = magnitudeNote(outsized(typical, base, null));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        minHeight: scale.rowHeight,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: counted ? PALETTE.desperdicioSuave : PALETTE.superficie,
      }}
    >
      <Retrato
        name={entry.name}
        picture={entry.picture}
        ground={counted ? PALETTE.superficie : PALETTE.desperdicioSuave}
        ink={PALETTE.desperdicio}
      />
      <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
        <Text numberOfLines={1} style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
          {entry.name}
        </Text>
        {counted ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: scale.smallSize,
              fontWeight: '600',
              color: expiry === null ? PALETTE.tintaApagada : PALETTE.desperdicio,
            }}
          >
            {expiry === null ? ES.dates.noDate : ES.waste.expires(formatExpiryDay(expiry, today))}
          </Text>
        ) : entry.familyName === '' ? null : (
          <Text numberOfLines={1} style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
            {entry.familyName}
          </Text>
        )}
        {/* ⚠️ `R11`: the hue never travels alone, and this is the only amber
            word on the screen. */}
        {big === '' ? null : (
          <Text numberOfLines={1} style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>
            {big}
          </Text>
        )}
      </View>

      <Cantidad entry={entry} base={base} factors={factors} scope="waste" onEdit={onEdit} padId={PAD_ID} />
    </View>
  );
}

/**
 * ⚠️⚠️ C3.4's STICKY BAR — and it COUNTS instead of summing (área 9). `8l` put
 * the two defaults on it, as the owner drew them: the day and the cause, each a
 * chip that opens the cart where they are changed. ⚠️ **So the default is in
 * front of her every moment the slide can be reached** — that is what makes a
 * default cause something she chose by not changing it.
 */
function Barra({
  lines,
  day,
  reason,
  onOpen,
  onCommit,
  onEmpty,
  canRecord,
}: {
  lines: number;
  day: WasteDay;
  reason: WasteReason;
  onOpen: () => void;
  onCommit: () => void;
  onEmpty: () => void;
  canRecord: boolean;
}) {
  const { scale } = useDensity();
  const live = lines > 0;
  const Strip = live ? Pressable : View;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: PALETTE.linea, backgroundColor: PALETTE.banda }}>
      <Strip
        {...(live
          ? { accessibilityRole: 'button' as const, accessibilityLabel: ES.counter.cart.open, onPress: onOpen }
          : {})}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: scale.space,
          paddingHorizontal: scale.space,
          paddingVertical: scale.space,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
          {ES.waste.counted}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 2 }}>
          <Text
            style={{
              fontSize: scale.bodySize,
              fontWeight: live ? '700' : '400',
              color: live ? PALETTE.accion : PALETTE.tintaApagada,
            }}
          >
            {live ? ES.counter.lines(lines) : ES.counter.emptyCart}
          </Text>
          {live ? <MaterialCommunityIcons name="chevron-right" size={scale.iconSize} color={PALETTE.accion} /> : null}
        </View>
      </Strip>

      {live ? (
        <View style={{ paddingHorizontal: scale.space, paddingBottom: scale.space, gap: scale.rowGap }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap }}>
            <Opcion label={dayLabel(day)} on={false} drop onPress={onOpen} />
            <Opcion label={reasonLabel(reason)} on={false} drop onPress={onOpen} />
          </View>
          <CierreCarrito
            onEmpty={onEmpty}
            word={ES.waste.slide.word}
            label={ES.waste.slide.label}
            onCommit={onCommit}
            canCommit={canRecord}
            onTap={onOpen}
          />
        </View>
      ) : null}
    </View>
  );
}

function dayLabel(day: WasteDay): string {
  return day === 0 ? ES.dates.relative.today : day === 1 ? ES.dates.relative.yesterday : ES.dates.relative.dayBefore;
}

/**
 * ⚠️⚠️ C3.5's SHEET — the review before the write-off, its frame
 * `src/ui/HojaCarrito`. `8l` gave its foot the owner's two questions above the
 * slide, *¿Cuándo lo tiraste?* and *Motivo*, and each line its *Caducidad*.
 * ⚠️ THERE IS STILL NO TOTAL: a write-off is counted, not charged.
 */
function Carrito({
  open,
  onClose,
  review,
  entries,
  factors,
  typicals,
  today,
  day,
  reason,
  onDay,
  onReason,
  onCommit,
  onEmpty,
  correcting,
  canRecord,
  asking,
  emptied,
  bloom,
  onConfirmEmpty,
  onCancelEmpty,
}: {
  open: boolean;
  onClose: () => void;
  review: Review | null;
  entries: readonly CatalogEntry[];
  factors: UnitFactors;
  typicals: Typicals;
  today: string;
  day: WasteDay;
  reason: WasteReason;
  onDay: (day: WasteDay) => void;
  onReason: (reason: WasteReason) => void;
  onCommit: () => void;
  onEmpty: () => void;
  /** `8g`: the document a correction re-keys, or `null` — the *Vaciar* box's words. */
  correcting: string | null;
  canRecord: boolean;
  asking: boolean;
  emptied: boolean;
  bloom: Animated.Value;
  onConfirmEmpty: () => void;
  onCancelEmpty: () => void;
}) {
  const { scale } = useDensity();
  const rows = review === null ? [] : review.rows;
  // ⚠️ TWO CAUSES ON THE FOOT AND THE OTHER THREE BEHIND *OTRO* — the owner's
  // drawing. A cause chosen from the window shows its own name on that chip.
  const elsewhere = !FOOT_REASONS.includes(reason);
  const [dating, setDating] = useState<string | null>(null);
  // ⚠️ THE FIVE CAUSES OPEN FROM THIS SHEET'S FOOT, so their window is drawn
  // inside this sheet's `Modal` (`over`) — a sibling `Modal` is two iOS
  // presentations animating against each other (`HojaCarrito`'s header).
  const [picking, setPicking] = useState(false);
  const datingExpiry = useCartStore((state) => (dating === null ? null : (state.expiries[dating] ?? null)));
  const setExpiry = useCartStore((state) => state.setExpiry);

  return (
    <HojaCarrito
      open={open}
      onClose={onClose}
      lines={rows.length}
      foot={
        rows.length === 0 ? null : (
          <View style={{ gap: scale.rowGap }}>
            <Pregunta title={ES.waste.when}>
              {WASTE_DAYS.map((d) => (
                <Opcion key={d} label={dayLabel(d)} on={d === day} onPress={() => onDay(d)} />
              ))}
            </Pregunta>
            <Pregunta title={ES.waste.reasonTitle}>
              {FOOT_REASONS.map((r) => (
                <Opcion key={r} label={reasonLabel(r)} on={r === reason} onPress={() => onReason(r)} />
              ))}
              <Opcion
                label={elsewhere ? reasonLabel(reason) : ES.waste.otherReason}
                on={elsewhere}
                drop
                onPress={() => setPicking(true)}
              />
            </Pregunta>
            <CierreCarrito
              onEmpty={onEmpty}
              word={ES.waste.slide.word}
              label={ES.waste.slide.labelInCart}
              onCommit={onCommit}
              canCommit={canRecord}
              compact
            />
          </View>
        )
      }
      over={
        <>
          <VaciarCarrito
            asking={asking}
            emptied={emptied}
            bloom={bloom}
            count={rows.length}
            correcting={correcting}
            onConfirm={onConfirmEmpty}
            onCancel={onCancelEmpty}
          />
          <Calendario
            open={dating !== null}
            title={ES.waste.pickExpiry}
            chosen={datingExpiry}
            from={addDays(today, -30) ?? today}
            to={addDays(today, 30) ?? today}
            today={today}
            onChoose={(d) => {
              if (dating !== null) setExpiry(dating, d);
              setDating(null);
            }}
            onClose={() => setDating(null)}
          />
          <Motivos
            open={picking}
            chosen={reason}
            onChoose={(next) => {
              onReason(next);
              setPicking(false);
            }}
            onClose={() => setPicking(false)}
          />
        </>
      }
    >
      <FlatList
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(row) => row.variantId}
        renderItem={({ item }) => (
          <Renglon
            row={item}
            entry={entries.find((e) => e.id === item.variantId)}
            factors={factors}
            typical={typicals[item.variantId]}
            today={today}
            onOtherDay={() => setDating(item.variantId)}
          />
        )}
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio line={ES.counter.emptyCart} />}
        keyboardShouldPersistTaps="handled"
      />
    </HojaCarrito>
  );
}

/**
 * One line of the basket. ⚠️ NO LINE TOTAL — área 9 again, on the one surface
 * where it is hardest to leave out. `8l` added the line's *Caducidad*: sin
 * fecha, hoy, ayer, or a day from the calendar behind *Otra…*.
 *
 * ⚠️ A ROW WHOSE PRODUCT HAS LEFT THE CATALOG IS DRAWN AND NOT HIDDEN —
 * `reviewOf` has the argument: this sheet is the only surface that can remove it.
 */
function Renglon({
  row,
  entry,
  factors,
  typical,
  today,
  onOtherDay,
}: {
  row: ReviewRow;
  entry: CatalogEntry | undefined;
  factors: UnitFactors;
  typical: Typical | undefined;
  today: string;
  onOtherDay: () => void;
}) {
  const { scale } = useDensity();
  const remove = useCartStore((state) => state.remove);
  const expiry = useCartStore((state) => state.expiries[row.variantId] ?? null);
  const setExpiry = useCartStore((state) => state.setExpiry);
  const gone = entry === undefined;
  const big = magnitudeNote(outsized(typical, row.base, null));
  const yesterday = addDays(today, -1);
  const named = expiry === null || expiry === today || expiry === yesterday;

  return (
    <View
      style={{
        gap: scale.rowGap / 2,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scale.rowGap }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: scale.bodySize, fontWeight: '600', color: gone ? PALETTE.tintaApagada : PALETTE.tinta }}
        >
          {row.name ?? ES.counter.cart.goneName}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.counter.cart.remove} ${row.name ?? ES.counter.cart.goneName}`}
          onPress={() => remove('waste', row.variantId)}
          style={{ minHeight: scale.tapTarget, justifyContent: 'center', paddingHorizontal: scale.rowGap }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
            {ES.counter.cart.remove}
          </Text>
        </Pressable>
      </View>

      {gone || big !== '' ? (
        <Text
          numberOfLines={1}
          style={{
            fontSize: scale.smallSize,
            fontWeight: big === '' ? '400' : '600',
            color: big === '' ? PALETTE.tintaApagada : PALETTE.atencion,
          }}
        >
          {gone ? ES.counter.cart.gone : big}
        </Text>
      ) : null}

      {gone ? null : (
        <Pregunta title={ES.waste.expiry}>
          <Opcion label={ES.dates.noDate} on={expiry === null} onPress={() => setExpiry(row.variantId, null)} />
          <Opcion
            label={ES.dates.relative.today}
            on={expiry === today}
            onPress={() => setExpiry(row.variantId, today)}
          />
          <Opcion
            label={ES.dates.relative.yesterday}
            on={expiry !== null && expiry === yesterday}
            onPress={() => setExpiry(row.variantId, yesterday)}
          />
          <Opcion
            label={named ? ES.waste.otherDay : formatExpiryDay(expiry, today)}
            on={!named}
            drop
            onPress={onOtherDay}
          />
        </Pregunta>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {gone ? <View /> : <Cantidad entry={entry} base={row.base} factors={factors} scope="waste" padId={PAD_ID} />}
      </View>
    </View>
  );
}

// ============================================================================
// Te lo compro
// ============================================================================

type Paso = 'que' | 'cuando' | 'revisar' | 'guardada';

function TeLoCompro({
  acceso,
  isOwner,
  onDirty,
}: {
  acceso: Acceso;
  isOwner: boolean;
  /** `8g`: whether the request holds anything she filled in — the screen's question. */
  onDirty: (dirty: boolean) => void;
}) {
  const { scale } = useDensity();
  const online = useOnline();
  // ⚠️⚠️ `8g`, 2026-10-20, THE OFFLINE REPORT'S ROUND 3: THE DOOR CLOSES TO
  // ENTERING, NEVER ON HER. Once the form has been drawn in this visit, a signal
  // that drops leaves it standing (`comproFace`'s `inside`) — swapping it for the
  // shut card would unmount the request she is filling in. A new visit is a new
  // mount (`requestKey`), so the latch starts over with it.
  const [inside, setInside] = useState(false);
  const face = comproFace(acceso.kind, online, inside);
  useEffect(() => {
    if (face === 'open') setInside(true);
  }, [face]);
  if (face !== 'open' || acceso.kind !== 'open') {
    // ⚠️ THE SWITCH CAN REACH THIS SIDE WHEN THE DOOR IS SHUT, so the side says
    // what the door says — the same card, the same reason, nothing to fill in.
    // Offline that is `needsSignal`, and the form appears by itself on the
    // reconnect.
    return (
      <ScrollView contentContainerStyle={{ padding: scale.space }}>
        <PuertaCompro acceso={acceso} face={face} isOwner={isOwner} onOpen={() => {}} />
      </ScrollView>
    );
  }
  return <Solicitar address={acceso.address} onDirty={onDirty} />;
}

function Solicitar({ address, onDirty }: { address: StoreAddress; onDirty: (dirty: boolean) => void }) {
  const { scale } = useDensity();
  const { entries, loading, failed } = useCatalog('');
  const factors = useUnitFactors();
  const workspace = useWorkspace();
  const requests = useCollectionRequests();
  const { send, busy, paused } = useRequestCollection();
  const online = useOnline();
  // ⚠️ `8g` round 3: *Guardar solicitud*, spinning, or *Se envía cuando haya
  // señal* — and while it waits, the form holds still (`sendButton`).
  const button = sendButton(busy, paused, online);

  const today = isoDay(new Date());

  const [paso, setPaso] = useState<Paso>('que');
  const [id, setId] = useState(newWriteId);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [base, setBase] = useState(0);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [packaging, setPackaging] = useState<Packaging | null>(null);
  const [keeping, setKeeping] = useState<Keeping | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null | undefined>(undefined);
  const [day, setDay] = useState<string | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<readonly LocalPhoto[]>([]);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [dating, setDating] = useState(false);
  const box = useRef<TextInput>(null);

  // ⚠️ `8g`: SOMETHING SHE FILLED IN — a product, a quantity, a note, a photo, a
  // word in the search, or a step past the first. The answers carried over from
  // her last request are not hers to lose, and a request already sent is done.
  // ⚠️ `8g` round 3: A SEND WAITING FOR THE SIGNAL IS NOT SENT, and it is still on
  // `revisar`, so every way out still asks *¿Salir sin enviar la solicitud?* —
  // and leaving drops the waiting send (`useRequestCollection`). ⚠️ Closing the
  // app loses a waiting request, as it already loses a draft: no way out asks.
  const dirty =
    paso !== 'guardada' &&
    (paso !== 'que' || variantId !== null || base > 0 || note !== '' || photos.length > 0 || typed !== '');
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);

  // ⚠️⚠️ THE PREVIOUS REQUEST'S ANSWERS, ONCE — the owner's *"prefill each entry
  // with the equivalent values of the previous one."* Seeded the first time the
  // list arrives and never again, so a read finishing late cannot overwrite
  // what she has already changed.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || requests.data === undefined) return;
    seeded.current = true;
    const p: CollectionPrefill = prefillFrom(requests.data, today, nowClock());
    if (p.condition === null) return;
    setCondition(p.condition);
    setPackaging(p.packaging);
    setKeeping(p.keeping);
    // ⚠️ AN EXPIRY ALREADY PAST IS NOT CARRIED: the next product is not the
    // last one, and *caducó antier* copied forward would be a guess.
    setExpiryDate(p.expiryDate === null || (p.expiryDate !== undefined && p.expiryDate >= today) ? p.expiryDate : undefined);
    setDay(p.day);
    setAt(p.at);
    setPrefilled(true);
  }, [requests.data, today]);

  const entry = variantId === null ? undefined : entries.find((e) => e.id === variantId);
  const sent = entry === undefined || base <= 0 ? null : qtySent(base, entry, factors);
  const clock = nowClock();
  const slotOk = day !== null && at !== null && slotValid(at) && !slotTooSoon(day, at, today, clock);
  const ready = draftReady({ qty: sent?.qty_display ?? '', condition, packaging, keeping, expiryDate });

  // ⚠️ A PHOTO IS NAMED ONCE, WHEN IT IS TAKEN, so a retry after a weak signal
  // uploads to the same path and finds it already there (`alreadyStored`).
  const addPhoto = async () => {
    setPhotoNote(null);
    const outcome = await takePhoto();
    if (outcome.kind === 'taken') {
      setPhotos((now) => (now.length >= MAX_PHOTOS ? now : [...now, { ...outcome.photo, fileId: newWriteId() }]));
    } else if (outcome.kind === 'denied') {
      setPhotoNote(ES.collection.photo.denied);
    } else if (outcome.kind === 'failed') {
      setPhotoNote(ES.collection.photo.failed);
    }
  };
  const removePhoto = (fileId: string) => setPhotos((now) => now.filter((p) => p.fileId !== fileId));

  const save = async () => {
    if (entry === undefined || sent === null || !slotOk || day === null || at === null) return;
    if (condition === null || packaging === null || keeping === null || expiryDate === undefined) return;
    if (workspace === null) return;
    setError(null);
    // ⚠️ `8g` round 3: WITH NO SIGNAL THIS AWAIT LASTS UNTIL THERE IS ONE — the
    // send is held, not failed — and then carries on below exactly as a quick
    // one does. What it sends is what is captured here, which is why the form
    // holds still while it waits (`button.waiting`).
    const failure = await send({
      id,
      locationId: address.locationId,
      day,
      at,
      line: {
        variantId: entry.id,
        qty: sent.qty_display,
        unit: sent.qty_display_unit,
        condition,
        packaging,
        keeping,
        expiryDate,
      },
      photos: [],
      note,
    }, photos, workspace.id);
    if (failure !== null) {
      setError(failure);
      return;
    }
    setSaved(
      ES.collection.savedLine(
        productAmount(entry.name, sent.qty_display, sent.qty_display_unit),
        formatSlot(day, at, today),
      ),
    );
    setPaso('guardada');
  };

  // ⚠️ *Otro producto, con los mismos datos* — everything but the product, its
  // quantity and its note stays, and a new id makes it a new request.
  const another = () => {
    setId(newWriteId());
    setVariantId(null);
    setBase(0);
    setNote('');
    setPhotos([]);
    setPhotoNote(null);
    setTyped('');
    setError(null);
    setPrefilled(true);
    setPaso('que');
  };

  const mine = newestFirst(requests.data ?? []);
  const todays = sentToday(mine, today);

  if (paso === 'guardada') {
    return (
      <ScrollView contentContainerStyle={{ padding: scale.space, gap: scale.space }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: scale.space,
            padding: scale.space,
            borderRadius: scale.space,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            backgroundColor: PALETTE.superficie,
          }}
        >
          <MaterialCommunityIcons name="check-circle-outline" size={scale.retratoSize} color={PALETTE.accion} />
          <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
            <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
              {ES.collection.saved}
            </Text>
            <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{saved ?? ''}</Text>
          </View>
        </View>
        <BotonLleno label={ES.collection.another} variante="principal" onPress={another} />
        {SUPPORT_WHATSAPP === null || todays.length === 0 ? null : (
          <View style={{ gap: scale.rowGap / 2 }}>
            <BotonLleno
              label={ES.collection.tell}
              icon="whatsapp"
              onPress={() => {
                const text = whatsappMessage(todays, workspace?.displayName ?? '', address, today);
                void Linking.openURL(whatsappUrl(SUPPORT_WHATSAPP ?? '', text));
              }}
            />
            <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
              {ES.collection.tellHint}
            </Text>
          </View>
        )}
        <Solicitudes requests={mine} mayCancel />
      </ScrollView>
    );
  }

  const choosing = paso === 'que' && entry === undefined;

  return (
    <View style={{ flex: 1 }}>
      <Pasos at={paso === 'que' ? 0 : paso === 'cuando' ? 1 : 2} />

      {choosing ? (
        <View style={{ flex: 1 }}>
          {prefilled ? <Prefilled /> : null}
          <Text
            style={{
              paddingHorizontal: scale.space,
              paddingTop: scale.space,
              fontSize: scale.titleSize,
              ...TITULO,
              color: PALETTE.tinta,
            }}
          >
            {ES.collection.pickProduct}
          </Text>
          <Buscador value={typed} onChange={setTyped} box={box} placeholder={ES.catalog.search} />
          <FlatList
            data={search(entries, typed)}
            keyExtractor={(e) => e.id}
            ItemSeparatorComponent={Separador}
            ListEmptyComponent={<Vacio line={catalogLine(loading, typed, failed)} />}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.name}
                onPress={() => {
                  setVariantId(item.id);
                  setBase(0);
                  Keyboard.dismiss();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scale.rowGap,
                  minHeight: scale.rowHeight,
                  paddingHorizontal: scale.space,
                  paddingVertical: scale.rowGap,
                  backgroundColor: PALETTE.superficie,
                }}
              >
                <Retrato name={item.name} picture={item.picture} ground={PALETTE.desperdicioSuave} ink={PALETTE.desperdicio} />
                <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
                  <Text numberOfLines={1} style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
                    {item.name}
                  </Text>
                  {item.familyName === '' ? null : (
                    <Text numberOfLines={1} style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
                      {item.familyName}
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={scale.iconSize} color={PALETTE.desperdicio} />
              </Pressable>
            )}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: scale.space, gap: scale.space }}
          keyboardShouldPersistTaps="handled"
        >
          {paso === 'que' && entry !== undefined ? (
            <>
              {prefilled ? <Prefilled inset={false} /> : null}
              <Tarjeta>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap }}>
                  <Retrato name={entry.name} picture={entry.picture} small ground={PALETTE.desperdicioSuave} ink={PALETTE.desperdicio} />
                  <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
                    <Text numberOfLines={2} style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                      {entry.name}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={ES.collection.changeProduct}
                      onPress={() => {
                        setVariantId(null);
                        setBase(0);
                      }}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.accion }}>
                        {ES.collection.changeProduct}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <Cantidad
                  entry={entry}
                  base={base}
                  factors={factors}
                  scope="waste"
                  padId={PAD_ID}
                  onChange={setBase}
                  fill
                />
              </Tarjeta>
              <Tarjeta>
                <Pregunta title={ES.collection.condition}>
                  {CONDITIONS.map((c) => (
                    <Opcion key={c} label={ES.collection.conditions[c]} on={c === condition} onPress={() => setCondition(c)} />
                  ))}
                </Pregunta>
                <Pregunta title={ES.collection.packaging}>
                  {PACKAGINGS.map((p) => (
                    <Opcion key={p} label={ES.collection.packagings[p]} on={p === packaging} onPress={() => setPackaging(p)} />
                  ))}
                </Pregunta>
                <Pregunta title={ES.collection.keeping}>
                  {KEEPINGS.map((k) => (
                    <Opcion key={k} label={ES.collection.keepings[k]} on={k === keeping} onPress={() => setKeeping(k)} />
                  ))}
                </Pregunta>
                <Caduca today={today} value={expiryDate} onPick={setExpiryDate} onOther={() => setDating(true)} />
                <Fotos photos={photos} note={photoNote} onAdd={addPhoto} onRemove={removePhoto} />
              </Tarjeta>
            </>
          ) : null}

          {paso === 'cuando' ? (
            <Cuando
              today={today}
              clock={clock}
              day={day}
              at={at}
              onDay={(d) => setDay(d)}
              onAt={setAt}
              slot={slotOk && day !== null && at !== null ? formatSlot(day, at, today, true) : null}
            />
          ) : null}

          {paso === 'revisar' && entry !== undefined && sent !== null && day !== null && at !== null ? (
            <>
              <Tarjeta>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap }}>
                  <Retrato name={entry.name} picture={entry.picture} small ground={PALETTE.desperdicioSuave} ink={PALETTE.desperdicio} />
                  <View style={{ flex: 1, gap: scale.rowGap / 2 }}>
                    <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                      {productAmount(entry.name, sent.qty_display, sent.qty_display_unit)}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap / 2 }}>
                      {[
                        condition === null ? '' : ES.collection.conditions[condition],
                        packaging === null ? '' : ES.collection.packagings[packaging],
                        keeping === null ? '' : ES.collection.keepings[keeping],
                        expiryDate === undefined
                          ? ''
                          : expiryDate === null
                            ? ES.dates.noDate
                            : ES.collection.expiresTag(formatExpiryDay(expiryDate, today)),
                      ]
                        .filter((t) => t !== '')
                        .map((t) => (
                          <Etiqueta key={t} text={t} />
                        ))}
                    </View>
                  </View>
                </View>
                {photos.length > 0 ? (
                  <View style={{ flexDirection: 'row', gap: scale.rowGap / 2 }}>
                    {photos.map((p, i) => (
                      <Image
                        key={p.fileId}
                        source={{ uri: p.uri }}
                        accessibilityLabel={ES.collection.photo.thumb(i + 1)}
                        style={{ width: scale.space * 3, height: scale.space * 3, borderRadius: scale.space / 2 }}
                      />
                    ))}
                  </View>
                ) : null}
              </Tarjeta>
              <Tarjeta>
                <Rotulo text={ES.collection.when} />
                <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                  {formatSlot(day, at, today, true)}
                </Text>
              </Tarjeta>
              <Tarjeta>
                <Rotulo text={ES.collection.where} />
                <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
                  {storeAddressLine(address)}
                </Text>
              </Tarjeta>
              <TextInput
                value={note}
                onChangeText={setNote}
                editable={!button.waiting}
                placeholder={ES.collection.notePlaceholder}
                placeholderTextColor={PALETTE.tintaApagada}
                multiline
                style={{
                  minHeight: scale.tapTarget,
                  paddingHorizontal: scale.space,
                  paddingVertical: scale.rowGap,
                  borderRadius: scale.space / 2,
                  borderWidth: 1,
                  borderColor: PALETTE.linea,
                  backgroundColor: PALETTE.superficie,
                  fontSize: scale.bodySize,
                  color: PALETTE.tinta,
                }}
              />
              {error === null ? null : (
                <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>{error}</Text>
              )}
            </>
          ) : null}
        </ScrollView>
      )}

      {choosing ? null : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: scale.space,
            padding: scale.space,
            borderTopWidth: 1,
            borderTopColor: PALETTE.linea,
            backgroundColor: PALETTE.banda,
          }}
        >
          {paso === 'que' || button.waiting ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ES.collection.back}
              onPress={() => setPaso(paso === 'revisar' ? 'cuando' : 'que')}
              style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
                {ES.collection.back}
              </Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            {paso === 'que' ? (
              <BotonLleno label={ES.collection.next.que} variante="principal" off={!ready} onPress={() => setPaso('cuando')} />
            ) : paso === 'cuando' ? (
              <BotonLleno
                label={ES.collection.next.cuando}
                variante="principal"
                off={!slotOk}
                onPress={() => setPaso('revisar')}
              />
            ) : (
              <BotonLleno
                label={button.label}
                variante="principal"
                busy={button.busy}
                off={!slotOk || !ready}
                onPress={() => void save()}
              />
            )}
          </View>
        </View>
      )}

      <Calendario
        open={dating}
        title={ES.waste.pickExpiry}
        chosen={expiryDate ?? null}
        from={addDays(today, -30) ?? today}
        to={addDays(today, 60) ?? today}
        today={today}
        onChoose={(d) => {
          setExpiryDate(d);
          setDating(false);
        }}
        onClose={() => setDating(false)}
      />
    </View>
  );
}

/** *Caduca* — sin fecha, hoy, mañana, or a day from the calendar. */
/**
 * *📷 Otra foto* — the owner's canvas: a thumbnail per photo, then the camera.
 * ⚠️ A TAP ON A THUMBNAIL TAKES IT OUT, and the cross on it says so; it is one
 * photo, retaken in a second. At `MAX_PHOTOS` the camera button goes away.
 */
function Fotos({
  photos,
  note,
  onAdd,
  onRemove,
}: {
  photos: readonly LocalPhoto[];
  note: string | null;
  onAdd: () => void;
  onRemove: (fileId: string) => void;
}) {
  const { scale } = useDensity();
  const side = scale.space * 4;
  return (
    <View style={{ gap: scale.rowGap / 2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: scale.rowGap }}>
        {photos.map((p, i) => (
          <Pressable
            key={p.fileId}
            accessibilityRole="button"
            accessibilityLabel={`${ES.collection.photo.thumb(i + 1)}. ${ES.collection.photo.remove}`}
            onPress={() => onRemove(p.fileId)}
            style={{ width: side, height: side, borderRadius: scale.space * 0.75, overflow: 'hidden', borderWidth: 1, borderColor: PALETTE.linea }}
          >
            <Image source={{ uri: p.uri }} style={{ width: side, height: side }} />
            <View
              style={{
                position: 'absolute',
                top: scale.rowGap / 4,
                right: scale.rowGap / 4,
                borderRadius: scale.space,
                backgroundColor: PALETTE.superficie,
              }}
            >
              <MaterialCommunityIcons name="close" size={scale.iconSize * 0.7} color={PALETTE.desperdicio} />
            </View>
          </Pressable>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAdd}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: scale.rowGap / 2,
              minHeight: side,
              paddingHorizontal: scale.space,
              borderRadius: scale.space * 0.75,
              borderWidth: 1,
              borderColor: PALETTE.desperdicio,
              backgroundColor: PALETTE.desperdicioSuave,
            }}
          >
            <MaterialCommunityIcons name="camera-outline" size={scale.iconSize} color={PALETTE.desperdicio} />
            <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.desperdicio }}>
              {photos.length === 0 ? ES.collection.photo.take : ES.collection.photo.another}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {note !== null ? <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{note}</Text> : null}
    </View>
  );
}

function Caduca({
  today,
  value,
  onPick,
  onOther,
}: {
  today: string;
  value: string | null | undefined;
  onPick: (day: string | null) => void;
  onOther: () => void;
}) {
  const tomorrow = addDays(today, 1);
  const named = value === undefined || value === null || value === today || value === tomorrow;
  return (
    <Pregunta title={ES.collection.expiry}>
      <Opcion label={ES.dates.noDate} on={value === null} onPress={() => onPick(null)} />
      <Opcion label={ES.dates.relative.today} on={value === today} onPress={() => onPick(today)} />
      <Opcion label={ES.dates.relative.tomorrow} on={value !== undefined && value === tomorrow} onPress={() => onPick(tomorrow)} />
      <Opcion
        label={named ? ES.waste.otherDay : formatExpiryDay(value ?? null, today)}
        on={!named}
        drop
        onPress={onOther}
      />
    </Pregunta>
  );
}

/**
 * *¿Qué día pasamos?* and *¿A qué hora?* — the owner's one quarter of an hour.
 * ⚠️⚠️ OPTION A, HIS CHOICE OF 2026-10-16: every start of the chosen day that
 * can still be booked, ONE TAP each, four to a row, under the part of the day it
 * falls in. ⚠️ A START LESS THAN FIVE HOURS AWAY IS NOT DRAWN AT ALL
 * (`pickupBands`, `0061`'s rule), and today's tile is inert once nothing is left
 * of it. Nothing is chosen until she taps.
 */
function Cuando({
  today,
  clock,
  day,
  at,
  onDay,
  onAt,
  slot,
}: {
  today: string;
  clock: string;
  day: string | null;
  at: string | null;
  onDay: (day: string) => void;
  onAt: (at: string) => void;
  slot: string | null;
}) {
  const { scale } = useDensity();
  const bands = day === null ? [] : pickupBands(day, today, clock);

  return (
    <>
      <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>{ES.collection.whichDay}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: scale.rowGap }}>
        {pickupDays(today).map((d) => {
          const tile = formatDayTile(d, today);
          const on = d === day;
          const inert = d === today && !dayBookable(d, today, clock);
          if (tile === null) return null;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: inert }}
              accessibilityLabel={`${tile.top} ${tile.num}`}
              disabled={inert}
              onPress={() => onDay(d)}
              style={{
                minWidth: scale.tapTarget * 1.25,
                paddingVertical: scale.rowGap,
                alignItems: 'center',
                gap: scale.rowGap / 4,
                borderRadius: scale.space,
                borderWidth: on ? 2 : 1,
                borderColor: on ? PALETTE.desperdicio : PALETTE.linea,
                backgroundColor: on ? PALETTE.desperdicio : PALETTE.superficie,
                opacity: inert ? 0.4 : 1,
              }}
            >
              <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: on ? PALETTE.superficie : PALETTE.tintaApagada }}>
                {tile.top}
              </Text>
              <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: on ? PALETTE.superficie : PALETTE.tinta }}>
                {tile.num}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>{ES.collection.whichTime}</Text>
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.collection.leadHint}</Text>
      {bands.map((b) => {
        // ⚠️ FOUR TO A ROW, AND A SHORT LAST ROW IS PADDED so its chips keep
        // the columns of the rows above rather than stretching across.
        const rows: (string | null)[][] = [];
        for (let i = 0; i < b.starts.length; i += 4) {
          const row: (string | null)[] = b.starts.slice(i, i + 4);
          while (row.length < 4) row.push(null);
          rows.push(row);
        }
        return (
          <View key={b.band} style={{ gap: scale.rowGap / 2 }}>
            <Rotulo text={ES.collection.bands[b.band]} />
            {rows.map((row) => (
              <View key={row[0] ?? ''} style={{ flexDirection: 'row', gap: scale.rowGap }}>
                {row.map((start, i) =>
                  start === null ? (
                    <View key={`hueco-${i}`} style={{ flex: 1 }} />
                  ) : (
                    <Opcion key={start} label={formatClock(start)} on={start === at} grow onPress={() => onAt(start)} />
                  ),
                )}
              </View>
            ))}
          </View>
        );
      })}

      {slot === null ? null : (
        <View
          style={{
            gap: scale.rowGap / 4,
            padding: scale.space,
            borderRadius: scale.space,
            backgroundColor: PALETTE.desperdicioSuave,
          }}
        >
          <Rotulo text={ES.collection.weCome} ink={PALETTE.desperdicio} />
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.desperdicio }}>{slot}</Text>
        </View>
      )}
    </>
  );
}

/** The three steps, as a bar over the form — the owner's drawing. */
function Pasos({ at }: { at: number }) {
  const { scale } = useDensity();
  return (
    <View style={{ flexDirection: 'row', gap: scale.rowGap, paddingHorizontal: scale.space, paddingTop: scale.space }}>
      {ES.collection.steps.map((label, i) => (
        <View key={label} style={{ flex: 1, gap: scale.rowGap / 2 }}>
          <View
            style={{
              height: scale.rowGap / 2,
              borderRadius: scale.rowGap / 4,
              backgroundColor: i <= at ? PALETTE.desperdicio : PALETTE.linea,
            }}
          />
          <Text
            style={{
              fontSize: scale.smallSize,
              fontWeight: '700',
              color: i <= at ? PALETTE.desperdicio : PALETTE.tintaApagada,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * ⚠️⚠️ THE BAND THAT SAYS THE ANSWERS BELOW ARE THE LAST REQUEST'S — the owner's
 * standing rule that a proposal must not look decided.
 */
function Prefilled({ inset = true }: { inset?: boolean }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        marginHorizontal: inset ? scale.space : 0,
        marginTop: inset ? scale.space : 0,
        paddingHorizontal: scale.space,
        paddingVertical: scale.rowGap,
        borderRadius: scale.space / 2,
        backgroundColor: PALETTE.desperdicioSuave,
      }}
    >
      <MaterialCommunityIcons name="history" size={scale.iconSize} color={PALETTE.desperdicio} />
      <Text style={{ flex: 1, fontSize: scale.smallSize, color: PALETTE.desperdicio }}>{ES.collection.prefilled}</Text>
    </View>
  );
}

/**
 * The shop's requests, newest first, with their status — and *Cancelar* on an
 * `enviada` one, asked twice in place: a request called off cannot be sent
 * again (`0059`), so the second tap is the confirmation.
 */
function Solicitudes({ requests, mayCancel }: { requests: readonly CollectionRequest[]; mayCancel: boolean }) {
  const { scale } = useDensity();
  const today = isoDay(new Date());
  const { cancel, busy } = useCancelCollection();
  const [asking, setAsking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (requests.length === 0) return null;
  return (
    <View style={{ gap: scale.rowGap }}>
      <Rotulo text={ES.collection.yours} />
      {requests.map((r) => (
        <View
          key={r.id}
          style={{
            gap: scale.rowGap / 2,
            padding: scale.space,
            borderRadius: scale.space,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            backgroundColor: PALETTE.superficie,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap }}>
            <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
              <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{requestTitle(r)}</Text>
              <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
                {formatSlot(r.day, r.from, today)}
              </Text>
            </View>
            <Estado status={r.status} />
          </View>
          {mayCancel && r.cancellable ? (
            asking === r.id ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.space }}>
                <Text style={{ flex: 1, fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
                  {ES.collection.cancelAsk}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ES.collection.cancelNo}
                  onPress={() => setAsking(null)}
                  style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
                    {ES.collection.cancelNo}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ES.collection.cancelYes}
                  disabled={busy}
                  onPress={() => {
                    setError(null);
                    void cancel(r.id).then((failure) => {
                      setAsking(null);
                      setError(failure);
                    });
                  }}
                  style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.error }}>
                    {ES.collection.cancelYes}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${ES.collection.cancel} ${requestTitle(r)}`}
                onPress={() => setAsking(r.id)}
                style={{ alignSelf: 'flex-end', minHeight: scale.tapTarget, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
                  {ES.collection.cancel}
                </Text>
              </Pressable>
            )
          ) : null}
        </View>
      ))}
      {error === null ? null : (
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>{error}</Text>
      )}
    </View>
  );
}

/**
 * A request's status. ⚠️ `R11`: THE WORD IS ALWAYS THERE — the colour only
 * groups them: Wera's answers filled, the shop's own call grey, a refusal red.
 */
function Estado({ status }: { status: CollectionStatus }) {
  const { scale } = useDensity();
  const look: Readonly<Record<CollectionStatus, { ground: string; ink: string }>> = {
    enviada: { ground: PALETTE.desperdicioSuave, ink: PALETTE.desperdicio },
    confirmada: { ground: PALETTE.desperdicio, ink: PALETTE.superficie },
    recogida: { ground: PALETTE.accionSuave, ink: PALETTE.accion },
    cancelada: { ground: PALETTE.fondo, ink: PALETTE.tintaApagada },
    rechazada: { ground: PALETTE.fondo, ink: PALETTE.error },
  };
  return (
    <View
      style={{
        paddingHorizontal: scale.rowGap,
        paddingVertical: scale.rowGap / 4,
        borderRadius: scale.space,
        backgroundColor: look[status].ground,
      }}
    >
      <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: look[status].ink }}>
        {ES.collection.statuses[status]}
      </Text>
    </View>
  );
}

// ============================================================================
// The furniture both halves draw
// ============================================================================

function newestFirst(requests: readonly CollectionRequest[]): readonly CollectionRequest[] {
  return [...requests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** A white card on the screen's ground — the drawing's. */
function Tarjeta({ children }: { children: ReactNode }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        gap: scale.space,
        padding: scale.space,
        borderRadius: scale.space,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      {children}
    </View>
  );
}

/** A small heading over a group — `¿CÓMO ESTÁ?`, `CUÁNDO`. */
function Rotulo({ text, ink = PALETTE.tintaApagada }: { text: string; ink?: string }) {
  const { scale } = useDensity();
  return (
    <Text
      style={{
        fontSize: scale.smallSize,
        fontWeight: '700',
        color: ink,
        textTransform: 'uppercase',
        letterSpacing: scale.rowGap / 8,
      }}
    >
      {text}
    </Text>
  );
}

/** A heading and its chips, wrapped. */
function Pregunta({ title, children }: { title: string; children: ReactNode }) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap / 2 }}>
      <Rotulo text={title} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap }}>{children}</View>
    </View>
  );
}

/**
 * One choice. ⚠️ `R11`: CHOSEN IS FILLED, BOLDER AND THICKER-EDGED, never a hue
 * alone. `drop` adds the chevron of a chip that opens something; `inert` is a
 * choice that cannot be made (a quarter already begun), drawn faded and said.
 */
function Opcion({
  label,
  on,
  onPress,
  drop = false,
  grow = false,
  inert = false,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  drop?: boolean;
  grow?: boolean;
  inert?: boolean;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: inert }}
      accessibilityLabel={label}
      disabled={inert}
      onPress={onPress}
      style={{
        flexGrow: grow ? 1 : 0,
        flexBasis: grow ? 0 : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale.rowGap / 4,
        minHeight: scale.tapTarget,
        paddingHorizontal: grow ? scale.rowGap / 2 : scale.space,
        borderRadius: scale.tapTarget / 2,
        borderWidth: on ? 2 : 1,
        borderColor: on ? PALETTE.desperdicio : PALETTE.linea,
        backgroundColor: on ? PALETTE.desperdicio : PALETTE.superficie,
        opacity: inert ? 0.4 : 1,
      }}
    >
      <Text
        numberOfLines={1}
        style={{ fontSize: scale.smallSize, fontWeight: on ? '700' : '600', color: on ? PALETTE.superficie : PALETTE.tinta }}
      >
        {label}
      </Text>
      {drop ? (
        <MaterialCommunityIcons
          name="chevron-down"
          size={scale.iconSize * 0.75}
          color={on ? PALETTE.superficie : PALETTE.desperdicio}
        />
      ) : null}
    </Pressable>
  );
}

/** A tag on the review card — what she answered, read back. */
function Etiqueta({ text }: { text: string }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        paddingHorizontal: scale.rowGap,
        paddingVertical: scale.rowGap / 4,
        borderRadius: scale.space,
        backgroundColor: PALETTE.desperdicioSuave,
      }}
    >
      <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.desperdicio }}>{text}</Text>
    </View>
  );
}

/**
 * ⚠️ `Otra…`'s CALENDAR, MONDAY FIRST — both halves' *other day*: an expiry on
 * Tirar's line, an expiry on Te lo compro's product. The grid is
 * `calendarMonths`', so the arithmetic is a pure module's (`R3`); this only
 * draws it. Closing chooses nothing.
 */
function Calendario({
  open,
  title,
  chosen,
  from,
  to,
  today,
  onChoose,
  onClose,
}: {
  open: boolean;
  title: string;
  chosen: string | null;
  from: string;
  to: string;
  today: string;
  onChoose: (day: string) => void;
  onClose: () => void;
}) {
  const { scale } = useDensity();
  const heads = weekdayInitials();
  // ⚠️ IT OPENS ON THE MONTH OF THE DAY CHOSEN, OR OF TODAY — measured on the
  // emulator: opened at the range's first month, *today* was two screens down.
  const target = (chosen ?? today).slice(0, 7);
  const scroller = useRef<ScrollView>(null);
  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Velo label={ES.collection.close} onPress={onClose} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale.space }}>
          <View
            style={{
              width: '100%',
              maxHeight: '80%',
              borderRadius: scale.space,
              backgroundColor: PALETTE.fondo,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: scale.rowGap,
                padding: scale.space,
                borderBottomWidth: 1,
                borderBottomColor: PALETTE.linea,
              }}
            >
              <Text style={{ flex: 1, fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ES.collection.close}
                onPress={onClose}
                style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
                  {ES.collection.close}
                </Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: scale.space, paddingTop: scale.rowGap }}>
              {heads.map((h, i) => (
                <Text
                  key={`${h}${i}`}
                  style={{ flex: 1, textAlign: 'center', fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}
                >
                  {h}
                </Text>
              ))}
            </View>
            <ScrollView ref={scroller} contentContainerStyle={{ padding: scale.space, gap: scale.space }}>
              {calendarMonths(from, to).map((month) => {
                const weeks: (string | null)[][] = [];
                for (let i = 0; i < month.cells.length; i += 7) {
                  const week = month.cells.slice(i, i + 7);
                  while (week.length < 7) week.push(null);
                  weeks.push(week);
                }
                return (
                  <View
                    key={month.key}
                    style={{ gap: scale.rowGap / 2 }}
                    onLayout={
                      month.key === target
                        ? (e) => scroller.current?.scrollTo({ y: e.nativeEvent.layout.y, animated: false })
                        : undefined
                    }
                  >
                    <Rotulo text={month.title} />
                    {weeks.map((week, w) => (
                      <View key={w} style={{ flexDirection: 'row' }}>
                        {week.map((d, i) =>
                          d === null ? (
                            <View key={i} style={{ flex: 1, minHeight: scale.tapTarget }} />
                          ) : (
                            <Pressable
                              key={d}
                              accessibilityRole="button"
                              accessibilityState={{ selected: d === chosen }}
                              accessibilityLabel={formatExpiryDay(d, today)}
                              onPress={() => onChoose(d)}
                              style={{
                                flex: 1,
                                minHeight: scale.tapTarget,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: scale.tapTarget / 2,
                                borderWidth: d === today ? 1 : 0,
                                borderColor: PALETTE.desperdicio,
                                backgroundColor: d === chosen ? PALETTE.desperdicio : PALETTE.fondo,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: scale.bodySize,
                                  fontWeight: d === chosen || d === today ? '700' : '400',
                                  color: d === chosen ? PALETTE.superficie : PALETTE.tinta,
                                }}
                              >
                                {String(Number(d.slice(8, 10)))}
                              </Text>
                            </Pressable>
                          ),
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}
