import type { Aviso, Consentimiento } from '@/api/push';
import type { Permiso } from '@/lib/avisosPush';
import { readKey, writeKey, type DeviceStore } from '@/lib/store';
import { ES } from '@/strings';

// ============================================================================
// *¿TE AVISAMOS DE OFERTAS?* — WHEN THE SHEET ASKS, PURE. Plan task `10.5c-iii`, on `10.5c-i`'s design
// (his ruling of 2026-11-20: built ahead, the sheet kept dark until his analyst approves its words):
//
// ⚠️ ASKED ONCE, AFTER A *YA LO TENGO* (the design: *in Itacate after her first Ya lo tengo*, a good
// moment — never at sign-up, never before she used the app): once her stars are given (`@/ui/Calificar`'s
// *Listo*), the sheet rises — if offers are offered to her, she has never answered, this phone has not
// asked her before, and her phone shows notifications or can still ask.
// ⚠️ DARK UNTIL THE ANALYST RULES, BY THE DATABASE: offers are *offered* only while a promotion kind comes
// in her kinds (`my_notification_kinds`) — today only on his test accounts (`0093`'s `campaign_tester`);
// and a yes is kept only on approved words (`set_my_consent` refuses ours with 22023 until *on 1* of
// `docs/runbooks/campaigns.sql` inserts them). Nothing here turns it on.
// ⚠️ *AHORA NO* IS AN ANSWER: kept as her no (`set_my_consent` false), so no phone of hers asks again — the
// switch in *Notificaciones* stays her way to say yes. Either way this phone remembers it asked her
// (`PREGUNTADO_KEY`), so a refused answer (no signal, or words not yet approved) never asks twice here.
// `test/push.test.ts` pins every case.
// ============================================================================

/** This phone asked her already — per login. */
export const PREGUNTADO_KEY = 'itacate.ofertas.preguntado';

function llave(user: string): string {
  return `${PREGUNTADO_KEY}.${user}`;
}

export function preguntadoAqui(store: DeviceStore | undefined, user: string): boolean {
  return readKey(store, llave(user)) !== null;
}

export function marcarPreguntado(store: DeviceStore | undefined, user: string): void {
  writeKey(store, llave(user), '1');
}

/** Whether offers are offered to her: a promotion kind comes in her kinds. */
export function ofrecidas(avisos: readonly Aviso[] | undefined): boolean {
  return (avisos ?? []).some((a) => a.clase === 'promocion');
}

/** Raise the sheet now? */
export function hayQuePreguntar({
  avisos,
  consentimiento,
  preguntado,
  permiso,
}: {
  readonly avisos: readonly Aviso[] | undefined;
  readonly consentimiento: Consentimiento | undefined;
  readonly preguntado: boolean;
  readonly permiso: Permiso | null;
}): boolean {
  if (!ofrecidas(avisos) || consentimiento === undefined || preguntado) return false;
  if (consentimiento.ofertas !== null) return false;
  return permiso !== null && (permiso.concedido || permiso.puedePreguntar);
}

/** The day she said yes, for *Dijiste que sí el 3 de diciembre.* — `null` while her answer is not a yes. */
export function siDesde(consentimiento: Consentimiento | undefined): Date | null {
  const ofertas = consentimiento?.ofertas ?? null;
  return ofertas !== null && ofertas.si ? ofertas.en : null;
}

export function diaDelSi(en: Date): string {
  return ES.fechas.delMes(en.getDate(), ES.fechas.meses[en.getMonth()]);
}

/**
 * ⚠️ THE SHEET'S WORDS AS ONE TEXT — exactly what *on 1* of `docs/runbooks/campaigns.sql` inserts as the body
 * of `@/api/push`' `PALABRAS`: what she saw is what her record names.
 */
export function textoDeLaHoja(): string {
  const { titulo, texto, medir } = ES.ofertas.hoja;
  return [titulo, texto, medir].join(' ');
}
