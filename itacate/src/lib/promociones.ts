import type { NombreIcono } from '@/marca/glifos';

import { DIAS, type Dia, type Tipo } from '@/api/cocinas';
import { ES } from '@/strings';

// ============================================================================
// A PROMOTION'S MARK AND ITS BAND, IN WORDS — WERA COCINA'S, COPIED. Plan task `10.9g-iii`: what a fonda
// was shown in *Así la verán en tu página* (`cocina/src/lib/promociones.ts`, `10.9g-ii`) is what her
// neighbour reads on her page, a dish and a card — the kind's picture, its mark (*Nuevo*, *De temporada*,
// *Los jueves*, *Con tu tarjeta de lealtad*), *hasta el 17 de diciembre*, what she offers and more.
// ⚠️ EVERY BLOCK BELOW IS A COPY: `test/gemelos.test.ts` holds each to `cocina/src/lib/promociones.ts` code for
// code, and its words (`ES.promociones`) to Wera Cocina's value for value — a change there is made here in the
// same PR. Only the imports differ: the kinds and days are `@/api/cocinas`' copies of Wera Cocina's.
// What the pages make of them — which band, which mark — is `@/lib/paginas`', and `@/ui/BandaPromocion` draws.
// ============================================================================

/** Each kind's picture — its tile on the form, its row, its chip in *Publicar* and its mark. Held to the glyph map. */
export const ICONO_DE_TIPO: Readonly<Record<Tipo, NombreIcono>> = {
  nuevo: 'creation',
  temporada: 'leaf',
  dia: 'calendar-star',
  clientes: 'gift-outline',
};

/** *Hasta el 30 de noviembre*: the day of the month and its month. */
export function delMes(dia: string): string {
  const [, m, d] = dia.split('-').map(Number);
  return ES.fechas.delMes(d, ES.fechas.meses[m - 1]);
}

/** Whether the days are all seven (*Todos*). */
export function sonTodos(dias: readonly Dia[]): boolean {
  return DIAS.every((d) => dias.includes(d));
}

/** *Todos los días*, *Los jueves*, *Los lunes, miércoles y viernes* — the drawing's `daysTxt`. */
export function diasTexto(dias: readonly Dia[]): string {
  if (sonTodos(dias)) return ES.promociones.todosLosDias;
  const nombres = DIAS.filter((d) => dias.includes(d)).map((d) => ES.promociones.losDias[d - 1]);
  const ultimo = nombres.pop() as string;
  return ES.promociones.los(nombres.length === 0 ? ultimo : `${nombres.join(', ')} y ${ultimo}`);
}

/** The mark her offers wear and her page's band carries (call 25): *Un día especial*'s is its days. */
export function marcaDe(tipo: Tipo, dias: readonly Dia[]): string {
  if (tipo === 'dia') return sonTodos(dias) ? ES.promociones.marcas.especial : diasTexto(dias);
  return ES.promociones.marcas[tipo];
}

/** One line, as the database keeps it: no line break, no tab, no control character — every run of space one space. */
export function enUnaLinea(texto: string): string {
  return texto
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The band as her page will show it (`@/ui/BandaPromocion`): the mark, *hasta el …*, what, more. */
export interface Banda {
  readonly tipo: Tipo;
  readonly marca: string;
  readonly hasta: string | null;
  readonly loQue: string;
  readonly mas: string | null;
}

export function bandaDe(p: { readonly tipo: Tipo; readonly dias: readonly Dia[]; readonly hasta: string | null; readonly loQue: string; readonly mas: string | null }): Banda {
  const loQue = enUnaLinea(p.loQue);
  const mas = p.mas === null ? null : enUnaLinea(p.mas);
  return {
    tipo: p.tipo,
    marca: marcaDe(p.tipo, p.dias),
    hasta: p.hasta === null ? null : ES.promociones.hastaEl(delMes(p.hasta)),
    loQue: loQue === '' ? ES.promociones.ejemplos[p.tipo] : loQue,
    mas: mas === '' ? null : mas,
  };
}
