import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Aviso } from '@/api/push';
import { canalesDe, envioDe, importanciaAndroid, kindDe, rutaDelToque as rutaDelAviso, type Permiso, type RutaDelToque } from '@/lib/avisosPush';
import { PREFIJO, RUTA, rutaDelToque, type Disparo } from '@/lib/recordatorio';
import { ES } from '@/strings';

// ============================================================================
// HER PHONE'S NOTIFICATIONS — THE ONE MODULE THAT ASKS FOR THEM. Plan task `10.5-v-c-ii`:
// her reminder is a notification HER OWN PHONE schedules (`expo-notifications`, in every
// build of this app since `10.2a` — read inside the test builds' binaries on 2026-11-06),
// every week on each of her days at her hour. Nothing about her reminder reaches any server.
// ⚠️ SINCE `10.5b-v-ii` THIS MODULE ALSO ASKS EXPO FOR THE PHONE'S PUSH TOKEN — the second half,
// below the reminders: her kitchen's reservations sent from the database (`0092`), the channels
// made from the kinds the database answers, what the phone allows read back, a message shown
// while the app is in front (SDK 57 shows none otherwise) and a tap that opens what its kind says —
// *Apartados*, or since `10.9h-ii` *Publicar* for the nudge to a kitchen with no offer yet. The
// rules are `@/lib/avisosPush`'s; what is done on each open is `@/lib/useAvisosDelTelefono`'s.
//
// ⚠️ ANDROID 13 ASKS ONLY ONCE A CHANNEL EXISTS, so the channel is made before the
// permission is asked, every time — `setNotificationChannelAsync` is idempotent. Its
// name is what her phone's settings show (*Recordatorio diario*).
// ⚠️ EVERY REMINDER IS SCHEDULED UNDER `PREFIJO`, and scheduling cancels those first, so
// what the phone holds is always exactly her answer, however often it is asked again
// (every launch and every return to the front, `@/lib/RecordatorioProvider`).
// ⚠️ A TAP IS ACTED ON ONCE: the last response is cleared after it opens *Publicar*, so a
// later launch is never sent there again; and only a reminder's own route is followed.
// NO CHECK CAN SEE A NOTIFICATION FIRE (ADR-035 §2.11): the phone over days is the
// instrument, and `test/recordatorio.test.ts` pins what this module is handed.
// ============================================================================

/** The channel her reminders arrive on — Android's, which her phone's settings name. */
export const CANAL = 'recordatorio';

async function asegurarCanal(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: ES.recordatorio.canal,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Whether her phone lets Wera Cocina show a notification now — asking nothing. */
export async function hayPermiso(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * Ask her phone, once she said yes: `'si'`, `'no'` when she declined, `'ajustes'` when the
 * phone will no longer ask — only its settings can turn it on (Android after a second no,
 * an iPhone after the first).
 */
export async function pedirPermiso(): Promise<'si' | 'no' | 'ajustes'> {
  try {
    await asegurarCanal();
    const ahora = await Notifications.getPermissionsAsync();
    if (ahora.granted) return 'si';
    if (!ahora.canAskAgain) return 'ajustes';
    const respuesta = await Notifications.requestPermissionsAsync();
    if (respuesta.granted) {
      concedido();
      return 'si';
    }
    return respuesta.canAskAgain ? 'no' : 'ajustes';
  } catch {
    return 'no';
  }
}

/** Her reminders the phone holds — those scheduled under `PREFIJO`. */
async function nuestros(): Promise<string[]> {
  const todos = await Notifications.getAllScheduledNotificationsAsync();
  return todos.map((n) => n.identifier).filter((id) => id.startsWith(PREFIJO));
}

/**
 * ⚠️ ONE AT A TIME, IN THE ORDER ASKED: a cancel and a schedule both read what the phone
 * holds and then change it, so two that overlap — her kitchen's provider leaving as the
 * next one's arrives — could leave her with none. Every change waits for the last.
 */
let cola: Promise<void> = Promise.resolve();
function enOrden(paso: () => Promise<void>): Promise<void> {
  cola = cola.then(paso, paso);
  return cola;
}

async function quitarAhora(): Promise<void> {
  try {
    for (const id of await nuestros()) await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Nothing she could do; the next launch asks again.
  }
}

/** Cancel every reminder of hers on this phone. */
export function quitarRecordatorios(): Promise<void> {
  return enOrden(quitarAhora);
}

/** Her phone holds exactly these reminders, each every week — the old ones cancelled first. */
export function programarRecordatorios(disparos: readonly Disparo[]): Promise<void> {
  return enOrden(async () => {
    await quitarAhora();
    if (disparos.length === 0) return;
    try {
      await asegurarCanal();
      for (const disparo of disparos) {
        await Notifications.scheduleNotificationAsync({
          identifier: disparo.id,
          content: { title: ES.recordatorio.avisoTitulo, body: ES.recordatorio.avisoTexto, data: { ruta: RUTA } },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            channelId: CANAL,
            weekday: disparo.weekday,
            hour: disparo.hour,
            minute: disparo.minute,
          },
        });
      }
    } catch (falla) {
      console.warn(`[recordatorio] the phone did not schedule it: ${String(falla)}`);
    }
  });
}

/**
 * Open *Publicar* when she taps one of her reminders — the one that opened the app, and
 * every one tapped while it runs. Returns what stops listening.
 */
export function alTocarUnRecordatorio(abrir: (ruta: string) => void): () => void {
  const seguir = (respuesta: Notifications.NotificationResponse | null) => {
    if (respuesta === null) return;
    const { identifier, content } = respuesta.notification.request;
    const ruta = rutaDelToque({ id: identifier, date: respuesta.notification.date, ruta: content.data?.ruta }, Date.now());
    if (ruta === null) return;
    Notifications.clearLastNotificationResponse();
    abrir(ruta);
  };
  try {
    seguir(Notifications.getLastNotificationResponse());
  } catch {
    // An older engine without the synchronous read: the listener below still hears taps.
  }
  const sub = Notifications.addNotificationResponseReceivedListener(seguir);
  return () => sub.remove();
}

// ----------------------------------------------------------------------------
// `10.5b-v-ii` — her kitchen's messages, sent from the database (`0092`)
// ----------------------------------------------------------------------------

/**
 * ⚠️ A PERMISSION GRANTED INSIDE THE APP IS HEARD AT ONCE (`10.5c-iii`, found on the emulator): the database is told
 * this phone's token on each open and return to the front, and Android's permission dialog is neither — so a phone
 * allowed from a screen (a switch, a bell, the offers' sheet, after a reservation) stayed unknown to the database
 * until the next open, every message to it dropped meanwhile. Each ask that the phone grants calls these.
 */
const alConceder = new Set<() => void>();

export function alConcederPermiso(oir: () => void): () => void {
  alConceder.add(oir);
  return () => {
    alConceder.delete(oir);
  };
}

function concedido(): void {
  for (const oir of alConceder) oir();
}

/** What the phone says of notifications now, asking nothing — `null` when it cannot say. */
export async function leerPermisoDelTelefono(): Promise<Permiso | null> {
  try {
    const p = await Notifications.getPermissionsAsync();
    return { concedido: p.granted, puedePreguntar: p.canAskAgain };
  } catch {
    return null;
  }
}

/** Android's channels for the kinds the database answered — idempotent, as her reminder's. */
export async function hacerCanales(avisos: readonly Aviso[]): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const aviso of avisos) {
    try {
      await Notifications.setNotificationChannelAsync(aviso.canal, {
        name: aviso.nombreDelCanal,
        importance: Notifications.AndroidImportance[importanciaAndroid(aviso.importancia)],
      });
    } catch (falla) {
      console.warn(`[avisos] the phone did not make the channel ${aviso.canal}: ${String(falla)}`);
    }
  }
}

/** The channels the phone holds, and those she silenced — an iPhone has none. */
export async function leerCanales(): Promise<{ readonly channels: readonly string[]; readonly silenced: readonly string[] }> {
  if (Platform.OS !== 'android') return { channels: [], silenced: [] };
  try {
    const canales = await Notifications.getNotificationChannelsAsync();
    return canalesDe(
      canales.map((c) => ({ id: c.id, importance: c.importance })),
      Notifications.AndroidImportance.NONE,
    );
  } catch {
    return { channels: [], silenced: [] };
  }
}

/**
 * Ask the phone for her kitchen's messages: the channels first (Android 13 asks only once one
 * exists), then the question — `'si'`, `'no'`, or `'ajustes'` when only its settings can turn it on.
 */
export async function pedirPermisoParaAvisos(avisos: readonly Aviso[]): Promise<'si' | 'no' | 'ajustes'> {
  try {
    await hacerCanales(avisos);
    const ahora = await Notifications.getPermissionsAsync();
    if (ahora.granted) return 'si';
    if (!ahora.canAskAgain) return 'ajustes';
    const respuesta = await Notifications.requestPermissionsAsync();
    if (respuesta.granted) {
      concedido();
      return 'si';
    }
    return respuesta.canAskAgain ? 'no' : 'ajustes';
  } catch {
    return 'no';
  }
}

/**
 * This phone's Expo push token, or `null` — no signal, no Google services, or the phone refused.
 * ⚠️ Addressed to the project the build names (`extra.eas.projectId`, the one its updates come
 * from), which expo-notifications reads itself — `@/lib/useGoogle` stays the config's one reader.
 */
export async function tokenDelTelefono(): Promise<string | null> {
  try {
    const limite = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000));
    const pedido = Notifications.getExpoPushTokenAsync().then((t) => t.data);
    const token = await Promise.race([pedido, limite]);
    return typeof token === 'string' && token !== '' ? token : null;
  } catch (falla) {
    console.warn(`[avisos] no push token: ${String(falla)}`);
    return null;
  }
}

/** The platform the database is told. */
export function plataforma(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/**
 * ⚠️ WHILE WERA COCINA IS IN FRONT, A MESSAGE FROM THE DATABASE IS SHOWN as anywhere else —
 * SDK 57 drops it otherwise. Her reminders are not (as before this row). Returns what undoes it.
 */
export function mostrarAvisosEnFrente(): () => void {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const nuestro = kindDe(n.request.content.data) !== null;
      return { shouldShowBanner: nuestro, shouldShowList: nuestro, shouldPlaySound: nuestro, shouldSetBadge: false };
    },
  });
  return () => Notifications.setNotificationHandler(null);
}

/** Each message from the database that arrives while the app runs: its kind. */
export function alLlegarUnAviso(llego: (kind: string) => void): () => void {
  const sub = Notifications.addNotificationReceivedListener((n) => {
    const kind = kindDe(n.request.content.data);
    if (kind !== null) llego(kind);
  });
  return () => sub.remove();
}

/**
 * A tap on a message from the database — the one that opened the app, and every one tapped while
 * it runs: where it opens (or `null`, a place this build does not know — since `10.5c-iii` still
 * counted), its kind, and a campaign's send. ⚠️ Acted on once: the last response is cleared after it.
 */
export function alTocarUnAviso(tocado: (ruta: RutaDelToque | null, kind: string, envio: number | null) => void): () => void {
  const seguir = (respuesta: Notifications.NotificationResponse | null) => {
    if (respuesta === null) return;
    const data = respuesta.notification.request.content.data;
    const kind = kindDe(data);
    if (kind === null) return;
    Notifications.clearLastNotificationResponse();
    tocado(rutaDelAviso(data), kind, envioDe(data));
  };
  try {
    seguir(Notifications.getLastNotificationResponse());
  } catch {
    // An older engine without the synchronous read: the listener below still hears taps.
  }
  const sub = Notifications.addNotificationResponseReceivedListener(seguir);
  return () => sub.remove();
}

/**
 * The phone announces its own token — when Apple or Google renews it, and ⚠️ ALSO EACH TIME ITS EXPO
 * TOKEN IS ASKED FOR (measured on the emulator, 2026-11-20): the caller compares.
 */
export function alCambiarElToken(anunciado: (token: string) => void): () => void {
  const sub = Notifications.addPushTokenListener((t) => anunciado(String(t.data)));
  return () => sub.remove();
}
