import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  FILE_OF,
  FORMAS,
  LARGE_FILE,
  NINGUNA,
  PHOTO_BUCKET,
  PHOTO_SIDES,
  PHOTO_TYPE,
  SMALL_FILE,
  alreadyStored,
  bytesOf,
  cropFor,
  guardada,
  isPicturePath,
  newPicturePath,
  pathOf,
  photoFile,
  photoHeaders,
  photoUrl,
  pixelsOf,
  porSubir,
  ratioOf,
} from '@/api/fotos';

// ============================================================================
// A KITCHEN'S PICTURES (`@/api/fotos`, `@/lib/foto`). Plan task `10.5-ii`, on the
// bucket `0076` made (`10.5-i-a`).
//
// ⚠️ WHAT ONLY A REAL STORAGE API CAN SAY — that the bucket takes these files from
// her owner and managers, in her folder, and anyone signed in reads them — is
// `docs/checks/10.5-i-a-kitchen-photos-contract.sh`, which reads the bucket and
// the files' names out of `src/api/fotos.ts`. Here: the names held to `0076`'s
// TEXT and to Wera's twin files, the arithmetic of each shape, the bytes, and
// the wiring that keeps the camera in one module.
// ============================================================================

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const strip = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const code = (path: string) => strip(readFileSync(join(SRC, path), 'utf8'));
const MIGRATION = readFileSync(join(ROOT, '../supabase/migrations/0076_a_kitchens_own_page.sql'), 'utf8');
const wera = (path: string) => readFileSync(join(ROOT, '../app/src', path), 'utf8');

const KITCHEN = '11111111-2222-4333-8444-555555555555';
const PICTURE = '66666666-7777-4888-9999-aaaaaaaaaaaa';

describe('the bucket and its files, as `0076` made them', () => {
  it('is `0076`’s bucket, and every file is a type it takes', () => {
    const made = /insert into storage\.buckets \(id, name, public, file_size_limit, allowed_mime_types\)\s*values \('([a-z]+)', '([a-z]+)', false, (\d+),\s*array\[([^\]]+)\]\)/.exec(MIGRATION);
    expect(made?.[1]).toBe(PHOTO_BUCKET);
    const types = (made?.[4] ?? '').split(',').map((t) => t.trim().replace(/'/g, ''));
    expect(types).toContain(PHOTO_TYPE);
    expect(Number(made?.[3])).toBe(2 * 1024 * 1024);
    // its two walls name it
    expect(MIGRATION).toContain(`with check (bucket_id = '${PHOTO_BUCKET}'`);
    expect(MIGRATION).toContain(`using (bucket_id = '${PHOTO_BUCKET}'`);
  });

  it('two files per picture, named by their shorter side — Wera’s product photos to the pixel', () => {
    expect(LARGE_FILE).toBe(`${PHOTO_SIDES.grande}.jpg`);
    expect(SMALL_FILE).toBe(`${PHOTO_SIDES.chica}.jpg`);
    expect(FILE_OF).toEqual({ grande: '720.jpg', chica: '160.jpg' });
    expect(wera('api/photos.ts')).toMatch(/export const PHOTO_PX = \{ thumb: 160, large: 720 \} as const;/);
  });

  it('a cover is 16:9 and a logo and a dish are squares, the shorter side the file’s number', () => {
    expect(FORMAS).toEqual({ portada: [16, 9], logo: [1, 1], platillo: [1, 1] });
    expect(pixelsOf('portada', 'grande')).toEqual({ width: 1280, height: 720 });
    expect(pixelsOf('portada', 'chica')).toEqual({ width: 284, height: 160 });
    expect(pixelsOf('logo', 'grande')).toEqual({ width: 720, height: 720 });
    expect(pixelsOf('platillo', 'chica')).toEqual({ width: 160, height: 160 });
    expect(ratioOf('portada')).toBeCloseTo(16 / 9);
  });

  it('cuts the middle of a picture in its shape, whole pixels, inside it', () => {
    // a phone's 4:3 photo, lying and standing
    expect(cropFor(4032, 3024, 'portada')).toEqual({ originX: 0, originY: 378, width: 4032, height: 2268 });
    expect(cropFor(4032, 3024, 'platillo')).toEqual({ originX: 504, originY: 0, width: 3024, height: 3024 });
    expect(cropFor(3024, 4032, 'portada')).toEqual({ originX: 0, originY: 1165, width: 3024, height: 1701 });
    expect(cropFor(3024, 4032, 'logo')).toEqual({ originX: 0, originY: 504, width: 3024, height: 3024 });
    // already in shape: nothing cut
    expect(cropFor(1280, 720, 'portada')).toEqual({ originX: 0, originY: 0, width: 1280, height: 720 });
    expect(cropFor(500, 500, 'platillo')).toEqual({ originX: 0, originY: 0, width: 500, height: 500 });
    // a panorama: the sides go
    expect(cropFor(8000, 1000, 'portada')).toEqual({ originX: 3111, originY: 0, width: 1778, height: 1000 });
  });
});

describe('where a picture goes, and how a phone asks for it', () => {
  it('a new picture is `<kitchen>/<uuid>`, in lower case', () => {
    expect(newPicturePath(KITCHEN.toUpperCase(), PICTURE.toUpperCase())).toBe(`${KITCHEN}/${PICTURE}`);
  });

  it('is in her folder exactly when `picture_in_folder` says so', () => {
    const rule = /select p_path ~ \('\^' \|\| p_workspace_id::text\s*\|\| '([^']+)'\)/.exec(MIGRATION)?.[1];
    expect(rule).toBe('/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    const database = (path: string, kitchen: string) => new RegExp(`^${kitchen}${rule}`).test(path);
    const paths = [
      `${KITCHEN}/${PICTURE}`,
      `${KITCHEN}/${PICTURE.toUpperCase()}`,
      `${KITCHEN.toUpperCase()}/${PICTURE}`,
      `${KITCHEN}/${PICTURE}/720.jpg`,
      `${PICTURE}/${PICTURE}`,
      `${KITCHEN}/not-a-uuid`,
      `${KITCHEN}/${PICTURE}x`,
      '',
    ];
    for (const path of paths) expect(isPicturePath(path, KITCHEN), path).toBe(database(path, KITCHEN));
    expect(isPicturePath(newPicturePath(KITCHEN, PICTURE), KITCHEN)).toBe(true);
  });

  it('a file is its picture’s folder and its name; the door is Storage’s private one, with her token', () => {
    const path = `${KITCHEN}/${PICTURE}`;
    expect(photoFile(path, 'grande')).toBe(`${path}/720.jpg`);
    expect(photoUrl('https://x.supabase.co/', path, 'chica')).toBe(
      `https://x.supabase.co/storage/v1/object/authenticated/cocina/${path}/160.jpg`,
    );
    expect(photoHeaders('tok', 'sb_publishable_k')).toEqual({ Authorization: 'Bearer tok', apikey: 'sb_publishable_k' });
  });

  it('a file already there is a success — Wera’s `alreadyStored`, the same text', () => {
    const body = (text: string) =>
      (/export function alreadyStored\(error: unknown\): boolean \{([\s\S]*?)\n\}/.exec(text)?.[1] ?? '').replace(/\s+/g, ' ');
    expect(body(code('api/fotos.ts'))).not.toBe('');
    expect(body(code('api/fotos.ts'))).toBe(body(wera('api/collection.ts')));
    expect(alreadyStored({ statusCode: '409', message: 'The resource already exists' })).toBe(true);
    expect(alreadyStored({ statusCode: 409 })).toBe(true);
    expect(alreadyStored({ message: 'Duplicate' })).toBe(true);
    expect(alreadyStored({ statusCode: '403', message: 'new row violates row-level security policy' })).toBe(false);
    expect(alreadyStored(new TypeError('Network request failed'))).toBe(false);
  });
});

describe('the bytes that go up', () => {
  it('are the base64 the manipulator hands back, decoded exactly', () => {
    for (let n = 0; n < 40; n += 1) {
      const bytes = Buffer.from(Array.from({ length: n }, (_, i) => (i * 37 + n * 11) % 256));
      expect(Array.from(bytesOf(bytes.toString('base64'))), `${n} bytes`).toEqual(Array.from(bytes));
    }
    expect(Array.from(bytesOf('/9j/4A=='))).toEqual([0xff, 0xd8, 0xff, 0xe0]);
    expect(Array.from(bytesOf('/9j/\n4A=='))).toEqual([0xff, 0xd8, 0xff, 0xe0]);
  });

  it('refuses what is not base64, rather than sending a broken file', () => {
    expect(() => bytesOf('abc')).toThrow(RangeError);
    expect(() => bytesOf('ab$=')).toThrow(RangeError);
    expect(() => bytesOf('a=bc')).toThrow(RangeError);
  });
});

describe('a picture, as a form holds it', () => {
  it('none, saved or new — and what each sends', () => {
    expect(guardada(null)).toEqual(NINGUNA);
    expect(guardada('  ')).toEqual(NINGUNA);
    expect(guardada('k/p')).toEqual({ kind: 'guardada', path: 'k/p' });
    expect(pathOf(NINGUNA)).toBeNull();
    expect(pathOf(guardada('k/p'))).toBe('k/p');
    expect(pathOf({ kind: 'nueva', path: 'k/n', archivos: [] })).toBe('k/n');
  });

  it('only the new ones go up, each once', () => {
    const nueva = { kind: 'nueva', path: 'k/n', archivos: [] } as const;
    expect(porSubir([NINGUNA, guardada('k/p'), nueva, nueva])).toEqual([nueva]);
  });
});

describe('the wiring, read as text', () => {
  function sources(dir = SRC): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
    });
  }

  it('one module opens the camera and the gallery, Wera’s arrangement', () => {
    const importers = sources()
      .filter((path) => /from 'expo-image-(picker|manipulator)'/.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(SRC.length + 1));
    expect(importers).toEqual(['lib/foto.ts']);
  });

  it('asks no photo-library permission, and the build still asks for none', () => {
    const foto = code('lib/foto.ts');
    expect(foto).not.toMatch(/MediaLibraryPermissions/);
    expect(foto).toMatch(/launchImageLibraryAsync\(\{[\s\S]*?allowsEditing: false/);
    const config = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as { expo: { plugins: unknown[] } };
    const picker = config.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-image-picker') as [string, Record<string, unknown>];
    expect(picker[1].photosPermission).toBe(false);
  });

  it('every picture is re-encoded as a JPEG of its shape, which drops where it was taken', () => {
    const foto = code('lib/foto.ts');
    expect(foto).toMatch(/exif: false/);
    expect(foto).toMatch(/\.crop\(cropFor\(upright\.width, upright\.height, forma\)\)/);
    expect(foto).toMatch(/\.resize\(pixelsOf\(forma, size\)\)/);
    expect(foto).toMatch(/format: SaveFormat\.JPEG, base64: true/);
  });

  it('the pictures go up before her page is saved, and only when something changed', () => {
    const hooks = code('api/hooks.ts');
    const save = hooks.slice(hooks.indexOf('export function useSavePage'), hooks.indexOf('export function useFotoSource'));
    const nothing = save.indexOf('if (Object.keys(patch).length === 0) return input.saved;');
    const up = save.indexOf('await uploadPictures(porSubir([input.draft.cover, input.draft.logo]))');
    const sent = save.indexOf('return setKitchenPage(setPageArgs(input.kitchenId, patch))');
    expect(nothing).toBeGreaterThan(-1);
    expect(up).toBeGreaterThan(nothing);
    expect(sent).toBeGreaterThan(up);
  });

  it('a file goes up never overwriting, into the bucket, as a JPEG', () => {
    expect(code('api/calls.ts')).toMatch(
      /\.from\(PHOTO_BUCKET\)\s*\.upload\(`\$\{foto\.path\}\/\$\{archivo\.name\}`, bytesOf\(archivo\.base64\), \{ contentType: PHOTO_TYPE, upsert: false \}\)/,
    );
  });
});
