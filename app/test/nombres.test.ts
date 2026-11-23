import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ES } from '@/strings';

// ============================================================================
// THE NAMES. Plan task `13.2` — the owner's ruling of 2026-11-22: *"Wera: tu tienda ->
// Wera Tienda. Wera Cocina se queda como está. Itacate se vuelve Wera."*
//
// Since that day *Wera* alone is the neighbours' app, so a sentence that sends a person
// to THIS app says *Wera Tienda* — above all the ones that leave the phone (an
// invitation, a request, a forgotten password): whoever reads them may hold the
// neighbours' Wera too. *Wera* stays where it is the company acting — it buys, it picks
// up, you write to it — which is the family's name in every app.
//
// ⚠️ THE NAME UNDER THE ICON CAME WITH `13.4` (Wera 1.2.0): `app.json`'s `name` (and the
// camera's sentence) are native, and changing either moves the runtime of the builds in the
// field (measured at `13.2`: iOS `72c82608` → `16a791ea`), so `13.2` left both to the store
// version that `13.4` builds; 1.1's phones take them from their store.
// ============================================================================

const APP_JSON = JSON.parse(readFileSync(fileURLToPath(new URL('../app.json', import.meta.url)), 'utf8')).expo;

describe('13.2: a sentence that sends a person to this app names Wera Tienda', () => {
  // Asserted as text, never read back from `ES` into itself.
  it('the invitation, from Invitar and from Quién entra a tu tienda', () => {
    const dicho = 'Te invité a La Güera en Wera Tienda. Abre Wera Tienda, toca «Me invitaron a una tienda» y escribe este código: ABC123';
    expect(ES.invite.shareMessage('La Güera', 'ABC123')).toBe(dicho);
    expect(ES.members.shareMessage('La Güera', 'ABC123')).toBe(dicho);
  });

  it('her request to the owner, and what the owner reads while nobody has asked', () => {
    expect(ES.join.pending.tellMessage('La Güera')).toBe(
      'Hola, te pedí entrar a La Güera en Wera Tienda. Ábrela y entra a Solicitudes para dejarme entrar.',
    );
    expect(ES.approvals.emptyHint).toBe(
      'Cuando alguien escriba el código de tu tienda en Wera Tienda, aparece aquí y tú decides si entra.',
    );
  });

  it('the chat for a forgotten password, so the owner knows which app is asking', () => {
    expect(ES.auth.forgotMessage).toBe('Hola, olvidé mi contraseña de Wera Tienda.');
  });

  it('its name on the first screen', () => {
    expect(ES.hola.name).toBe('Wera Tienda');
  });
});

describe('13.2: Wera, the company, keeps the family’s name', () => {
  it('it buys and picks up, and you write to it', () => {
    expect(ES.recorrido.teLoCompro).toBe('Si algo está por caducar, Wera te lo compra y pasa por él.');
    expect(ES.collection.tell).toBe('Avisar a Wera por WhatsApp');
    expect(ES.home.rescued.line).toBe('Que la Wera te compró.');
  });
});

describe('13.4: the name under the icon is Wera Tienda', () => {
  it('app.json names Wera Tienda, and so does the iPhone’s camera question — both native', () => {
    expect(APP_JSON.name).toBe('Wera Tienda');
    const camara = (APP_JSON.plugins as unknown[]).find(
      (p): p is [string, { cameraPermission: string }] => Array.isArray(p) && p[0] === 'expo-image-picker',
    );
    expect(camara?.[1].cameraPermission).toBe('Wera Tienda usa la cámara para tomar fotos de tus productos.');
  });
});
