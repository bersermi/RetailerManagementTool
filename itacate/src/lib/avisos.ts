import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { PREFIJO, porVenir, rutaDelToque, type Disparo } from '@/lib/recordatorio';
import { ES } from '@/strings';

// ============================================================================
// HER PHONE'S NOTIFICATIONS — THE ONE MODULE THAT ASKS FOR THEM. Plan task `10.5b-iii-b`:
// her reminder 15 minutes before her hour is a notification HER OWN PHONE schedules
// (`expo-notifications`, in every build of this app since `10.2a` — `test/identity.test.ts`),
// once, at a date. Nothing is sent to any server: no push token is asked for, and no Expo or
// Firebase message carries it. Wera Cocina's module, cut to Itacate (`cocina/src/lib/avisos.ts`,
// `10.5-v-c-ii`): its lessons are its own.
//
// ⚠️ ANDROID 13 ASKS ONLY ONCE A CHANNEL EXISTS, so the channel is made before the
// permission is asked, every time — `setNotificationChannelAsync` is idempotent. Its name is
// what her phone's settings show (*Tus apartados*).
// ⚠️ ASKED AFTER A RESERVATION GOES THROUGH — when what it is for is on the screen — and only
// while her phone still lets Itacate ask: an iPhone asks once, Android twice, then only Settings
// can turn it on (Wera Cocina's rule). ⚠️ NEVER "ONLY WHILE UNDETERMINED": on Android 13 and later
// `expo-notifications` 57.0.17 answers `denied` for a permission never asked (notifications not
// enabled reads as denied, in its source) — such a check never asked at all, found on the emulator.
// ⚠️ EVERY REMINDER IS SCHEDULED UNDER `PREFIJO` AND KEPT BY ITS ID: each time her reservations
// are read (`@/lib/Recordatorios`) the phone cancels those no reservation still wants and schedules
// those it does not hold yet — ⚠️ never "cancel all, schedule again": Android delivers late, and a
// reading between a reminder's moment and its delivery would cancel one it had not shown (found by
// the review of `10.5b-iii-b`). Each is scheduled in a try of its own: one refused (an iPhone refuses
// a moment just past) never costs the rest. Signing out cancels them all.
// ⚠️ SHOWN WHILE ITACATE IS OPEN TOO (`mostrarRecordatorios`, from `@/lib/Recordatorios`): without a
// handler a reminder that comes due in the front is dropped; only ours are shown.
// ⚠️ ANDROID 12 AND LATER DELIVER IT LATE, NEVER EARLY: without the exact-alarm permission (in
// no build) `expo-notifications` 57.0.17 falls back to `setAndAllowWhileIdle` (read in its
// source), an inexact alarm whose window the system may stretch to an hour — Wera Cocina's
// reminder, the same call, came 31 s and 3 min 21 s after its hour on the emulator
// (`cocina/CLAUDE.md`). The exact-alarm permission is a native change: `10.8`'s.
// NO CHECK CAN SEE A NOTIFICATION FIRE (ADR-035 §2.11): the phone is the instrument, and
// `test/calificar.test.ts` pins what this module is handed.
// ============================================================================

/** The channel her reminders arrive on — Android's, which her phone's settings name. */
export const CANAL = 'apartados';

async function asegurarCanal(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: ES.recordatorio.canal,
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** What her phone was told last — scheduled again the moment she says yes. */
let ultimos: readonly Disparo[] = [];

/**
 * Ask her phone, while it still lets Itacate ask. `true` when it lets Itacate show a
 * notification now — and then what was waiting is scheduled.
 */
export async function pedirPermiso(): Promise<boolean> {
  try {
    await asegurarCanal();
    const ahora = await Notifications.getPermissionsAsync();
    if (ahora.granted) return true;
    if (!ahora.canAskAgain) return false;
    const respuesta = await Notifications.requestPermissionsAsync();
    if (respuesta.granted) void programarApartados(ultimos);
    return respuesta.granted;
  } catch {
    return false;
  }
}

/** Her reminders the phone holds — those scheduled under `PREFIJO`. */
async function nuestros(): Promise<string[]> {
  const todos = await Notifications.getAllScheduledNotificationsAsync();
  return todos.map((n) => n.identifier).filter((id) => id.startsWith(PREFIJO));
}

/**
 * ⚠️ ONE AT A TIME, IN THE ORDER ASKED: a cancel and a schedule both read what the phone
 * holds and then change it, so two that overlap could leave her with none, or two of one.
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
    // Nothing she could do; the next read tells the phone again.
  }
}

/** Cancel every reminder of hers on this phone — at sign-out. */
export function quitarApartados(): Promise<void> {
  ultimos = [];
  return enOrden(quitarAhora);
}

/**
 * Her phone holds a reminder for each of these, by id: those no longer wanted cancelled,
 * the new ones still ahead scheduled, the rest left as they are. Without her permission
 * nothing is scheduled (and nothing asked): they wait for her yes.
 */
export function programarApartados(disparos: readonly Disparo[]): Promise<void> {
  ultimos = disparos;
  return enOrden(async () => {
    let tiene: string[];
    try {
      if (!(await Notifications.getPermissionsAsync()).granted) return;
      tiene = await nuestros();
    } catch (falla) {
      console.warn(`[recordatorio] the phone could not be read: ${String(falla)}`);
      return;
    }
    const quiere = new Set(disparos.map((d) => d.id));
    for (const id of tiene) {
      if (quiere.has(id)) continue;
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // The next read tells the phone again.
      }
    }
    const nuevos = porVenir(
      disparos.filter((d) => !tiene.includes(d.id)),
      Date.now(),
    );
    if (nuevos.length === 0) return;
    try {
      await asegurarCanal();
    } catch {
      // Android only; a reminder on the default channel still comes.
    }
    for (const disparo of nuevos) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: disparo.id,
          content: { title: disparo.titulo, body: disparo.texto, data: { ruta: rutaDelToque(disparo.id) } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: disparo.cuando, channelId: CANAL },
        });
      } catch (falla) {
        console.warn(`[recordatorio] the phone did not schedule ${disparo.id}: ${String(falla)}`);
      }
    }
  });
}

/**
 * While Itacate is in the front, a reminder of hers that comes due is shown as anywhere else —
 * without a handler it would be dropped. Anything else is shown nowhere. Returns what undoes it.
 */
export function mostrarRecordatorios(): () => void {
  Notifications.setNotificationHandler({
    handleNotification: async (notificacion) => {
      const nuestra = rutaDelToque(notificacion.request.identifier) !== null;
      return { shouldShowBanner: nuestra, shouldShowList: nuestra, shouldPlaySound: nuestra, shouldSetBadge: false };
    },
  });
  return () => Notifications.setNotificationHandler(null);
}

/**
 * Open her tickets when she taps one of her reminders — the one that opened the app, and
 * every one tapped while it runs. Returns what stops listening.
 */
export function alTocarUnRecordatorio(abrir: (ruta: string) => void): () => void {
  const seguir = (respuesta: Notifications.NotificationResponse | null) => {
    if (respuesta === null) return;
    const ruta = rutaDelToque(respuesta.notification.request.identifier);
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
