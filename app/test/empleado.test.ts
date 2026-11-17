import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { Documents, ShopDocument } from '@/api/documents';
import type { Role } from '@/api/members';
import {
  CERRADAS_AL_EMPLEADO,
  INICIO_BLOCKS,
  INICIO_DOORS,
  INICIO_EMPLEADO,
  bloquesDe,
  cerradaAlEmpleado,
  doorsFor,
  loQueRegistro,
  veTodoElInicio,
} from '@/navigation/inicio';

// ============================================================================
// AN EMPLEADO SEES ONLY HER WORK — plan task `5R-n`, the owner's ruling of
// 2026-11-17: *"Empleado can only use the operational features like recording
// Ventas, Compras and Merma. No Numeros, can only see lo último on things she
// rang up herself."* Read strictly on his behalf: Productos and Proveedores
// leave her Inicio too. The owner and the Encargado keep everything.
//
// ⚠️ WHAT THIS CANNOT SEE (`R9`): that Inicio draws `bloquesDe`, that the root
// layout sends her back, that *Lo último* lists what `loQueRegistro` leaves.
// That is a phone joined as *Empleado* — the plan's status entry says what to look at.
// ⚠️ AND ON THE SCREEN ONLY (his second ruling of that evening): the database
// still answers her login with the store's sales; nothing here says otherwise.
// ============================================================================

const EVERY_ROLE: readonly (Role | null)[] = ['owner', 'manager', 'staff', null];
const ELLA = 'u-empleada';
const EL = 'u-dueno';

function doc(id: string, createdBy: string | null): ShopDocument {
  return { id, kind: 'sale', createdBy } as unknown as ShopDocument;
}

function docs(state: Documents['state'], list: readonly ShopDocument[]): Documents & { readonly failed: null } {
  return { state, documents: list, failed: null };
}

describe('her Inicio', () => {
  it('is the shop’s whole Inicio for an owner and an Encargado', () => {
    expect(bloquesDe('owner')).toEqual(INICIO_BLOCKS);
    expect(bloquesDe('manager')).toEqual(INICIO_BLOCKS);
    expect(veTodoElInicio('owner')).toBe(true);
    expect(veTodoElInicio('manager')).toBe(true);
  });

  it('is her work for an Empleado, and for a role not yet read: never a figure of the shop', () => {
    for (const role of ['staff', null] as const) {
      expect(bloquesDe(role), String(role)).toEqual(['aviso', 'recorrido', 'puertas', 'ultimo', 'mas']);
      for (const figure of ['hoy', 'semana', 'racha', 'ahorros', 'recoleccion'] as const) {
        expect(bloquesDe(role), `${String(role)} ${figure}`).not.toContain(figure);
      }
    }
  });

  it('keeps the shop’s order — hers is the owner’s with bands taken out, never moved', () => {
    const order = INICIO_EMPLEADO.map((band) => INICIO_BLOCKS.indexOf(band));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('her doors', () => {
  it('gives an owner and an Encargado every door', () => {
    for (const role of ['owner', 'manager'] as const) {
      expect([...doorsFor('tarjeta', role), ...doorsFor('mas', role)]).toHaveLength(INICIO_DOORS.length);
    }
  });

  it('gives an Empleado, and a role not yet read, Vender, Comprar, Merma, Lo último and Ajustes — no more', () => {
    for (const role of ['staff', null] as const) {
      expect(doorsFor('tarjeta', role).map((d) => d.key), String(role)).toEqual(['vender', 'comprar', 'desperdicio']);
      expect(doorsFor('mas', role).map((d) => d.key), String(role)).toEqual(['documentos', 'ajustes']);
    }
  });

  it('never opens one of her doors onto a room she is sent back from', () => {
    for (const door of INICIO_DOORS.filter((d) => d.empleado)) {
      expect(cerradaAlEmpleado('staff', String(door.route)), door.key).toBe(false);
    }
    for (const door of INICIO_DOORS.filter((d) => !d.empleado && d.key !== 'solicitudes')) {
      expect(cerradaAlEmpleado('staff', String(door.route)), door.key).toBe(true);
    }
  });
});

describe('the rooms she is sent back from', () => {
  it('closes Números, Tu semana, Productos, Proveedores and what opens from them — to an Empleado', () => {
    for (const path of ['/numeros', '/semana', '/productos', '/catalogo', '/ficha/v1', '/producto/nuevo', '/producto/v1', '/precios/v1', '/costos/v1', '/proveedores', '/proveedor/nuevo', '/proveedor/p1']) {
      expect(cerradaAlEmpleado('staff', path), path).toBe(true);
    }
  });

  it('closes nothing to an owner, an Encargado, or a role not yet read — an owner is never moved while the roster answers', () => {
    for (const role of ['owner', 'manager', null] as const) {
      for (const room of CERRADAS_AL_EMPLEADO) expect(cerradaAlEmpleado(role, room), `${String(role)} ${room}`).toBe(false);
    }
  });

  it('leaves her work open, and matches a room by its name, never by its first letters', () => {
    for (const path of ['/', '/vender', '/comprar', '/desperdicio', '/documentos', '/ajustes', '/recorrido']) {
      expect(cerradaAlEmpleado('staff', path), path).toBe(false);
    }
    expect(cerradaAlEmpleado('staff', '/numerosx')).toBe(false);
  });

  // ⚠️ THE CENSUS: every route file under `src/app/` is on one side of the list,
  // so a room added later is a decision about who opens it, not a door left open.
  it('puts every route in the app on one side: closed to her, or one she may be on', () => {
    const OPEN_TO_HER = new Set([
      '/',
      '/vender',
      '/comprar',
      '/desperdicio',
      '/documentos',
      '/ajustes',
      '/recorrido',
      '/solicitudes',
      '/hola',
      '/entrar',
      '/bienvenida',
      '/auth/callback',
    ]);
    const root = fileURLToPath(new URL('../src/app', import.meta.url));
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const at = join(dir, name);
        if (statSync(at).isDirectory()) walk(at);
        else if (name.endsWith('.tsx') && !name.startsWith('_layout')) files.push(relative(root, at));
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const path =
        '/' +
        file
          .replace(/\.tsx$/, '')
          .split('/')
          .filter((part) => !/^\(.*\)$/.test(part) && part !== 'index')
          .map((part) => part.replace(/^\[.*\]$/, 'x'))
          .join('/');
      const closed = cerradaAlEmpleado('staff', path);
      expect(closed !== OPEN_TO_HER.has(path), `${file} → ${path} is on neither side, or on both`).toBe(true);
    }
  });
});

describe('Lo último: only what she recorded', () => {
  const mixed = docs('some', [doc('a', ELLA), doc('b', EL), doc('c', null), doc('d', ELLA)]);

  it('shows an owner and an Encargado the whole shop, unchanged', () => {
    expect(loQueRegistro(mixed, 'owner', EL)).toBe(mixed);
    expect(loQueRegistro(mixed, 'manager', EL)).toBe(mixed);
  });

  it('shows an Empleado the documents she recorded — not his, not one with no author', () => {
    expect(loQueRegistro(mixed, 'staff', ELLA).documents.map((d) => d.id)).toEqual(['a', 'd']);
  });

  it('shows a role not yet read hers alone too, and nobody’s with no session', () => {
    expect(loQueRegistro(mixed, null, ELLA).documents.map((d) => d.id)).toEqual(['a', 'd']);
    expect(loQueRegistro(mixed, 'staff', null).documents).toEqual([]);
  });

  it('says *nothing* when the shop has documents and none are hers — the read answered', () => {
    expect(loQueRegistro(docs('some', [doc('b', EL)]), 'staff', ELLA).state).toBe('nothing');
    expect(loQueRegistro(mixed, 'staff', ELLA).state).toBe('some');
  });

  it('keeps *not read yet* as it is, and what the hook answered beside the list', () => {
    const unread = docs('unknown', []);
    expect(loQueRegistro(unread, 'staff', ELLA).state).toBe('unknown');
    expect(loQueRegistro(mixed, 'staff', ELLA).failed).toBeNull();
  });

  it('answers every role, so no role falls through to the shop’s list by accident', () => {
    for (const role of EVERY_ROLE) {
      const shown = loQueRegistro(mixed, role, ELLA).documents.length;
      expect(shown, String(role)).toBe(veTodoElInicio(role) ? 4 : 2);
    }
  });
});
