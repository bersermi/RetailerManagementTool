import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { PREFIJO, RUTA, rutaDelToque, type Disparo } from '@/lib/recordatorio';
import { ES } from '@/strings';

// ============================================================================
// HER PHONE'S NOTIFICATIONS — THE ONE MODULE THAT ASKS FOR THEM. Plan task `10.5-v-c-ii`:
// her reminder is a notification HER OWN PHONE schedules (`expo-notifications`, in every
// build of this app since `10.2a` — read inside the test builds' binaries on 2026-11-06),
// every week on each of her days at her hour. Nothing is sent to any server: no push
// token is asked for, and no Expo or Firebase message carries it (the aviso, section 3).
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
    if (respuesta.granted) return 'si';
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
