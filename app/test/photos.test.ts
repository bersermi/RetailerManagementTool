import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { VARIANT_COLUMNS, catalogFrom, type CatalogEntry, type VariantRow } from '@/api/catalog';
import {
  CATALOG_IMAGE_COLUMN,
  CATALOG_PHOTO_BUCKET,
  IMAGE_PATH_COLUMN,
  PHOTO_PX,
  SHOP_PHOTO_BUCKET,
  imagePatch,
  newPhotoPath,
  photoFile,
  photoKey,
  photoUrl,
  pictureOf,
} from '@/api/photos';
import { aislesOf } from '@/api/productPage';

// ============================================================================
// `8o` — PRODUCTOS, PART TWO: THE PHOTOS. The owner's rulings of 2026-10-17:
// Wera gives the photo of the catalog's products, whoever creates one may give
// his own or leave the initials, and Wera's cannot be changed. What a row
// wears, what its files are called, and where an aisle's picture comes from —
// the decisions; `docs/checks/8o-photos-contract.sh` holds the names to a real
// PostgREST and Storage API.
// ============================================================================

const SHOP = '6f1c2b0e-0000-4000-8000-00000000000a';
const UUID = '0b7d4c9a-1111-4222-8333-444455556666';

function entry(over: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    prebuilt: false,
    picture: null,
    id: 'v-1',
    name: 'Coca-Cola 600 ml',
    familyId: 'f-ref',
    familyName: 'Refrescos',
    priceUnit: 'pza',
    baseUnit: 'pza',
    centavos: 2000,
    perBase: '20.000000',
    price: '$20.00 / pza',
    initials: 'CC',
    term: 'coca-cola 600 ml refrescos',
    ...over,
  };
}

describe('the picture a row wears', () => {
  it("a product the shop made wears the shop's own photo, in producto", () => {
    expect(pictureOf({ image_path: `${SHOP}/${UUID}` })).toEqual({ bucket: SHOP_PHOTO_BUCKET, path: `${SHOP}/${UUID}` });
  });

  it("a product from Wera's catalog wears Wera's, in catalogo", () => {
    expect(pictureOf({ image_path: null, catalog_image_path: 'coca-cola-600-ml/a1b2c3d4' })).toEqual({
      bucket: CATALOG_PHOTO_BUCKET,
      path: 'coca-cola-600-ml/a1b2c3d4',
    });
  });

  it("the shop's own wins if a stale row ever carried both", () => {
    expect(pictureOf({ image_path: `${SHOP}/${UUID}`, catalog_image_path: 'coca-cola-600-ml/a1b2c3d4' })?.bucket).toBe(
      SHOP_PHOTO_BUCKET,
    );
  });

  it('none, a blank one, or a row persisted before 8o: its initials (C8.14)', () => {
    expect(pictureOf({ image_path: null, catalog_image_path: null })).toBeNull();
    expect(pictureOf({ image_path: '  ', catalog_image_path: '' })).toBeNull();
    expect(pictureOf({})).toBeNull();
  });

  it('the catalog read carries both columns, and each entry its picture', () => {
    expect(VARIANT_COLUMNS.split(',')).toEqual(expect.arrayContaining([IMAGE_PATH_COLUMN, CATALOG_IMAGE_COLUMN]));
    const row = (over: Partial<VariantRow>): VariantRow => ({
      id: 'v',
      name: 'X',
      family_id: 'f',
      price_unit_code: 'pza',
      base_unit_code: 'pza',
      is_active: true,
      template_code: null,
      is_prebuilt: false,
      product_family: { id: 'f', name: 'F' },
      price_list: [],
      ...over,
    });
    const [mine, wera, old] = catalogFrom(
      [
        row({ id: 'a', image_path: `${SHOP}/${UUID}` }),
        row({ id: 'b', is_prebuilt: true, template_code: 'cola', catalog_image_path: 'cola/ff00' }),
        row({ id: 'c' }),
      ],
      { pza: '1.000000' },
      null,
    );
    expect(mine?.picture?.bucket).toBe(SHOP_PHOTO_BUCKET);
    expect(wera?.picture).toEqual({ bucket: CATALOG_PHOTO_BUCKET, path: 'cola/ff00' });
    expect(old?.picture).toBeNull();
  });
});

describe("a picture's two files", () => {
  const picture = { bucket: SHOP_PHOTO_BUCKET, path: `${SHOP}/${UUID}` };

  it('are 160 and 720 px, the owner canvas sizes', () => {
    expect(PHOTO_PX).toEqual({ thumb: 160, large: 720 });
    expect(photoFile(picture, 'thumb')).toBe(`${SHOP}/${UUID}/160.jpg`);
    expect(photoFile(picture, 'large')).toBe(`${SHOP}/${UUID}/720.jpg`);
  });

  it('are kept on the phone under the bucket, so the two kinds never collide', () => {
    expect(photoKey(picture, 'thumb')).toBe(`producto/${SHOP}/${UUID}/160.jpg`);
    expect(photoKey({ bucket: CATALOG_PHOTO_BUCKET, path: 'cola/ff00' }, 'large')).toBe('catalogo/cola/ff00/720.jpg');
  });

  it("are read through Storage's authenticated door, whatever the address ends in", () => {
    expect(photoUrl('https://x.supabase.co/', picture, 'thumb')).toBe(
      `https://x.supabase.co/storage/v1/object/authenticated/producto/${SHOP}/${UUID}/160.jpg`,
    );
    expect(photoUrl('https://x.supabase.co', picture, 'thumb')).toBe(photoUrl('https://x.supabase.co/', picture, 'thumb'));
  });
});

describe("a new photo of the shop's", () => {
  it("goes under the shop's folder, lower-case — 0063 compares against workspace_id::text", () => {
    expect(newPhotoPath(SHOP.toUpperCase(), UUID.toUpperCase())).toBe(`${SHOP}/${UUID}`);
  });

  it('is put on the row by one column, and taken off with null', () => {
    expect(imagePatch(`${SHOP}/${UUID}`)).toEqual({ image_path: `${SHOP}/${UUID}` });
    expect(imagePatch(null)).toEqual({ image_path: null });
  });
});

describe("an aisle's picture is one of its products'", () => {
  it('the first in the list (the database orders by name) that has one', () => {
    const cola = { bucket: CATALOG_PHOTO_BUCKET, path: 'cola/1' };
    const fanta = { bucket: CATALOG_PHOTO_BUCKET, path: 'fanta/2' };
    const aisles = aislesOf([
      entry({ id: 'a', name: 'Agua mineral' }),
      entry({ id: 'b', name: 'Coca-Cola', picture: cola }),
      entry({ id: 'c', name: 'Fanta', picture: fanta }),
      entry({ id: 'd', name: 'Plátano', familyId: 'f-fru', familyName: 'Frutas' }),
    ]);
    expect(aisles.find((a) => a.familyId === 'f-ref')?.picture).toEqual(cola);
    expect(aisles.find((a) => a.familyId === 'f-fru')?.picture).toBeNull();
  });

  it('…even when the first product of the aisle is the one that has it', () => {
    const cola = { bucket: CATALOG_PHOTO_BUCKET, path: 'cola/1' };
    expect(aislesOf([entry({ picture: cola }), entry({ id: 'b', name: 'Fanta' })])[0]?.picture).toEqual(cola);
  });
});

describe('the photo is drawn over the initials, never instead of a state', () => {
  // ⚠️ RENDERING IS `R9`'s — the phone is the instrument. What is read here is the
  // one wiring rule a text read can see: every square that wears a product's
  // initials also carries `Foto`, so no screen was left drawing letters only.
  const read = (path: string) => readFileSync(resolve(__dirname, '..', 'src', path), 'utf8');

  it('Retrato, Productos, the product page and the photo field all lay Foto over the letters', () => {
    for (const file of ['ui/Retrato.tsx', 'app/productos.tsx', 'app/ficha/[id].tsx', 'ui/CampoFoto.tsx']) {
      expect(read(file), file).toMatch(/<Foto\b/);
    }
  });

  it('and every Retrato that names a product passes its picture', () => {
    for (const file of ['app/(tabs)/vender.tsx', 'app/(tabs)/comprar.tsx', 'app/(tabs)/desperdicio.tsx', 'ui/HojaPrecio.tsx']) {
      const text = read(file);
      const retratos = text.match(/<Retrato\b[^>]*?\/>/gs) ?? [];
      expect(retratos.length, file).toBeGreaterThan(0);
      for (const tag of retratos) expect(tag, file).toMatch(/picture=/);
    }
  });
});
