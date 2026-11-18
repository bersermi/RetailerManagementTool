import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { apiErrorMessage } from '@/api/errors';
import {
  CODE_DEAD,
  CODE_EXPIRED,
  CODE_LENGTH,
  CODIGO_KEY,
  INVITE_HELPER,
  KITCHEN_OF_CODE,
  REDEEM_INVITE,
  codeArgs,
  codigoAgrupado,
  codigoAlEscribir,
  codigoCompleto,
  codigoErrorMessage,
  codigoKey,
  compartirTexto,
  esRechazoDelCodigo,
  invitacionFrom,
  inviteArgs,
  nombreDeCocinaFrom,
  normalizarCodigo,
  unidaFrom,
} from '@/api/invitar';
import { podraTexto } from '@/lib/ayudante';
import { ES } from '@/strings';

// ============================================================================
// A HELPER'S CODE, AND JOINING WITH IT, AS WERA COCINA READS THEM. Plan task `10.9b-iii`, on `0083` and
// `0028`'s `redeem_invite` — the owner's ruling of 2026-11-18: a code for one person, 24 hours, sixteen
// characters in four groups, no address, joining at once.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each name here is one the database answers, as a real
// owner and a real helper — is `docs/checks/10.9b-ii-team-contract.sh`'s. Here: every name this module
// repeats is in the migrations' own TEXT; the code is Wera's, run beside it; and what the app does with
// an answer.
// ============================================================================

const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));
const migracion = (prefix: string) => {
  const file = readdirSync(MIGRATIONS).find((f) => f.startsWith(prefix));
  if (file === undefined) throw new Error(`no migration ${prefix}`);
  return readFileSync(join(MIGRATIONS, file), 'utf8').replace(/\s+/g, ' ');
};
const fuente = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8').replace(/\s+/g, ' ');
const calls = fuente('api/calls.ts');

const CODIGO = 'EF0JYVX8J7P7Q9FH';

// ⚠️ WERA'S FILES, READ — not imported: each app's `@/` is its own `src/`, so Wera's modules cannot load
// here (`test/senal.test.ts`'s way). A function's body, its spacing folded.
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const cuerpo = (file: string, firma: string) => {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const at = text.indexOf(firma);
  if (at < 0) throw new Error(`no ${firma} in ${file}`);
  const open = text.indexOf('{', at + firma.length);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i).replace(/\s+/g, ' ').trim();
  }
  throw new Error(`unclosed ${firma}`);
};

describe('the names, as the migrations write them', () => {
  it('Invitar is `invite_helper(p_workspace_id)` (0083), answering {token, expires_at}', () => {
    const m = migracion('0083_');
    expect(m).toContain(`create function public.${INVITE_HELPER}(${Object.keys(inviteArgs('k'))[0]} uuid)`);
    expect(m).toContain("'token', v_token, 'expires_at', v_invite.expires_at");
    expect(m).toContain("now() + interval '24 hours'");
  });

  it('the kitchen’s name is `kitchen_of_code(p_token)` (0083), answering {kitchen_name}', () => {
    const m = migracion('0083_');
    expect(m).toContain(`create function public.${KITCHEN_OF_CODE}(${Object.keys(codeArgs('x'))[0]} text)`);
    expect(m).toContain("jsonb_build_object('kitchen_name', v_name)");
  });

  it('joining is Wera’s `redeem_invite(p_token)`, last made by 0036, answering the kitchen it joined', () => {
    const m = migracion('0036_');
    expect(m).toContain(`create or replace function public.${REDEEM_INVITE}(${Object.keys(codeArgs('x'))[0]} text)`);
    for (const key of ['workspace_id', 'workspace_name', 'role']) expect(m).toContain(`'${key}', `);
  });

  it('the refusals are the database’s: TD005 the code will never work, TD003 it expired — in both functions', () => {
    for (const m of [migracion('0036_'), migracion('0083_')]) {
      expect(m).toContain(`errcode = '${CODE_DEAD}'`);
      expect(m).toContain(`errcode = '${CODE_EXPIRED}'`);
    }
  });
});

describe('the three round trips, as calls.ts sends them', () => {
  it('each is one call with its argument', () => {
    expect(calls).toContain('supabase.rpc(INVITE_HELPER, inviteArgs(kitchenId))');
    expect(calls).toContain('supabase.rpc(KITCHEN_OF_CODE, codeArgs(codigo))');
    expect(calls).toContain('supabase.rpc(REDEEM_INVITE, codeArgs(codigo))');
    expect(inviteArgs('k1')).toEqual({ p_workspace_id: 'k1' });
  });

  it('⚠️ the code is SENT normalised — what was measured is what is spent (Wera’s rule)', () => {
    expect(codeArgs('ef0j-yvx8 j7p7 q9fh')).toEqual({ p_token: CODIGO });
    expect(codeArgs('EFOJ YVX8 J7P7 Q9FH')).toEqual({ p_token: CODIGO });
  });

  it('the name caches under the login and the code', () => {
    expect(codigoKey('u1', CODIGO)).toEqual([...CODIGO_KEY, 'u1', CODIGO]);
    expect(codigoKey('u1', CODIGO)).not.toEqual(codigoKey('u2', CODIGO));
  });
});

describe('the code is Wera’s — held to Wera’s own files', () => {
  it('sixteen characters, as Wera’s invitation', () => {
    expect(readFileSync(join(ROOT, 'app/src/api/redeem.ts'), 'utf8')).toContain(`export const TOKEN_LENGTH = ${CODE_LENGTH};`);
  });

  it('normalised as Wera normalises (`normalizeCredential`) — code for code', () => {
    expect(cuerpo('cocina/src/api/invitar.ts', 'export function normalizarCodigo(raw: string): string')).toBe(
      cuerpo('app/src/api/redeem.ts', 'export function normalizeCredential(raw: string): string'),
    );
  });

  it('grouped as Wera groups (`groupedToken`) — code for code, its length named', () => {
    const wera = cuerpo('app/src/api/invites.ts', 'export function groupedToken(token: string): string');
    expect(cuerpo('cocina/src/api/invitar.ts', 'export function codigoAgrupado(codigo: string): string')).toBe(
      wera.replace(/token/g, 'codigo').replace('!== 16', '!== CODE_LENGTH'),
    );
  });

  it('and what the database does: grouping gone, upper case, I/L → 1, O → 0, U kept', () => {
    expect(normalizarCodigo('ef0j-yvx8 j7p7 q9fh')).toBe(CODIGO);
    expect(normalizarCodigo('il0o uuuu')).toBe('1100UUUU');
    expect(codigoAgrupado(CODIGO)).toBe('EF0J YVX8 J7P7 Q9FH');
    expect(codigoAgrupado('ABCD')).toBe('ABCD');
  });
});

describe('the box, as she types or pastes', () => {
  it('groups as she goes, and stops at sixteen', () => {
    expect(codigoAlEscribir('ef0j')).toBe('EF0J');
    expect(codigoAlEscribir('ef0jy')).toBe('EF0J Y');
    expect(codigoAlEscribir('EF0J YVX8 J7P7 Q9FHZZ')).toBe('EF0J YVX8 J7P7 Q9FH');
    expect(codigoAlEscribir('')).toBe('');
  });

  it('⚠️ a whole message pasted from WhatsApp gives its code, never the words before it', () => {
    const vence = { codigo: CODIGO, vence: new Date('2026-11-19T22:40:00Z') };
    for (const cocina of ['Fonda Doña Mari', 'Casa Lupe Toña Mari', 'Cocina 1234 5678 9ABC DEFG']) {
      const pegado = compartirTexto(cocina, vence, '16:40');
      expect(codigoAlEscribir(pegado)).toBe('EF0J YVX8 J7P7 Q9FH');
      expect(codigoCompleto(codigoAlEscribir(pegado))).toBe(CODIGO);
    }
  });

  it('is whole only at sixteen — nothing is asked before', () => {
    expect(codigoCompleto('EF0J YVX8 J7P7 Q9F')).toBeNull();
    expect(codigoCompleto('EF0J YVX8 J7P7 Q9FH')).toBe(CODIGO);
  });
});

describe('the answers, read', () => {
  it('a code made: the sixteen and when it stops working; anything malformed draws no code', () => {
    expect(invitacionFrom({ token: CODIGO, expires_at: '2026-11-19T22:40:00Z' })).toEqual({
      codigo: CODIGO,
      vence: new Date('2026-11-19T22:40:00Z'),
    });
    expect(invitacionFrom({ token: 'SHORT', expires_at: '2026-11-19T22:40:00Z' })).toBeNull();
    expect(invitacionFrom({ token: CODIGO, expires_at: 'nunca' })).toBeNull();
    expect(invitacionFrom(null)).toBeNull();
  });

  it('the kitchen’s name, trimmed; none when blank', () => {
    expect(nombreDeCocinaFrom({ kitchen_name: ' Fonda Doña Mari ' })).toBe('Fonda Doña Mari');
    expect(nombreDeCocinaFrom({ kitchen_name: '  ' })).toBeNull();
    expect(nombreDeCocinaFrom('x')).toBeNull();
  });

  it('the kitchen she joined', () => {
    expect(unidaFrom({ workspace_id: 'k1', workspace_name: 'Fonda Doña Mari', role: 'staff' })).toEqual({
      kitchenId: 'k1',
      nombre: 'Fonda Doña Mari',
    });
    expect(unidaFrom({ workspace_name: 'x' })).toBeNull();
  });
});

describe('the refusals, in words', () => {
  it('a dead code and an expired one each say to ask for another; anything else is the usual sentence', () => {
    expect(codigoErrorMessage({ code: 'TD005' })).toBe(ES.unirme.noSirve);
    expect(codigoErrorMessage({ code: 'TD003' })).toBe(ES.unirme.vencio);
    expect(codigoErrorMessage({ code: '42501' })).toBe(apiErrorMessage({ code: '42501' }));
    expect(codigoErrorMessage(new TypeError('Network request failed'))).toBe(apiErrorMessage(new TypeError('Network request failed')));
  });

  it('only the database’s last word on a code stops it being asked again — never a dead link', () => {
    expect(esRechazoDelCodigo({ code: 'TD005' })).toBe(true);
    expect(esRechazoDelCodigo({ code: 'TD003' })).toBe(true);
    expect(esRechazoDelCodigo({ code: '22023' })).toBe(true);
    expect(esRechazoDelCodigo(new TypeError('Network request failed'))).toBe(false);
    expect(esRechazoDelCodigo({ code: '42501' })).toBe(false);
  });
});

describe('what the owner is shown and sends', () => {
  it('the message names the kitchen, the code in groups and until when', () => {
    const texto = compartirTexto('Fonda Doña Mari', { codigo: CODIGO, vence: new Date() }, '16:40');
    expect(texto).toContain('Fonda Doña Mari');
    expect(texto).toContain('EF0J YVX8 J7P7 Q9FH');
    expect(texto).toContain('16:40');
    expect(texto).toContain(ES.empezar.unirme);
  });

  it('what she will do there is true today: no stamps until her kitchen uses a card this build carries', () => {
    expect(podraTexto(undefined)).toBe(ES.invitar.podra);
    expect(podraTexto(undefined, ['tarjeta'])).toBe(ES.invitar.podra);
  });
});

describe('the screens, read', () => {
  it('Quién trabaja aquí is drawn always, with Invitar a alguien under the list', () => {
    const quien = fuente('ui/QuienTrabajaAqui.tsx');
    expect(quien).not.toMatch(/personas\.length < 2/);
    expect(quien).toContain('titulo={ES.equipo.invitar}');
    expect(quien).toContain('<HojaInvitar');
  });

  it('the sheet asks for a code each time it opens, and shares it with React Native’s own Share', () => {
    const hoja = fuente('ui/HojaInvitar.tsx');
    expect(hoja).toMatch(/useEffect\(\(\) => \{ if \(visible\) pedir\(\); else olvidar\(\); \}, \[visible, pedir, olvidar\]\);/);
    expect(hoja).toContain("import { ActivityIndicator, Modal, Pressable, Share, Text, View } from 'react-native';");
  });

  it('the fork offers both ways, and its foot keeps the way out', () => {
    const empezar = fuente('app/(onboarding)/empezar.tsx');
    expect(empezar).toContain('a="/registro"');
    expect(empezar).toContain('a="/unirme"');
    expect(empezar).toContain('<Salidas openKitchenId={null} />');
  });

  it('joining asks the name once the code is whole, and joins only with a name read', () => {
    const unirme = fuente('app/(onboarding)/unirme.tsx');
    expect(unirme).toContain('const cocina = useCocinaDelCodigo(codigo);');
    expect(unirme).toContain('if (codigo === null || nombre === null) return;');
    expect(unirme).not.toMatch(/maxLength=\{/);
  });
});
