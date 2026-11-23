import { router } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addressComplete } from '@/api/collection';
import { useCollectionReaches, useMyRole, useSales, useStoreAddresses, useWorkspaceMembers } from '@/api/hooks';
import { useReduceMotion } from '@/lib/movimiento';
import { deviceStore, writeKey } from '@/lib/store';
import { TE_LO_COMPRO, recorridoPrometeTeLoCompro } from '@/navigation/pausa';
import { TAP_SLOP, cardMs, destino, esUltima, gestoDe, recorridoDe, type Tarjeta } from '@/navigation/recorrido';
import { marcarHistoria } from '@/offline/ensenar';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { TITULO } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// CONOCE WERA — the tutorial, as a story like *Tu semana*. Plan task `8g`, the
// owner's ruling of 2026-10-21 (*"Go with A and D1, your recommendations"*).
// Which cards and when it opens by itself are `@/navigation/recorrido`'s.
//
// ⚠️ THE PICTURES ARE THE APP'S REAL SCREENS, taken on the iPhone simulator from
// an invented local shop (*Verdulería Lupita*) with his catalog photos — no real
// shop's data. A screen that changes makes its picture stale; nothing checks it.
// ⚠️ `merma.jpg` WAS RETAKEN AT `10.0a` (2026-10-27): the doors, Te lo compro's
// among them, became Tirar — what Merma is for every role while it is paused.
// Both Merma cards, the owner's and the Empleado's, show it.
// ⚠️ `costos.jpg` WAS RETAKEN AT `5R-t` (2026-11-23), when Costos gained
// *Cuánto ha cambiado*: the same simulator at 8:45, halved to 600 × 1304, on
// *Pollo entero* of an invented local pollería (*Pollería y Recaudería La Güera*,
// `docs/runbooks/demo-polleria.sql` run on the local stack) — no real shop's data.
//
// ⚠️⚠️ WHAT NO CHECK CAN SEE — `R9`: whether six seconds a card is enough for her
// to read, whether the finger on the Vender card reads as a hand, and whether a
// thumb finds *Saltar*. The instrument is the owner's phone and the emulator.
// ============================================================================

/** The real screens, as the app bundles them. */
const SCREENS = {
  vender0: require('@/marca/recorrido/vender0.jpg') as ImageSourcePropType,
  vender: require('@/marca/recorrido/vender.jpg') as ImageSourcePropType,
  costos: require('@/marca/recorrido/costos.jpg') as ImageSourcePropType,
  ficha: require('@/marca/recorrido/ficha.jpg') as ImageSourcePropType,
  merma: require('@/marca/recorrido/merma.jpg') as ImageSourcePropType,
  numeros: require('@/marca/recorrido/numeros.jpg') as ImageSourcePropType,
  ultimo: require('@/marca/recorrido/ultimo.jpg') as ImageSourcePropType,
};

/** The pictures are 600 × 1304, the simulator's 1206 × 2622 halved. */
const SCREEN_RATIO = 1206 / 2622;

/** `5R-t`: a swiped-to card comes in from this share of the screen's width… */
const ENTRADA = 0.3;
/** …and past the first card or the last, the card follows the finger this little. */
const BORDE = 0.3;

/** Where on the Vender picture the finger goes, as fractions of the picture. */
const FINGER = {
  plus: { x: 0.906, y: 0.454 },
  slideFrom: { x: 0.37, y: 0.854 },
  slideTo: { x: 0.9, y: 0.854 },
};

/** A card's picture: which, and which part of it — `descubre` is Números' lower half. */
interface Picture {
  readonly source: ImageSourcePropType;
  readonly from: number;
  readonly moving?: boolean;
}

const PICTURE: Partial<Record<Tarjeta, Picture>> = {
  vender: { source: SCREENS.vender, from: 0, moving: true },
  comprar: { source: SCREENS.costos, from: 0 },
  productos: { source: SCREENS.ficha, from: 0 },
  merma: { source: SCREENS.merma, from: 0 },
  numeros: { source: SCREENS.numeros, from: 0 },
  descubre: { source: SCREENS.numeros, from: 0.42 },
  venderEmpleado: { source: SCREENS.vender, from: 0, moving: true },
  sinSenal: { source: SCREENS.vender, from: 0 },
  corrige: { source: SCREENS.ultimo, from: 0 },
  mermaEmpleado: { source: SCREENS.merma, from: 0 },
};

const GROUND: Record<Tarjeta, string> = {
  hola: PALETTE.marca,
  vender: PALETTE.accion,
  comprar: PALETTE.compra,
  productos: PALETTE.accion,
  merma: PALETTE.desperdicio,
  numeros: PALETTE.tinta,
  descubre: PALETTE.marca,
  listo: PALETTE.accion,
  venderEmpleado: PALETTE.accion,
  comprarEmpleado: PALETTE.compra,
  sinSenal: PALETTE.tinta,
  corrige: PALETTE.compra,
  mermaEmpleado: PALETTE.desperdicio,
};

export default function Recorrido() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const members = useWorkspaceMembers();
  const role = useMyRole();
  const known = members.data !== undefined || members.isError;
  const cards = recorridoDe(role);
  const { sales } = useSales();
  const teLoCompro = useTeLoComproLlega();
  const reduce = useReduceMotion();
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const pausedAt = useRef(0);
  // ⚠️ `5R-t`: the card's words and picture follow a swiping finger across.
  const slide = useRef(new Animated.Value(0)).current;
  /** Which side the next card comes in from: 1 the right, −1 the left, 0 no slide. */
  const entering = useRef<-1 | 0 | 1>(0);

  // ⚠️ OPENING IT IS SEEING IT: this story never opens by itself again on this
  // phone. ⚠️ `5R-n`: THE STORY OF HER ROLE, marked once the roster has said
  // which it is — the other story still opens the first time she has that role.
  useEffect(() => {
    if (known) marcarHistoria(deviceStore(), role);
  }, [known, role]);

  const card = cards[Math.min(index, cards.length - 1)] ?? 'hola';
  const last = esUltima(cards, index);
  const hasSales = sales.state === 'sales';
  // ⚠️ READ WHEN A CARD STARTS, NOT WATCHED: the store's address answers late,
  // and a card whose length changed under it would start again from nothing.
  const words = textoDe(card, teLoCompro, hasSales);
  const ms = cardMs(`${words.title} ${words.line}`, PICTURE[card] !== undefined);
  const duration = useRef(ms);
  // ⚠️ DECLARED BEFORE THE TIMER'S EFFECT, so a new card's timer reads its own length.
  useEffect(() => {
    duration.current = ms;
  }, [ms]);

  // ⚠️⚠️ `5R-t`: WHAT THE TIMER AND THE FINGER READ, REFRESHED ON EVERY RENDER.
  // A `PanResponder` keeps the handlers of the render it was built in
  // ([[a-panresponder-keeps-its-first-handlers]]), and a timer that took `last`
  // and the card count as dependencies was rebuilt — and its card started again
  // from nothing — whenever the roster's read landed in the middle of a card.
  const now = useRef({ index, count: cards.length, last, width, reduce });
  now.current = { index, count: cards.length, last, width, reduce };

  const run = useCallback(
    (from: number) => {
      progress.setValue(from);
      if (now.current.last) {
        progress.setValue(1);
        return;
      }
      Animated.timing(progress, {
        toValue: 1,
        duration: Math.max(0, (1 - from) * duration.current),
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setIndex((i) => Math.min(i + 1, now.current.count - 1));
      });
    },
    [progress],
  );

  // ⚠️⚠️ EVERY CARD'S BAR STARTS FROM ZERO, AND ONLY WHEN THE CARD CHANGES (or the
  // roster first says whose story this is). Nothing else restarts it.
  useEffect(() => {
    if (!known) return undefined;
    run(0);
    return () => progress.stopAnimation();
  }, [index, known, run, progress]);

  // ⚠️ A CARD SWIPED TO COMES IN FROM THE SIDE THE FINGER WAS GOING — set before
  // the frame is drawn, so the old card never flashes at the new card's place.
  // A tap and the timer move it at once, as they always have.
  useLayoutEffect(() => {
    const from = entering.current;
    entering.current = 0;
    if (from === 0 || now.current.reduce) {
      slide.setValue(0);
      return;
    }
    slide.setValue(from * now.current.width * ENTRADA);
    Animated.spring(slide, { toValue: 0, speed: 24, bounciness: 0, useNativeDriver: false }).start();
  }, [index, slide]);

  /** The finger lifted: one decision (`gestoDe`), then one move or one resume. */
  const lift = useRef<(g: PanResponderGestureState, downAt: number) => void>(() => undefined);
  lift.current = (g, downAt) => {
    const s = now.current;
    const gesto = gestoDe({ dx: g.dx, dy: g.dy, vx: g.vx, ms: Date.now() - downAt, x: g.x0, width: s.width });
    const to = destino(s.index, s.count, gesto);
    if (to === null) {
      Animated.spring(slide, { toValue: 0, speed: 24, bounciness: 0, useNativeDriver: false }).start();
      run(pausedAt.current);
      return;
    }
    const swiped = Math.abs(g.dx) > TAP_SLOP;
    entering.current = swiped ? (to > s.index ? 1 : -1) : 0;
    progress.stopAnimation();
    setIndex(to);
  };

  const downAt = useRef(0);
  const finger = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // ⚠️ A swipe that starts on *Ir a vender* is still a swipe: the button lets go.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > TAP_SLOP && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        downAt.current = Date.now();
        progress.stopAnimation((v) => {
          pausedAt.current = v;
        });
      },
      onPanResponderMove: (_e, g) => {
        const s = now.current;
        if (s.reduce || Math.abs(g.dx) <= Math.abs(g.dy)) return;
        // Past the first card or the last, the finger pulls it only a little.
        const edge = destino(s.index, s.count, g.dx < 0 ? 'adelante' : 'atras') === null;
        slide.setValue(edge ? g.dx * BORDE : g.dx);
      },
      onPanResponderRelease: (_e, g) => lift.current(g, downAt.current),
      onPanResponderTerminate: (_e, g) => lift.current({ ...g, dx: 0, dy: 0, vx: 0 }, 0),
    }),
  ).current;

  const ground = GROUND[card];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: ground,
        paddingTop: insets.top + scale.space,
        paddingBottom: insets.bottom + scale.space,
      }}
    >
      {known ? (
        <>
          <View style={{ flexDirection: 'row', gap: scale.rowGap / 2, paddingHorizontal: scale.space }}>
            {cards.map((c, i) => (
              // ⚠️ THE DIM TRACK IS ITS OWN LAYER, BEHIND A FULL-WHITE FILL. Until
              // 2026-10-22 the whole bar was dimmed and its fill sat inside the
              // dimming, the same white as the track — so it filled unseen, and
              // the owner read *"the time bar at the top is not moving"*.
              <View
                key={c}
                style={{ flex: 1, height: scale.rowGap / 2, borderRadius: scale.rowGap, overflow: 'hidden' }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: PALETTE.superficie,
                    opacity: 0.35,
                  }}
                />
                {i < index ? (
                  <View style={{ height: '100%', width: '100%', backgroundColor: PALETTE.superficie }} />
                ) : i === index ? (
                  <Animated.View
                    style={{
                      height: '100%',
                      backgroundColor: PALETTE.superficie,
                      width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    }}
                  />
                ) : null}
              </View>
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: scale.space,
            }}
          >
            <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.superficie }}>
              {ES.recorrido.label(index + 1, cards.length)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={{ minHeight: scale.tapTarget, minWidth: scale.tapTarget, alignItems: 'flex-end', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.superficie }}>{ES.recorrido.skip}</Text>
            </Pressable>
          </View>
          <Animated.View
            // ⚠️ A TAP MOVES IT, as *Tu semana*'s does: the left third back, the
            // rest on — and since `5R-t` A SWIPE DOES TOO: left to the next card,
            // right to the one before. A finger held down holds the card. One
            // handler decides as the finger lifts (`gestoDe`), so a quick tap can
            // no longer move the card AND resume the old card's bar on the new
            // one. ⚠️ The screen's x (`x0`), not the touched view's: measured from
            // whatever the finger landed on, a tap left of the picture went
            // forward on the emulator.
            {...finger.panHandlers}
            style={{
              flex: 1,
              paddingHorizontal: scale.space * 1.5,
              paddingTop: scale.space,
              gap: scale.space,
              transform: [{ translateX: slide }],
            }}
          >
            <Contenido card={card} last={last} words={words} />
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

/**
 * *Te lo compro* is promised unless Wera already knows it cannot reach this
 * store — ⚠️ and never while it is paused (`10.0a`, `@/navigation/pausa`).
 */
function useTeLoComproLlega(): boolean {
  const { data } = useStoreAddresses();
  const address = data === undefined || data.length === 0 ? null : data[0] ?? null;
  const complete = addressComplete(address);
  const reaches = useCollectionReaches(complete && address !== null ? address.postalCode : '');
  return recorridoPrometeTeLoCompro(TE_LO_COMPRO, complete && reaches === false);
}

/** A card's two lines as shown: Merma's *Te lo compro* where it reaches, the last title by history. */
function textoDe(card: Tarjeta, teLoCompro: boolean, hasSales: boolean): { title: string; line: string } {
  const words = ES.recorrido.cards[card];
  if (card === 'listo') return { title: hasSales ? ES.recorrido.listoVendiendo : words.title, line: words.line };
  if (card === 'merma' && teLoCompro) return { title: words.title, line: `${words.line} ${ES.recorrido.teLoCompro}` };
  return { title: words.title, line: words.line };
}

function Contenido({
  card,
  last,
  words,
}: {
  card: Tarjeta;
  last: boolean;
  words: { title: string; line: string };
}) {
  const { scale } = useDensity();

  if (card === 'hola') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale.space }}>
        <Image
          source={require('@/marca/vaca-crema.png') as ImageSourcePropType}
          accessible={false}
          style={{ width: scale.tapTarget * 2.4, height: scale.tapTarget * 2.4 }}
          resizeMode="contain"
        />
        <Titulo center>{words.title}</Titulo>
        <Linea center>{words.line}</Linea>
      </View>
    );
  }

  if (card === 'listo') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', gap: scale.space }}>
        <Titulo>{words.title}</Titulo>
        <Linea>{words.line}</Linea>
        <IrAVender />
      </View>
    );
  }

  const picture = PICTURE[card];
  return (
    <>
      <Titulo>{words.title}</Titulo>
      <Linea>{words.line}</Linea>
      {picture === undefined ? null : <Pantalla picture={picture} />}
      {/* ⚠️ The Empleado's story ends on its Merma card: the way out is on whichever card is last. */}
      {last ? <IrAVender /> : null}
    </>
  );
}

/** The way out of the story's last card — to Vender, where the work is. */
function IrAVender() {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.dismissTo('/vender')}
      style={{
        minHeight: scale.tapTarget,
        marginTop: scale.space,
        borderRadius: scale.space * 0.75,
        backgroundColor: PALETTE.superficie,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.accion }}>{ES.recorrido.goSell}</Text>
    </Pressable>
  );
}

/**
 * The real screen, whole, in the room left under the words — or, for
 * *Descubre*, the part of it from `from` down. On the Vender card it moves (D1).
 */
function Pantalla({ picture }: { picture: Picture }) {
  const { scale } = useDensity();
  const [room, setRoom] = useState<{ width: number; height: number } | null>(null);
  const shown = 1 - picture.from;
  let frame: { width: number; height: number } | null = null;
  if (room !== null) {
    // The picture's width at the room's height, or the room's width if narrower.
    const byHeight = (room.height / shown) * SCREEN_RATIO;
    const width = Math.min(byHeight, room.width * 0.82);
    frame = { width, height: (width / SCREEN_RATIO) * shown };
  }
  return (
    <View
      style={{ flex: 1, alignItems: 'center', paddingBottom: scale.space }}
      onLayout={(e: LayoutChangeEvent) =>
        setRoom({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height - scale.space })
      }
    >
      {frame === null ? null : (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={ES.recorrido.screen}
          style={{
            width: frame.width,
            height: frame.height,
            borderRadius: scale.space,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: PALETTE.superficie,
            backgroundColor: PALETTE.superficie,
          }}
        >
          {picture.moving ? (
            <Movimiento width={frame.width} />
          ) : (
            <Image
              source={picture.source}
              style={{
                position: 'absolute',
                left: 0,
                width: frame.width,
                height: frame.width / SCREEN_RATIO,
                top: -(frame.width / SCREEN_RATIO) * picture.from,
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

/**
 * D1 — two real Vender screens and a finger: two taps on Acelga's +, the basket
 * fills, the finger slides *Cobrar*, and again. ⚠️ `transform` and `opacity`
 * only, on the native driver, STARTED IN AN EFFECT once the picture is mounted
 * (a native animation started before its view exists fails without a word).
 * With *reduce motion* on, the full basket stands still and there is no finger.
 */
function Movimiento({ width }: { width: number }) {
  const { scale } = useDensity();
  const reduce = useReduceMotion();
  const height = width / SCREEN_RATIO;
  const basket = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const x = useRef(new Animated.Value(FINGER.plus.x * width)).current;
  const y = useRef(new Animated.Value(FINGER.plus.y * height)).current;
  const press = useRef(new Animated.Value(1)).current;
  const seen = useRef(new Animated.Value(0)).current;
  const r = scale.iconSize / 2;

  useEffect(() => {
    if (reduce) {
      basket.setValue(1);
      seen.setValue(0);
      return undefined;
    }
    const at = (p: { x: number; y: number }, ms: number) =>
      Animated.parallel([
        Animated.timing(x, { toValue: p.x * width, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: p.y * height, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]);
    const tap = Animated.sequence([
      Animated.timing(press, { toValue: 0.7, duration: 140, useNativeDriver: true }),
      Animated.timing(press, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(220),
    ]);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(basket, { toValue: 0, duration: 1, useNativeDriver: true }),
          at(FINGER.plus, 1),
        ]),
        Animated.timing(seen, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(250),
        tap,
        tap,
        Animated.timing(basket, { toValue: 1, duration: 300, useNativeDriver: true }),
        at(FINGER.slideFrom, 700),
        Animated.timing(press, { toValue: 0.8, duration: 120, useNativeDriver: true }),
        at(FINGER.slideTo, 800),
        Animated.parallel([
          Animated.timing(press, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(seen, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, width, height, basket, x, y, press, seen]);

  return (
    <>
      <Image source={SCREENS.vender0} style={{ position: 'absolute', left: 0, top: 0, width, height }} />
      <Animated.Image
        source={SCREENS.vender}
        style={{ position: 'absolute', left: 0, top: 0, width, height, opacity: basket }}
      />
      {reduce ? null : (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -r,
            top: -r,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            borderWidth: 2,
            borderColor: PALETTE.superficie,
            backgroundColor: PALETTE.marca,
            opacity: Animated.multiply(seen, 0.75),
            transform: [{ translateX: x }, { translateY: y }, { scale: press }],
          }}
        />
      )}
    </>
  );
}

function Titulo({ children, center = false }: { children: string; center?: boolean }) {
  const { scale } = useDensity();
  return (
    <Text style={{ fontSize: scale.titleSize * 1.3, ...TITULO, color: PALETTE.superficie, textAlign: center ? 'center' : 'left' }}>
      {children}
    </Text>
  );
}

function Linea({ children, center = false }: { children: string; center?: boolean }) {
  const { scale } = useDensity();
  return (
    <Text style={{ fontSize: scale.bodySize, color: PALETTE.superficie, textAlign: center ? 'center' : 'left' }}>
      {children}
    </Text>
  );
}
