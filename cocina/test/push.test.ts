import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  APARTADOS,
  APP,
  AVISOS_KEY,
  CONSENTIMIENTO_KEY,
  COUNT_CAMPAIGN_TAP,
  COUNT_NOTIFICATION_TAP,
  MY_CONSENT,
  MY_NOTIFICATION_KINDS,
  PALABRAS,
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
  PREGUNTADO_KEY,
  RUTAS,
  TOKEN_KEY,
  canalesDe,
  enMiCocina,
  envioDe,
  esOtroToken,
  guardarToken,
  hayQuePreguntar,
  importanciaAndroid,
  kindDe,
  leerToken,
  novedadesDe,
  olvidarToken,
  queDecir,
  reemplaza,
  rutaDelToque,
} from '@/lib/avisosPush';
import {
  PREGUNTADO_KEY as HOJA_KEY,
  diaDelSi,
  hayQuePreguntar as hayQuePreguntarNovedades,
  marcarPreguntado,
  preguntadoAqui,
  siDesde,
  textoDeLaHoja,
} from '@/lib/ofertas';
import type { DeviceStore } from '@/lib/store';
import { ES } from '@/strings';

// ============================================================================
// HER KITCHEN'S MESSAGES FROM THE SERVER, AS WERA COCINA TAKES PART. Plan task `10.5b-v-ii`, on `0092`.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name, argument and key is one the database answers
// — is `docs/checks/10.5b-v-ii-push-contract.sh`'s; WHO GETS A MESSAGE, IN WHAT WORDS, is
// `supabase/tests/0092_the_first_push.sql`'s. Here: the names in the migration's own TEXT, the rules this
// phone follows on each open, and the wiring read as text. NO CHECK CAN SEE A MESSAGE ARRIVE (ADR-035 §2.11).
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

describe('the five names, held to `0092`', () => {
  it("this phone's token: seven arguments by the names PostgREST matches on, three of them defaulted", () => {
    expect(REGISTER_PUSH_TOKEN).toBe('register_push_token');
    const body = ultimaQueDefine(REGISTER_PUSH_TOKEN);
    expect(body).toMatch(
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

  it('this app is `cocina`, and its one kind by name is `apartados` — the row the migration inserts', () => {
    expect(APP).toBe('cocina');
    expect(APARTADOS).toBe('apartados');
    const text = readFileSync(join(MIGRATIONS, '0092_the_first_push.sql'), 'utf8');
    expect(text).toMatch(/\('apartados', 'cocina', 'servicio', 'apartados', 'Apartados', 'alta',/);
  });

  it('a kind is answered by exactly the keys `kindsFrom` reads — `kinds_of`’s object', () => {
    const body = ultimaQueDefine('kinds_of', 'servicio');
    const keys = [...body.matchAll(/'([a-z_]+)', (?:k\.|coalesce)/g)].map((m) => m[1]).sort();
    expect(keys).toEqual(['channel', 'channel_name', 'class', 'detail', 'importance', 'is_on', 'kind', 'label', 'opens']);
  });

  it('cached under the login: every phone of hers reads one switch', () => {
    expect(avisosKey('u1')).toEqual([...AVISOS_KEY, 'u1']);
    expect(avisosKey(null)).not.toEqual(avisosKey('u1'));
  });
});

describe('what this phone tells the database', () => {
  it('an iPhone sends no channels — it has none, and the server asks it for none', () => {
    const a = registerArgs('ExponentPushToken[i]', 'ios', true, ['apartados'], ['apartados'], null);
    expect(a.p_channels).toEqual([]);
    expect(a.p_silenced).toEqual([]);
    const b = registerArgs('ExponentPushToken[a]', 'android', true, ['apartados', 'recordatorio'], ['recordatorio'], null);
    expect(b.p_channels).toEqual(['apartados', 'recordatorio']);
    expect(b.p_silenced).toEqual(['recordatorio']);
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
    expect(queDecir('u1', null, null, { user: 'u1', token: 'T1' })).toEqual({ token: 'T1', allowed: false });
  });

  it('the channels it holds, and those she silenced — what Android calls NONE', () => {
    const NONE = 2;
    expect(canalesDe([{ id: 'apartados', importance: 6 }, { id: 'recordatorio', importance: NONE }], NONE)).toEqual({
      channels: ['apartados', 'recordatorio'],
      silenced: ['recordatorio'],
    });
    expect(canalesDe([{ id: 'raro canal', importance: 5 }], NONE)).toEqual({ channels: [], silenced: [] });
    const veinte = Array.from({ length: 25 }, (_, i) => ({ id: `c${i}`, importance: 5 }));
    expect(canalesDe(veinte, NONE).channels).toHaveLength(20);
  });

  it('the last token sent is kept with whose it was, and forgotten at Cerrar sesión', () => {
    const store = memoria();
    expect(leerToken(store)).toBeNull();
    guardarToken(store, 'u1', 'T1');
    expect(leerToken(store)).toEqual({ user: 'u1', token: 'T1' });
    olvidarToken(store);
    expect(leerToken(store)).toBeNull();
    store.setItem(TOKEN_KEY, 'not json');
    expect(leerToken(store)).toBeNull();
    expect(leerToken(undefined)).toBeNull();
  });
});

describe('a token the phone announces', () => {
  it('⚠️ its own fetch announces the same token again: never a change — the loop the emulator showed', () => {
    expect(esOtroToken(null, 'T1')).toBe(false);
    expect(esOtroToken('T1', 'T1')).toBe(false);
    expect(esOtroToken('T1', 'T2')).toBe(true);
  });
  it('the hook counts a change only through it, and keeps the last one announced', () => {
    const hook = code('lib/useAvisosDelTelefono.ts');
    expect(hook).toMatch(
      /const antes = ultimoAnunciado\.current;\s*ultimoAnunciado\.current = anunciado;\s*if \(esOtroToken\(antes, anunciado\)\) setTokenCambio\(\(n\) => n \+ 1\);/,
    );
    expect(hook.match(/setTokenCambio\(/g)).toHaveLength(1);
  });
});

describe('when the phone is asked', () => {
  const puede = { concedido: false, puedePreguntar: true };
  it("once, after her kitchen's first publication, while the phone can still ask", () => {
    expect(hayQuePreguntar(true, false, puede)).toBe(true);
    expect(hayQuePreguntar(false, false, puede)).toBe(false);
    expect(hayQuePreguntar(true, true, puede)).toBe(false);
  });
  it('never when it already allows them (her reminder asked first), never when only its settings can', () => {
    expect(hayQuePreguntar(true, false, { concedido: true, puedePreguntar: true })).toBe(false);
    expect(hayQuePreguntar(true, false, { concedido: false, puedePreguntar: false })).toBe(false);
    expect(hayQuePreguntar(true, false, null)).toBe(false);
  });
  it('the phone keeps that it asked under a key of its own', () => {
    expect(PREGUNTADO_KEY).not.toBe(TOKEN_KEY);
  });
});

describe('the kinds, as the database answers them', () => {
  const fila = {
    kind: 'apartados',
    class: 'servicio',
    channel: 'apartados',
    channel_name: 'Apartados',
    importance: 'alta',
    label: 'Avisos de apartados',
    detail: 'Cada apartado nuevo y cada cancelación.',
    opens: 'apartados',
    is_on: true,
  };
  it('a kind read whole', () => {
    expect(kindsFrom([fila])).toEqual([
      {
        kind: 'apartados',
        canal: 'apartados',
        nombreDelCanal: 'Apartados',
        importancia: 'alta',
        titulo: 'Avisos de apartados',
        detalle: 'Cada apartado nuevo y cada cancelación.',
        abre: 'apartados',
        encendido: true,
        deServicio: true,
        clase: 'servicio',
      },
    ]);
  });
  it('a kind this build cannot read is left out, never guessed; an answer that is not a list is an error', () => {
    expect(kindsFrom([{ ...fila, channel: 'canal con espacios' }])).toEqual([]);
    expect(kindsFrom([{ ...fila, is_on: 'yes' }])).toEqual([]);
    expect(kindsFrom([{ ...fila, label: '' }])).toEqual([]);
    expect(kindsFrom([null, fila])).toHaveLength(1);
    expect(kindsFrom({ kinds: [fila] })).toBeNull();
    expect(kindsFrom([{ ...fila, importance: 'urgente' }])?.[0].importancia).toBe('normal');
    expect(kindsFrom([{ ...fila, detail: null }])?.[0].detalle).toBeNull();
    expect(kindsFrom([{ ...fila, class: 'otra' }])).toEqual([]);
  });
  it("Mi cocina switches only the service kinds; Android's importance from each", () => {
    const avisos = kindsFrom([fila, { ...fila, kind: 'novedades', class: 'promocion' }]) ?? [];
    expect(enMiCocina(avisos).map((a) => a.kind)).toEqual(['apartados']);
    expect(enMiCocina(undefined)).toEqual([]);
    expect([importanciaAndroid('alta'), importanciaAndroid('normal'), importanciaAndroid('baja')]).toEqual(['HIGH', 'DEFAULT', 'LOW']);
  });
});

describe('a message from the database on the phone', () => {
  it('carries its kind; her reminders carry none', () => {
    expect(kindDe({ kind: 'apartados', opens: 'apartados', workspace_id: 'w' })).toBe('apartados');
    expect(kindDe({ ruta: '/publicar' })).toBeNull();
    expect(kindDe(null)).toBeNull();
    expect(kindDe({ kind: 'Apartados!' })).toBeNull();
  });
  it('a tap opens Apartados, and only a place this build knows', () => {
    expect(rutaDelToque({ kind: 'apartados', opens: 'apartados' })).toBe('/apartados');
    expect(rutaDelToque({ kind: 'apartados', opens: 'toString' })).toBeNull();
    expect(rutaDelToque({ kind: 'apartados', opens: 'otra' })).toBeNull();
    expect(rutaDelToque({ opens: 'apartados' })).toBeNull();
  });
  it("the database's messages open what the kind says — `0092`’s triggers send opens apartados", () => {
    const text = readFileSync(join(MIGRATIONS, '0092_the_first_push.sql'), 'utf8');
    expect(text.match(/jsonb_build_object\('kind', 'apartados', 'opens', 'apartados', 'workspace_id'/g)).toHaveLength(2);
  });
  // `10.9h-ii`: the nudge to a kitchen with no offer yet (`0094`'s `primera_oferta`, *¿Tienes alguna oferta?*).
  it('the nudge’s tap opens Publicar — the place `0094` sends it with, and its kind’s row names', () => {
    expect(rutaDelToque({ kind: 'primera_oferta', opens: 'publicar', workspace_id: 'w' })).toBe('/publicar');
    expect(Object.keys(RUTAS).sort()).toEqual(['apartados', 'hoy', 'mi_cocina', 'publicar']);
    const text = readFileSync(join(MIGRATIONS, '0094_the_services_messages.sql'), 'utf8').replace(/\s+/g, ' ');
    expect(text.match(/jsonb_build_object\('kind', 'primera_oferta', 'opens', 'publicar', 'workspace_id'/g)).toHaveLength(1);
    // The kind's row: a service kind of this app — so *Mi cocina* draws its switch — whose tap opens `publicar`.
    expect(text).toContain("('primera_oferta', 'cocina', 'servicio', 'primera_oferta', 'Tu primera oferta', 'normal', 'Tu primera oferta', 'Un recordatorio si aún no publicas.', true, true, 'publicar', 2,");
    // Itacate's kinds open places of Itacate's, never one of this build's.
    for (const lugar of ['cocina', 'mis_cocinas', 'tarjeta']) expect(rutaDelToque({ kind: 'publico', opens: lugar })).toBeNull();
  });
  it('the nudge’s kind is drawn in Mi cocina with Nuevo apartado — a service kind, from its row', () => {
    const fila = (kind: string, clase: string): Aviso => ({
      kind,
      canal: kind,
      nombreDelCanal: kind,
      importancia: 'normal',
      titulo: kind,
      detalle: null,
      abre: 'publicar',
      encendido: true,
      deServicio: clase === 'servicio',
      clase: clase === 'servicio' ? 'servicio' : 'promocion',
    });
    expect(enMiCocina([fila('apartados', 'servicio'), fila('primera_oferta', 'servicio'), fila('otra', 'promocion')]).map((a) => a.kind)).toEqual([
      'apartados',
      'primera_oferta',
    ]);
  });
});

describe('the wiring, read as text', () => {
  it('the tabs tell the database about the phone on each open — asked once her kitchen has published', () => {
    const tabs = code('app/(cocina)/(tabs)/_layout.tsx');
    expect(tabs).toMatch(/const listings = useListings\(kitchen\?\.id \?\? null\);\s*useAvisosDelTelefono\(\(listings\.data\?\.length \?\? 0\) > 0\);/);
    const hook = code('lib/useAvisosDelTelefono.ts');
    expect(hook).toMatch(/\}, \[userId, avisos\.data, abierta, publicoAlgunaVez, tokenCambio, concedido\]\);/);
    // ⚠️ `10.5c-iii`: a grant made on a screen runs it at once — Android's dialog is no open (found on Itacate's emulator).
    expect(hook).toMatch(/useEffect\(\(\) => alConcederPermiso\(\(\) => setConcedido\(\(n\) => n \+ 1\)\), \[\]\);/);
    expect(code('lib/avisos.ts').match(/concedido\(\);/g)).toHaveLength(2);
    expect(hook).toMatch(/await hacerCanales\(kinds\);\s*let permiso/);
    expect(hook).toMatch(/writeKey\(store, PREGUNTADO_KEY, '1'\);\s*await pedirPermisoParaAvisos\(kinds\);/);
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

  it("in front, only the database's messages are shown; their arrival reads her reservations again; a tap is counted", () => {
    expect(code('lib/avisos.ts')).toMatch(/const nuestro = kindDe\(n\.request\.content\.data\) !== null;/);
    const hook = code('lib/useAvisosDelTelefono.ts');
    expect(hook).toMatch(/queries\.invalidateQueries\(\{ queryKey: APARTADOS_KEY \}\)/);
    expect(hook).toMatch(
      /void queries\.invalidateQueries\(\{ queryKey: APARTADOS_KEY \}\);\s*if \(ruta !== null\) router\.navigate\(ruta\);\s*if \(envio !== null\) countCampaignTap\(envio\)\.catch\(\(\) => \{\}\);\s*else if \(kinds\.current\.find\(\(a\) => a\.kind === kind\)\?\.clase !== 'promocion'\) countNotificationTap\(kind\)\.catch\(\(\) => \{\}\);/,
    );
  });

  it("the switch is drawn in both of Mi cocina's screens — the owner's and a helper's", () => {
    const mi = code('app/(cocina)/(tabs)/mi-cocina.tsx');
    expect(mi.match(/<SusAvisos \/>/g)).toHaveLength(2);
    expect(code('ui/SusAvisos.tsx')).toMatch(/encendido=\{aviso\.encendido && !telefonoNoDeja\}/);
  });

  it("only the phone's module and the hook on each open reach the phone's token", () => {
    const readers = sources()
      .filter((path) => /tokenDelTelefono|alCambiarElToken/.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(SRC.length + 1))
      .sort();
    expect(readers).toEqual(['lib/avisos.ts', 'lib/useAvisosDelTelefono.ts']);
  });

  it("the phone adds two sentences of its own; the switch's words are the database's", () => {
    expect(ES.avisos.sinPermiso).toBe(ES.recordatorio.sinPermiso);
    expect(ES.avisos.noSeGuardo).toMatch(/^No se pudo guardar\./);
  });
});

// ----------------------------------------------------------------------------
// `10.5c-iii` — *Novedades de Wera Cocina*: her answer, the sheet, a campaign's tap (`0093`)
// ----------------------------------------------------------------------------

describe('her answer and a campaign’s tap: `0093`’s three names', () => {
  it('each by its arguments, in the migration’s own text', () => {
    expect(ultimaQueDefine(MY_CONSENT)).toMatch(/my_consent\(p_app text\) returns jsonb/);
    expect(consentArgs()).toEqual({ p_app: 'cocina' });
    expect(ultimaQueDefine(SET_MY_CONSENT)).toMatch(/set_my_consent\(p_words text, p_answer boolean\) returns jsonb/);
    expect(answerArgs(false)).toEqual({ p_words: PALABRAS, p_answer: false });
    expect(ultimaQueDefine(COUNT_CAMPAIGN_TAP)).toMatch(/count_campaign_tap\(p_send bigint\) returns void/);
    expect(campaignTapArgs(7)).toEqual({ p_send: 7 });
  });
  it('her answers read by exactly `consents_of`’s keys; one this build cannot read is an error, never a no', () => {
    expect(ultimaQueDefine('consents_of', 'servicio')).toContain("jsonb_build_object('answer', c.answer, 'words', c.words, 'at', c.given_at)");
    expect(consentFrom({ promociones: null, medir_promociones: null })).toEqual({ ofertas: null, medir: null });
    expect(consentFrom({ promociones: { answer: true, words: PALABRAS, at: '2026-12-03T18:40:00Z' }, medir_promociones: null })?.ofertas?.si).toBe(true);
    expect(consentFrom({ promociones: { answer: 1, words: PALABRAS, at: '2026-12-03T18:40:00Z' }, medir_promociones: null })).toBeNull();
    expect(consentFrom('si')).toBeNull();
    expect(consentimientoKey('u1')).toEqual([...CONSENTIMIENTO_KEY, 'u1']);
  });
  it('`novedades` is the promotion kind `0093` writes for this app — dark, opening Hoy', () => {
    expect(readFileSync(join(MIGRATIONS, '0093_campaigns.sql'), 'utf8').replace(/\s+/g, ' ')).toContain(
      "('novedades', 'cocina', 'promocion', 'novedades', 'Novedades de Wera Cocina', 'normal', 'Novedades de Wera Cocina', 'Consejos y novedades de la app.', false, false, 'hoy', 3)",
    );
    expect(rutaDelToque({ kind: 'novedades', opens: 'hoy', campaign_id: 1, send_id: 9 })).toBe('/');
    expect(rutaDelToque({ kind: 'novedades', opens: 'mi_cocina', send_id: 9 })).toBe('/mi-cocina');
  });
  it('a campaign’s message carries its send; a service message none', () => {
    expect(envioDe({ kind: 'novedades', opens: 'hoy', campaign_id: 1, send_id: 9 })).toBe(9);
    expect(envioDe({ kind: 'apartados', opens: 'apartados', workspace_id: 'w' })).toBeNull();
    expect(envioDe({ send_id: 9 })).toBeNull();
    expect(ultimaQueDefine('campaign_push', 'servicio')).toContain("jsonb_set(v_message, '{data,send_id}', to_jsonb(x.send))");
  });
});

describe('⚠️ the sheet’s words are the words the analyst’s approval inserts', () => {
  const runbook = readFileSync(RUNBOOK, 'utf8');
  const fila = /\('([a-z0-9-]+)', 'cocina', '\{promociones,medir_promociones\}', 'hoja',\s*'((?:[^']|'')*)'\)/.exec(runbook);
  it('*on 1* inserts this build’s version, for both uses, shown on the sheet — the text exactly as drawn', () => {
    expect(fila?.[1]).toBe(PALABRAS);
    expect(fila?.[2].replace(/''/g, "'")).toBe(textoDeLaHoja());
    expect(PALABRAS).toMatch(/^[a-z0-9][a-z0-9_.-]{0,39}$/);
  });
  it('*on 2* turns `novedades` on with Itacate’s `ofertas`', () => {
    expect(runbook).toContain("update servicio.notification_kind set is_on = true where kind in ('ofertas', 'novedades');");
  });
  it('its words name where to turn it off, and are a draft until the analyst approves them', () => {
    expect(ES.novedades.hoja.medir).toContain('Mi cocina');
    expect(code('strings.ts')).toContain('THE SHEET\'S WORDS ARE A DRAFT, NOT APPROVED');
  });
});

describe('*Novedades* in *Mi cocina*, and when the sheet asks', () => {
  const promo: Aviso = {
    kind: 'novedades',
    canal: 'novedades',
    nombreDelCanal: 'Novedades de Wera Cocina',
    importancia: 'normal',
    titulo: 'Novedades de Wera Cocina',
    detalle: 'Consejos y novedades de la app.',
    abre: 'hoy',
    encendido: false,
    deServicio: false,
    clase: 'promocion',
  };
  const apartados: Aviso = { ...promo, kind: 'apartados', clase: 'servicio', deServicio: true, encendido: true };
  const nunca: Consentimiento = { ofertas: null, medir: null };
  const base = { avisos: [apartados, promo], consentimiento: nunca, preguntado: false, permiso: { concedido: true, puedePreguntar: false } };

  it('drawn only while offered — a promotion kind among her kinds — on while her answer is yes', () => {
    expect(novedadesDe([apartados])).toBeNull();
    expect(novedadesDe([apartados, promo])?.encendido).toBe(false);
    expect(novedadesDe([apartados, { ...promo, encendido: true }])?.encendido).toBe(true);
    expect(enMiCocina([apartados, promo]).map((a) => a.kind)).toEqual(['apartados']);
  });
  it('the sheet asks once after a handover: offered, never answered, never asked here, a phone that can show it', () => {
    expect(hayQuePreguntarNovedades(base)).toBe(true);
    expect(hayQuePreguntarNovedades({ ...base, avisos: [apartados] })).toBe(false);
    expect(hayQuePreguntarNovedades({ ...base, preguntado: true })).toBe(false);
    expect(hayQuePreguntarNovedades({ ...base, permiso: { concedido: false, puedePreguntar: false } })).toBe(false);
    const en = new Date(2026, 11, 3);
    expect(hayQuePreguntarNovedades({ ...base, consentimiento: { ofertas: { si: false, palabras: PALABRAS, en }, medir: null } })).toBe(false);
    expect(siDesde({ ofertas: { si: true, palabras: PALABRAS, en }, medir: null })).toBe(en);
    expect(ES.novedades.dijisteQueSi(diaDelSi(en))).toBe('Dijiste que sí el 3 de diciembre.');
  });
  it('the phone keeps that it asked, per login, under a key of its own — not the phone’s question’s', () => {
    const store = memoria();
    marcarPreguntado(store, 'u1');
    expect(preguntadoAqui(store, 'u1')).toBe(true);
    expect(preguntadoAqui(store, 'u2')).toBe(false);
    expect(HOJA_KEY).not.toBe(PREGUNTADO_KEY);
    expect(HOJA_KEY).not.toBe(TOKEN_KEY);
  });
  it('wired: the sheet rises when she leaves *Entregar* after a handover; *Novedades*’ switch opens it in *Mi cocina*', () => {
    const entregar = code('app/(cocina)/entregar.tsx');
    expect(entregar).toMatch(/onDespues=\{terminar\}/);
    expect(entregar).toMatch(/label=\{ES\.pulgar\.listo\} onPress=\{terminar\}/);
    expect(entregar).toMatch(/if \(hayQuePreguntar\(\{ avisos: avisos\.data, consentimiento: consentimiento\.data, preguntado, permiso \}\)\) setOfertas\(true\);\s*else volver\(\);/);
    expect(entregar).toMatch(/<HojaOfertas\s*visible=\{ofertas\}\s*pregunta/);
    const sus = code('ui/SusAvisos.tsx');
    expect(sus).toMatch(/if \(on\) \{\s*setHoja\(true\);\s*return;\s*\}\s*if \(!\(await responder\(false\)\)\)/);
    expect(sus).toMatch(/<HojaOfertas visible=\{hoja\} pregunta=\{false\}/);
  });
});
