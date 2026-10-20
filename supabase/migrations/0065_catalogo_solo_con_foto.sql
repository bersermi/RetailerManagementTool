-- ============================================================================
-- 0065 — THE DEFAULT CATALOG KEEPS WHAT HAS A PHOTO. The owner's ruling of
-- 2026-10-20, with his photos uploaded:
--
--   *"I dodged some products for now, mainly in abarrotes: Bebidas Alcoholicas,
--   Cigarros and Mascotas. Also, if you don't see I added the photo, you can
--   assume I also want to remove those products from the default catalog.
--   Give me the report of what will be removed … Let's do it."*
--
-- Measured against his folders (`~/RetailerToolDev/wera-fotos/<Giro>/<Pasillo>/
-- <codigo>.<ext>`, matched by `codigo` in any giro's folder): 1,158 of the 1,413
-- products have a photo; 137 more are pets, alcohol or tobacco — the three
-- aisles he left for later (`cat-mascotas`, `cat-alcohol`, `cat-tabaco`) — and
-- STAY; the other 118 go. ⚠️ Two of the 137 sit under *A granel* in his folders
-- (croquetas para perro and para gato, sold loose) but carry `cat-mascotas`; they
-- are pet food, so they wait with Mascotas rather than go on a filing detail.
-- One file named by a download (`f0bf5680-….avif` in Higiene personal) was
-- Papel higiénico Pétalo's photo — looked at, renamed to its code, and kept.
--
-- The 118, by giro and aisle:
--   Abarrotes · A granel: 1
--   Abarrotes · Azúcar y endulzantes: 2
--   Abarrotes · Botanas: 14
--   Abarrotes · Básicos: 3
--   Abarrotes · Café, chocolate y cereales: 5
--   Abarrotes · Carnes frías: 1
--   Abarrotes · Dulces y chocolates: 2
--   Abarrotes · Enlatados y conservas: 12
--   Abarrotes · Galletas: 21
--   Abarrotes · Limpieza: 2
--   Abarrotes · Lácteos: 2
--   Abarrotes · Pan y pastelitos: 11
--   Abarrotes · Refrescos: 20
--   Abarrotes · Salsas y condimentos: 4
--   Cremería · Carnes frías a granel: 2
--   Cremería · Cremas a granel: 1
--   Cremería · Lácteos: 1
--   Cremería · Salsas y condimentos: 11
--   Materias Primas · Básicos: 2
--   Materias Primas · Desechables: 1
--
-- ⚠️ WHAT IT DOES NOT TOUCH. A shop's copy of a product (`product_variant`) is the
-- shop's own row: it points at the template by `template_code`, a plain code
-- with NO foreign key (`0044`), so the hosted shops' copies of these products
-- stay exactly as they are — sold, priced, retirable — and simply have no Wera
-- photo to show, as they had none before. `catalogo.product_tag` rows go with
-- their products (`on delete cascade`, `0044`); no family is left empty
-- (measured). The rows themselves are recoverable from `0045`–`0052`, which
-- inserted them.
--
-- ⚠️ IT REFUSES TO REMOVE ANY OTHER NUMBER THAN 118, so a catalog that has moved
-- since the measurement stops the migration instead of deleting a guess — which
-- is how this file's own first draft was caught: a comma lost between its last
-- two codes joined them into one code that matched nothing.
-- ============================================================================

do $$
declare v_gone integer;
begin
  delete from catalogo.product
   where code in (
  -- Abarrotes · A granel (1)
  'azucar-refinada-a-granel',
  -- Abarrotes · Azúcar y endulzantes (2)
  'azucar-estandar-1-kg',
  'canderel',
  -- Abarrotes · Botanas (14)
  'chips-barcel-sal-de-mar-grande',
  'chips-barcel-sal-de-mar-individual',
  'doritos-dinamita-nacho',
  'fritos-original',
  'hot-nuts-barcel-mix',
  'ruffles-mega-crunch-grande',
  'ruffles-mega-crunch-individual',
  'runners-barcel-flamin',
  'sabritas-habanero-grande',
  'sabritas-mix',
  'takis-xplosion-grande',
  'tostachos-barcel',
  'tostitos-original-grande',
  'tostitos-original-individual',
  -- Abarrotes · Básicos (3)
  'avena-3-minutos',
  'harina-de-maiz-minsa-1-kg',
  'harina-de-trigo-tres-estados-1-kg',
  -- Abarrotes · Café, chocolate y cereales (5)
  'cafe-combate',
  'chocapic',
  'chocolate-express',
  'nescafe-clasico-42-g',
  'te-mccormick-limon',
  -- Abarrotes · Carnes frías (1)
  'mortadela-zwan',
  -- Abarrotes · Dulces y chocolates (2)
  'dulces-enchilados-surtidos',
  'ricos-besos-ricolino',
  -- Abarrotes · Enlatados y conservas (12)
  'atun-dolores-light-en-agua',
  'atun-dolores-con-verduras',
  'atun-mazatun',
  'chiles-la-costena-jalapenos-enteros-lata-mediana',
  'chiles-la-costena-nachos-lata-mediana',
  'duraznos-en-almibar-herdez',
  'ensalada-de-legumbres-la-costena',
  'frijoles-refritos-isadora-charros-bolsa-430-g',
  'frijoles-refritos-la-costena-negros-lata-430-g',
  'frijoles-refritos-la-costena-peruanos-bolsa',
  'frijoles-refritos-la-costena-peruanos-lata-580-g',
  'sardinas-calmex-en-chile-425-g',
  -- Abarrotes · Galletas (21)
  'animalitos-gamesa',
  'arcoiris-gamesa-paquete-familiar',
  'bran-frut-marinela-manzana',
  'club-social',
  'emperador-gamesa-nuez-paquete-familiar',
  'galletas-donde-arcoiris',
  'galletas-donde-marias',
  'hojaldras-gamesa',
  'mamut-gamesa-paquete-familiar',
  'marias-cuetara',
  'oreo-doble-relleno-paquete-familiar',
  'oreo-doble-relleno-paquete-individual',
  'oreo-doble-relleno-tubo',
  'oreo-fresa-paquete-familiar',
  'oreo-fresa-paquete-individual',
  'oreo-fresa-tubo',
  'pancrema',
  'polvorones-marinela-chocolate',
  'populares-gamesa',
  'principe-marinela-vainilla-individual',
  'principe-marinela-vainilla-paquete-familiar',
  -- Abarrotes · Limpieza (2)
  'esponja',
  'flash',
  -- Abarrotes · Lácteos (2)
  'danonino-durazno',
  'danonino-platano',
  -- Abarrotes · Pan y pastelitos (11)
  'bagels-oroweat',
  'bimbollos-integrales',
  'bolillo',
  'choco-roles-marinela',
  'oroweat-avena',
  'pan-blanco-bimbo-jumbo',
  'pan-blanco-wonder-chico',
  'pan-para-hamburguesa-oroweat',
  'telera',
  'tortillas-de-harina-tia-rosa',
  'tostadas-charras',
  -- Abarrotes · Refrescos (20)
  'big-citrus-3-3-l',
  'big-cola-1-8-l',
  'big-cola-400-ml',
  'big-cola-600-ml',
  'jarritos-fresa-2-l',
  'jarritos-fresa-600-ml',
  'jarritos-fresa-vidrio-370-ml',
  'jarritos-jamaica-2-l',
  'jarritos-jamaica-600-ml',
  'jarritos-jamaica-vidrio-370-ml',
  'jarritos-limon-vidrio-370-ml',
  'jarritos-mandarina-vidrio-370-ml',
  'jarritos-pina-vidrio-370-ml',
  'jarritos-tamarindo-vidrio-370-ml',
  'jarritos-toronja-vidrio-370-ml',
  'jarritos-tutifruti-vidrio-370-ml',
  'lulu-fresa-600-ml',
  'lulu-mandarina-600-ml',
  'lulu-pina-600-ml',
  'mountain-dew-600-ml',
  -- Abarrotes · Salsas y condimentos (4)
  'consome-maggi',
  'salsa-lucas',
  'salsa-tapatio',
  'salsa-inglesa-lea-perrins',
  -- Cremería · Carnes frías a granel (2)
  'jamon-de-pierna',
  'pastel-de-pollo',
  -- Cremería · Cremas a granel (1)
  'crema-acida',
  -- Cremería · Lácteos (1)
  'mantequilla-president-200-g',
  -- Cremería · Salsas y condimentos (11)
  'mole-dona-maria-adobo-vaso',
  'mole-coloradito-mayordomo',
  'mole-negro-guelaguetza',
  'mole-negro-mayordomo',
  'mole-poblano-la-costena-lata',
  'mole-rojo-rogelio-bueno',
  'pipian-rogelio-bueno',
  'recado-rojo-el-yucateco',
  'salsa-roja-la-costena',
  'salsa-verde-la-costena',
  'salsa-botanera-clemente-jacques',
  -- Materias Primas · Básicos (2)
  'grenetina-duche',
  'levadura-fresca-nevada',
  -- Materias Primas · Desechables (1)
  'vasito-gelatinero-1-oz-paquete'
   );
  get diagnostics v_gone = row_count;
  if v_gone <> 118 then
    raise exception '0065: expected to remove 118 products without a photo, removed %', v_gone;
  end if;
end $$;
