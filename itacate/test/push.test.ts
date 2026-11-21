import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  APP,
  AVISOS_KEY,
  CONSENTIMIENTO_KEY,
  COUNT_CAMPAIGN_TAP,
  COUNT_NOTIFICATION_TAP,
  MY_CONSENT,
  MY_NOTIFICATION_KINDS,
  PALABRAS,
  PREMIO,
  PUBLICO,
  REGISTER_PUSH_TOKEN,
  RETIRE_PUSH_TOKEN,
  SET_MY_CONSENT,
  SET_NOTIFICATION_SWITCH,
  answerArgs,
  avisosKey,
  campaignTapArgs,
  consentArgs,
  consentFrom,
  consentimientoKey,
  kindsArgs,
  kindsFrom,
  registerArgs,
  retireArgs,
  switchArgs,
  tapArgs,
  type Aviso,
  type Consentimiento,
} from '@/api/push';
import {
  TOKEN_KEY,
  canalesDe,
  destinoDelToque,
  envioDe,
  esOtroToken,
  filasDe,
  guardarToken,
  importanciaAndroid,
  kindDe,
  leerToken,
  mostrarEnFrente,
  olvidarToken,
  queDecir,
  queLeerOtraVez,
  reemplaza,
} from '@/lib/avisosPush';
import { PREGUNTADO_KEY, diaDelSi, hayQuePreguntar, marcarPreguntado, ofrecidas, preguntadoAqui, siDesde, textoDeLaHoja } from '@/lib/ofertas';
import type { DeviceStore } from '@/lib/store';
import { ES } from '@/strings';

// ============================================================================
// HER MESSAGES FROM THE SERVER, AS ITACATE TAKES PART. Plan task `10.5c-iii`, on `0092`–`0094`: Wera Cocina's
// `cocina/test/push.test.ts` (`10.5b-v-ii`), cut to Itacate — and her answer to offers, and a campaign's tap.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name, argument and key is one the database answers — is
// `docs/checks/10.5b-v-ii-push-contract.sh`'s (run on this app's `push.ts` too) and
// `docs/checks/10.5c-iii-consent-contract.sh`'s; WHO GETS A MESSAGE, IN WHAT WORDS, is `supabase/tests/0092`–`0094`'s.
// Here: the names in the migrations' own TEXT, the sheet's words held to the runbook that approves them, the rules
// this phone follows, and the wiring read as text. NO CHECK CAN SEE A MESSAGE ARRIVE (ADR-035 §2.11).
// ============================================================================

const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));
const RUNBOOK = fileURLToPath(new URL('../../docs/runbooks/campaigns.sql', import.meta.url));
const SRC = fileURLToPath(new URL('../src', import.meta.url));

/** The text of the last migration that defines `schema.fn`, its whitespace folded. */
function ultimaQueDefine(fn: string, schema = 'public'): string {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const pattern = new RegExp(`create (or replace )?function ${schema}\\.${fn}\\(`, 'i');
  const hits = files.filter((f) => pattern.test(readFileSync(join(MIGRATIONS, f), 'utf8')));
  if (hits.length === 0) throw new Error(`no migration defines ${schema}.${fn}`);
  const text = readFileSync(join(MIGRATIONS, hits[hits.length - 1]), 'utf8');
  const start = text.search(pattern);
  const end = text.indexOf('$$;', text.indexOf('$$', start) + 2);
  return text.slice(start, end).replace(/\s+/g, ' ');
}

function migracion(name: string): string {
  const file = readdirSync(MIGRATIONS).find((f) => f.startsWith(name));
  if (file === undefined) throw new Error(`no migration ${name}`);
  return readFileSync(join(MIGRATIONS, file), 'utf8').replace(/\s+/g, ' ');
}

function code(path: string): string {
  return readFileSync(join(SRC, path), 'utf8');
}

function sources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

function memoria(): DeviceStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

const W = '7a0d7a8e-2f39-4c1e-9b0a-3c5d8e1f2a4b';

describe('the eight names, held to `0092`, `0093` and `0094`', () => {
  it("this phone's token: seven arguments by the names PostgREST matches on, three of them defaulted", () => {
    expect(REGISTER_PUSH_TOKEN).toBe('register_push_token');
    expect(ultimaQueDefine(REGISTER_PUSH_TOKEN)).toMatch(
      /register_push_token\( p_app text, p_token text, p_platform text, p_allowed boolean, p_channels text\[\] default '\{\}', p_silenced text\[\] default '\{\}', p_replaces text default null \) returns void/,
    );
    expect(Object.keys(registerArgs('ExponentPushToken[a]', 'android', true, [], [], null))).toEqual([
      'p_app',
      'p_token',
      'p_platform',
      'p_allowed',
      'p_channels',
      'p_silenced',
      'p_replaces',
    ]);
  });

  it('retiring it, her kinds, her switch and a tap: each by its arguments', () => {
    expect(ultimaQueDefine(RETIRE_PUSH_TOKEN)).toMatch(/retire_push_token\(p_app text, p_token text\) returns void/);
    expect(Object.keys(retireArgs('t'))).toEqual(['p_app', 'p_token']);
    expect(ultimaQueDefine(MY_NOTIFICATION_KINDS)).toMatch(/my_notification_kinds\(p_app text\) returns jsonb/);
    expect(Object.keys(kindsArgs())).toEqual(['p_app']);
    expect(ultimaQueDefine(SET_NOTIFICATION_SWITCH)).toMatch(/set_notification_switch\(p_kind text, p_on boolean\) returns jsonb/);
    expect(Object.keys(switchArgs('k', true))).toEqual(['p_kind', 'p_on']);
    expect(ultimaQueDefine(COUNT_NOTIFICATION_TAP)).toMatch(/count_notification_tap\(p_kind text\) returns void/);
    expect(Object.keys(tapArgs('k'))).toEqual(['p_kind']);
  });

  it('⚠️ her switch takes an on-request kind since `0094` — the bell’s whole kind — and a tap on one is counted', () => {
    expect(ultimaQueDefine(SET_NOTIFICATION_SWITCH)).toContain("if v_kind.class not in ('servicio', 'a_pedido') then");
    expect(ultimaQueDefine(COUNT_NOTIFICATION_TAP)).toContain("k.class in ('servicio', 'a_pedido')");
  });

  it('her answer and a campaign’s tap: `0093`’s three, by their arguments', () => {
    expect(ultimaQueDefine(MY_CONSENT)).toMatch(/my_consent\(p_app text\) returns jsonb/);
    expect(Object.keys(consentArgs())).toEqual(['p_app']);
    expect(ultimaQueDefine(SET_MY_CONSENT)).toMatch(/set_my_consent\(p_words text, p_answer boolean\) returns jsonb/);
    expect(answerArgs(true)).toEqual({ p_words: PALABRAS, p_answer: true });
    expect(ultimaQueDefine(COUNT_CAMPAIGN_TAP)).toMatch(/count_campaign_tap\(p_send bigint\) returns void/);
    expect(campaignTapArgs(41)).toEqual({ p_send: 41 });
  });

  it('this app is `itacate`, and its kinds by name are the rows `0094` inserts', () => {
    expect(APP).toBe('itacate');
    const text = migracion('0094_');
    expect(PUBLICO).toBe('publico');
    expect(text).toContain("('publico', 'itacate', 'a_pedido', 'cocinas', 'Cocinas que sigues', 'normal',");
    expect(PREMIO).toBe('premio');
    expect(text).toContain("('premio', 'itacate', 'servicio', 'tarjetas', 'Tarjetas de lealtad', 'normal',");
  });

  it('a kind is answered by exactly the keys `kindsFrom` reads — `kinds_of`’s object', () => {
    const body = ultimaQueDefine('kinds_of', 'servicio');
    const keys = [...body.matchAll(/'([a-z_]+)', (?:k\.|coalesce)/g)].map((m) => m[1]).sort();
    expect(keys).toEqual(['channel', 'channel_name', 'class', 'detail', 'importance', 'is_on', 'kind', 'label', 'opens']);
  });

  it('her answers are answered by exactly the keys `consentFrom` reads — `consents_of`’s object', () => {
    const body = ultimaQueDefine('consents_of', 'servicio');
    expect(body).toContain("jsonb_build_object('answer', c.answer, 'words', c.words, 'at', c.given_at)");
    expect(body).toContain("unnest(array['promociones', 'medir_promociones'])");
  });

  it('cached under the login: every phone of hers reads one switch and one answer', () => {
    expect(avisosKey('u1')).toEqual([...AVISOS_KEY, 'u1']);
    expect(avisosKey(null)).not.toEqual(avisosKey('u1'));
    expect(consentimientoKey('u1')).toEqual([...CONSENTIMIENTO_KEY, 'u1']);
  });
});

describe('⚠️ the sheet’s words are the words the analyst’s approval inserts', () => {
  const runbook = readFileSync(RUNBOOK, 'utf8');
  const insert = /\('([a-z0-9-]+)', 'itacate', '\{promociones,medir_promociones\}', 'hoja',\s*'((?:[^']|'')*)'\)/.exec(runbook);

  it('*on 1* inserts this build’s version, for both uses, shown on the sheet', () => {
    expect(insert).not.toBeNull();
    expect(insert?.[1]).toBe(PALABRAS);
  });

  it('with the text exactly as the sheet draws it — what she saw is what her record names', () => {
    expect(insert?.[2].replace(/''/g, "'")).toBe(textoDeLaHoja());
    expect(textoDeLaHoja().startsWith(ES.ofertas.hoja.titulo)).toBe(true);
  });

  it('the version fits `consent_words`’ shape, and its words name where to turn it off', () => {
    expect(PALABRAS).toMatch(/^[a-z0-9][a-z0-9_.-]{0,39}$/);
    expect(ES.ofertas.hoja.medir).toContain('Tú → Notificaciones');
  });
});

describe('her answers, as the database answers them', () => {
  const si = { answer: true, words: PALABRAS, at: '2026-12-03T18:40:00Z' };
  it('never asked: both null', () => {
    expect(consentFrom({ promociones: null, medir_promociones: null })).toEqual({ ofertas: null, medir: null });
  });
  it('a yes read with its words and its moment', () => {
    const c = consentFrom({ promociones: si, medir_promociones: si });
    expect(c?.ofertas?.si).toBe(true);
    expect(c?.ofertas?.palabras).toBe(PALABRAS);
    expect(c?.ofertas?.en.toISOString()).toBe('2026-12-03T18:40:00.000Z');
  });
  it('an answer this build cannot read is an error, never a no', () => {
    expect(consentFrom([])).toBeNull();
    expect(consentFrom(null)).toBeNull();
    expect(consentFrom({ promociones: { answer: 'si', words: PALABRAS, at: si.at }, medir_promociones: null })).toBeNull();
    expect(consentFrom({ promociones: { ...si, at: 'ayer' }, medir_promociones: null })).toBeNull();
  });
});

describe('what this phone tells the database', () => {
  it('an iPhone sends no channels — it has none, and the server asks it for none', () => {
    const a = registerArgs('ExponentPushToken[i]', 'ios', true, ['cocinas'], ['cocinas'], null);
    expect(a.p_channels).toEqual([]);
    expect(a.p_silenced).toEqual([]);
    expect(a.p_app).toBe('itacate');
    const b = registerArgs('ExponentPushToken[a]', 'android', true, ['apartados', 'cocinas'], ['cocinas'], null);
    expect(b.p_channels).toEqual(['apartados', 'cocinas']);
    expect(b.p_silenced).toEqual(['cocinas']);
  });

  it('a token replaces only another of hers: never itself', () => {
    expect(registerArgs('T1', 'android', true, [], [], 'T1').p_replaces).toBeNull();
    expect(registerArgs('T2', 'android', true, [], [], 'T1').p_replaces).toBe('T1');
    expect(reemplaza({ user: 'u1', token: 'T1' }, 'u1', 'T2')).toBe('T1');
    expect(reemplaza({ user: 'u1', token: 'T1' }, 'u1', 'T1')).toBeNull();
    expect(reemplaza({ user: 'u0', token: 'T1' }, 'u1', 'T2')).toBeNull();
    expect(reemplaza(null, 'u1', 'T2')).toBeNull();
  });

  it('allowed: its new token; refused: the token it sent before for her, allowed false; never sent one: nothing', () => {
    const si = { concedido: true, puedePreguntar: true };
    const no = { concedido: false, puedePreguntar: false };
    expect(queDecir('u1', si, 'T2', { user: 'u1', token: 'T1' })).toEqual({ token: 'T2', allowed: true });
    expect(queDecir('u1', no, null, { user: 'u1', token: 'T1' })).toEqual({ token: 'T1', allowed: false });
    expect(queDecir('u1', no, null, { user: 'u0', token: 'T1' })).toBeNull();
    expect(queDecir('u1', no, null, null)).toBeNull();
    expect(queDecir('u1', si, null, null)).toBeNull();
  });

  it('the channels it holds, and those she silenced — what Android calls NONE', () => {
    const NONE = 2;
    expect(canalesDe([{ id: 'cocinas', importance: 3 }, { id: 'tarjetas', importance: NONE }], NONE)).toEqual({
      channels: ['cocinas', 'tarjetas'],
      silenced: ['tarjetas'],
    });
    expect(canalesDe([{ id: 'raro canal', importance: 5 }], NONE)).toEqual({ channels: [], silenced: [] });
  });

  it('the last token sent is kept with whose it was, and forgotten at Cerrar sesión — under a key of its own', () => {
    const store = memoria();
    expect(leerToken(store)).toBeNull();
    guardarToken(store, 'u1', 'T1');
    expect(leerToken(store)).toEqual({ user: 'u1', token: 'T1' });
    olvidarToken(store);
    expect(leerToken(store)).toBeNull();
    store.setItem(TOKEN_KEY, 'not json');
    expect(leerToken(store)).toBeNull();
    expect(TOKEN_KEY).toBe('itacate.push.token');
    expect(PREGUNTADO_KEY).not.toBe(TOKEN_KEY);
  });

  it('⚠️ its own fetch announces the same token again: never a change', () => {
    expect(esOtroToken(null, 'T1')).toBe(false);
    expect(esOtroToken('T1', 'T1')).toBe(false);
    expect(esOtroToken('T1', 'T2')).toBe(true);
  });
});

describe('the kinds, as the database answers them', () => {
  const fila = {
    kind: 'publico',
    class: 'a_pedido',
    channel: 'cocinas',
    channel_name: 'Cocinas que sigues',
    importance: 'normal',
    label: 'Cocinas que sigues',
    detail: 'Cuando publica una cocina con la campana encendida.',
    opens: 'cocina',
    is_on: true,
  };
  it('a kind read whole, its class kept', () => {
    expect(kindsFrom([fila])).toEqual([
      {
        kind: 'publico',
        clase: 'a_pedido',
        canal: 'cocinas',
        nombreDelCanal: 'Cocinas que sigues',
        importancia: 'normal',
        titulo: 'Cocinas que sigues',
        detalle: 'Cuando publica una cocina con la campana encendida.',
        abre: 'cocina',
        encendido: true,
      },
    ]);
  });
  it('a kind this build cannot read is left out, never guessed; an answer that is not a list is an error', () => {
    expect(kindsFrom([{ ...fila, channel: 'canal con espacios' }])).toEqual([]);
    expect(kindsFrom([{ ...fila, class: 'otra' }])).toEqual([]);
    expect(kindsFrom([{ ...fila, is_on: 'yes' }])).toEqual([]);
    expect(kindsFrom([null, fila])).toHaveLength(1);
    expect(kindsFrom({ kinds: [fila] })).toBeNull();
    expect(kindsFrom([{ ...fila, importance: 'urgente' }])?.[0].importancia).toBe('normal');
    expect([importanciaAndroid('alta'), importanciaAndroid('normal'), importanciaAndroid('baja')]).toEqual(['HIGH', 'DEFAULT', 'LOW']);
  });
  it('*Notificaciones*: a switch per service or on-request kind; every promotion kind as ONE row, on while any is', () => {
    const avisos =
      kindsFrom([
        { ...fila, kind: 'ofertas', class: 'promocion', channel: 'ofertas', label: 'Ofertas y novedades', is_on: false },
        fila,
        { ...fila, kind: 'promocion_cocina', class: 'promocion', channel: 'ofertas', label: 'Promociones de tus cocinas', is_on: false },
        { ...fila, kind: 'premio', class: 'servicio', channel: 'tarjetas', label: 'Premios' },
      ]) ?? [];
    const filas = filasDe(avisos);
    expect(filas.interruptores.map((a) => a.kind)).toEqual(['publico', 'premio']);
    expect(filas.ofertas?.titulo).toBe('Ofertas y novedades');
    expect(filas.ofertas?.encendido).toBe(false);
    expect(filasDe(avisos.map((a) => (a.clase === 'promocion' ? { ...a, encendido: true } : a))).ofertas?.encendido).toBe(true);
    expect(filasDe([fila].map((f) => kindsFrom([f])![0])).ofertas).toBeNull();
    expect(filasDe(undefined)).toEqual({ interruptores: [], ofertas: null });
  });
  it('⚠️ the two promotion kinds move with one answer — `kinds_of` reads `promociones` for every promotion kind', () => {
    expect(ultimaQueDefine('kinds_of', 'servicio')).toContain(
      "coalesce(case when k.class = 'promocion' then servicio.consent_now(p_user, k.app, 'promociones') end, s.is_on, k.default_on)",
    );
    const text = migracion('0094_');
    expect(text).toContain("('promocion_cocina', 'itacate', 'promocion', 'ofertas', 'Ofertas y novedades', 'normal',");
    expect(migracion('0093_')).toContain("('ofertas', 'itacate', 'promocion', 'ofertas', 'Ofertas y novedades', 'normal',");
  });
});

describe('a message from the database on the phone', () => {
  it('carries its kind; her reminders carry none — and a campaign its send', () => {
    expect(kindDe({ kind: 'publico', opens: 'cocina', opens_id: W })).toBe('publico');
    expect(kindDe({ ruta: '/apartados' })).toBeNull();
    expect(envioDe({ kind: 'ofertas', opens: 'cerca', campaign_id: 3, send_id: 41 })).toBe(41);
    expect(envioDe({ kind: 'publico', opens: 'cocina' })).toBeNull();
    expect(envioDe({ kind: 'ofertas', send_id: '41' })).toBeNull();
    expect(envioDe({ send_id: 41 })).toBeNull();
  });
  it('`0093` writes the send into each campaign message, with kind, opens, opens_id and campaign_id', () => {
    const body = ultimaQueDefine('campaign_push', 'servicio');
    expect(body).toContain("'kind', v_c.kind, 'opens', v_c.opens, 'opens_id', v_c.opens_id, 'campaign_id', v_c.id");
    expect(body).toContain("jsonb_set(v_message, '{data,send_id}', to_jsonb(x.send))");
  });
  it('a tap opens a kitchen’s page — for the bell and for her card — her kitchens, the list, her tickets', () => {
    expect(destinoDelToque({ kind: 'publico', opens: 'cocina', opens_id: W })).toEqual({ pathname: '/cocina/[id]', params: { id: W } });
    expect(destinoDelToque({ kind: 'premio', opens: 'tarjeta', opens_id: W })).toEqual({ pathname: '/cocina/[id]', params: { id: W } });
    expect(destinoDelToque({ kind: 'tarjeta_cambio', opens: 'mis_cocinas' })).toEqual({ pathname: '/mis-cocinas' });
    expect(destinoDelToque({ kind: 'ofertas', opens: 'cerca', send_id: 1 })).toEqual({ pathname: '/' });
    expect(destinoDelToque({ kind: 'ofertas', opens: 'apartados', send_id: 1 })).toEqual({ pathname: '/apartados' });
  });
  it('a place that needs a kitchen and carries none, or a place this build does not know, opens nothing', () => {
    expect(destinoDelToque({ kind: 'publico', opens: 'cocina' })).toBeNull();
    expect(destinoDelToque({ kind: 'publico', opens: 'cocina', opens_id: 'no-es-un-id' })).toBeNull();
    expect(destinoDelToque({ kind: 'ofertas', opens: 'platillo', opens_id: W })).toBeNull();
    expect(destinoDelToque({ kind: 'apartados', opens: 'publicar' })).toBeNull();
    expect(destinoDelToque({ opens: 'cerca' })).toBeNull();
  });
  it('every place `0094` sends Itacate’s messages with is one this build opens', () => {
    const text = migracion('0094_');
    const lugares = [...text.matchAll(/jsonb_build_object\('kind', '(publico|premio|sellos|tarjeta_cambio|promocion_cocina)', 'opens', '([a-z_]+)'/g)].map((m) => m[2]);
    expect(new Set(lugares)).toEqual(new Set(['cocina', 'tarjeta', 'mis_cocinas']));
    for (const lugar of lugares) expect(destinoDelToque({ kind: 'k', opens: lugar, opens_id: W })).not.toBeNull();
    // The kinds' own places: what a campaign opens when it names none.
    expect(destinoDelToque({ kind: 'ofertas', opens: 'cerca' })).not.toBeNull();
  });
  it('⚠️ in front, every message is shown but *¡Ganaste!* — the screen celebrates it at the read the message starts', () => {
    expect(mostrarEnFrente({ kind: 'publico', opens: 'cocina' })).toBe(true);
    expect(mostrarEnFrente({ kind: 'ofertas', opens: 'cerca', send_id: 2 })).toBe(true);
    expect(mostrarEnFrente({ kind: 'premio', opens: 'tarjeta' })).toBe(false);
    expect(mostrarEnFrente({ ruta: '/apartados' })).toBe(false);
    expect(queLeerOtraVez('tarjeta')).toBe('tarjetas');
    expect(queLeerOtraVez('cocina')).toBe('cocinas');
    expect(queLeerOtraVez('mis_cocinas')).toBe('cocinas');
    expect(queLeerOtraVez(null)).toBeNull();
  });
});

describe('*¿Te avisamos de ofertas?* — when the sheet asks', () => {
  const promo: Aviso = {
    kind: 'ofertas',
    clase: 'promocion',
    canal: 'ofertas',
    nombreDelCanal: 'Ofertas y novedades',
    importancia: 'normal',
    titulo: 'Ofertas y novedades',
    detalle: null,
    abre: 'cerca',
    encendido: false,
  };
  const servicio: Aviso = { ...promo, kind: 'premio', clase: 'servicio' };
  const nunca: Consentimiento = { ofertas: null, medir: null };
  const puede = { concedido: false, puedePreguntar: true };
  const base = { avisos: [servicio, promo], consentimiento: nunca, preguntado: false, permiso: puede };

  it('offered, never answered, never asked here, a phone that shows them or can still ask: yes', () => {
    expect(hayQuePreguntar(base)).toBe(true);
    expect(hayQuePreguntar({ ...base, permiso: { concedido: true, puedePreguntar: false } })).toBe(true);
  });
  it('⚠️ dark: no promotion kind among her kinds — Wera has offers off and she is no test account — never', () => {
    expect(ofrecidas([servicio])).toBe(false);
    expect(hayQuePreguntar({ ...base, avisos: [servicio] })).toBe(false);
    expect(hayQuePreguntar({ ...base, avisos: undefined })).toBe(false);
  });
  it('answered once — yes or no — never again; asked on this phone, never again; her answers unread, never', () => {
    const en = new Date('2026-12-03T18:40:00Z');
    expect(hayQuePreguntar({ ...base, consentimiento: { ofertas: { si: false, palabras: PALABRAS, en }, medir: null } })).toBe(false);
    expect(hayQuePreguntar({ ...base, consentimiento: { ofertas: { si: true, palabras: PALABRAS, en }, medir: null } })).toBe(false);
    expect(hayQuePreguntar({ ...base, preguntado: true })).toBe(false);
    expect(hayQuePreguntar({ ...base, consentimiento: undefined })).toBe(false);
  });
  it('a phone that only its settings can turn on, or that cannot say: never', () => {
    expect(hayQuePreguntar({ ...base, permiso: { concedido: false, puedePreguntar: false } })).toBe(false);
    expect(hayQuePreguntar({ ...base, permiso: null })).toBe(false);
  });
  it('the phone keeps that it asked, per login', () => {
    const store = memoria();
    expect(preguntadoAqui(store, 'u1')).toBe(false);
    marcarPreguntado(store, 'u1');
    expect(preguntadoAqui(store, 'u1')).toBe(true);
    expect(preguntadoAqui(store, 'u2')).toBe(false);
  });
  it('*Dijiste que sí el 3 de diciembre.* — only while her answer is yes', () => {
    const en = new Date(2026, 11, 3, 12, 0);
    expect(siDesde({ ofertas: { si: true, palabras: PALABRAS, en }, medir: null })).toBe(en);
    expect(siDesde({ ofertas: { si: false, palabras: PALABRAS, en }, medir: null })).toBeNull();
    expect(siDesde(undefined)).toBeNull();
    expect(ES.notificaciones.dijisteQueSi(diaDelSi(en))).toBe('Dijiste que sí el 3 de diciembre.');
  });
});

describe('the wiring, read as text', () => {
  it('the tabs mount the phone’s messages beside her reminders; on each open: channels, then the database told', () => {
    expect(code('app/(vecino)/(tabs)/_layout.tsx')).toMatch(/<Recordatorios \/>\s*<AvisosDelTelefono \/>/);
    const hook = code('lib/AvisosDelTelefono.tsx');
    expect(hook).toMatch(/\}, \[userId, avisos\.data, abierta, tokenCambio, concedido\]\);/);
    // ⚠️ A grant made on a screen runs it at once — Android's dialog is no open (found on the emulator).
    expect(hook).toMatch(/useEffect\(\(\) => alConcederPermiso\(\(\) => setConcedido\(\(n\) => n \+ 1\)\), \[\]\);/);
    const avisos = code('lib/avisos.ts');
    expect(avisos.match(/concedido\(\);/g)).toHaveLength(2);
    expect(hook).toMatch(/await hacerCanales\(kinds\);\s*const permiso/);
    // ⚠️ An open never asks the phone: only what she does on a screen asks.
    expect(hook).not.toMatch(/pedirPermiso/);
    expect(hook).toMatch(
      /const antes = ultimoAnunciado\.current;\s*ultimoAnunciado\.current = anunciado;\s*if \(esOtroToken\(antes, anunciado\)\) setTokenCambio\(\(n\) => n \+ 1\);/,
    );
  });

  it('a tap: a campaign’s reported with its send, a service or on-request one counted with nobody, a promotion’s alert by neither', () => {
    const hook = code('lib/AvisosDelTelefono.tsx');
    expect(hook).toMatch(
      /if \(envio !== null\) countCampaignTap\(envio\)\.catch\(\(\) => \{\}\);\s*else if \(kinds\.current\.find\(\(a\) => a\.kind === kind\)\?\.clase !== 'promocion'\) countNotificationTap\(kind\)\.catch\(\(\) => \{\}\);/,
    );
  });

  it('one handler for the front: her reminders and the database’s messages', () => {
    const avisos = code('lib/avisos.ts');
    expect(avisos).toMatch(
      /const nuestra =\s*rutaDelToque\(notificacion\.request\.identifier\) !== null \|\| mostrarEnFrente\(notificacion\.request\.content\.data\);/,
    );
    expect(avisos.match(/Notifications\.setNotificationHandler\(\{/g)).toHaveLength(1);
  });

  it("⚠️ Cerrar sesión retires this phone's token BEFORE the session ends, given 4 seconds, and forgets it", () => {
    const auth = code('auth/AuthProvider.tsx');
    const retire = auth.indexOf('retirePushToken(suyo.token)');
    const fin = auth.indexOf('await supabase.auth.signOut()');
    expect(retire).toBeGreaterThan(0);
    expect(fin).toBeGreaterThan(retire);
    expect(auth).toMatch(/new Promise<void>\(\(resolve\) => setTimeout\(resolve, 4_000\)\)/);
    expect(auth).toMatch(/olvidarToken\(store\);/);
  });

  it('the phone is asked when what it is for is on the screen: a bell rung on, a switch turned on, a yes to offers', () => {
    expect(code('ui/Seguir.tsx')).toMatch(/if \(que === 'campana' && resultado\.valor\.campana\) void pedirPermisoParaAvisos\(avisos\.data \?\? \[\]\);/);
    expect(code('app/(vecino)/notificaciones.tsx')).toMatch(/if \(on && telefonoNoDeja\) await pedirAlTelefono\(\);/);
    expect(code('ui/HojaOfertas.tsx')).toMatch(/if \(!\(await responder\(true\)\)\) \{[\s\S]*?cerrar\(\);\s*if \(\(await pedirPermisoParaAvisos\(/);
  });

  it('the sheet rises on *Apartados* once her stars are given, by `hayQuePreguntar` — and *Notificaciones* hangs from *Tú*', () => {
    const apartados = code('app/(vecino)/apartados.tsx');
    expect(apartados).toMatch(/onListo=\{calificado\}/);
    expect(apartados).toMatch(/if \(hayQuePreguntar\(\{ avisos: avisos\.data, consentimiento: consentimiento\.data, preguntado, permiso \}\)\) setOfertas\(true\);/);
    expect(apartados).toMatch(/<HojaOfertas visible=\{ofertas\} pregunta onCerrar=/);
    expect(code('app/(vecino)/(tabs)/tu.tsx')).toMatch(/onPress=\{\(\) => router\.push\('\/notificaciones'\)\}/);
  });

  it('only `@/lib/avisos` imports `expo-notifications`, and only it asks Expo for the token', () => {
    const importan = sources().filter((f) => /from 'expo-notifications'/.test(readFileSync(f, 'utf8')));
    expect(importan.map((f) => f.slice(SRC.length + 1))).toEqual(['lib/avisos.ts']);
    const piden = sources().filter((f) => /getExpoPushTokenAsync/.test(readFileSync(f, 'utf8')));
    expect(piden.map((f) => f.slice(SRC.length + 1))).toEqual(['lib/avisos.ts']);
  });
});
