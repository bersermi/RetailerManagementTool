import { createContext, useContext } from 'react';

import { guardada, isPicturePath, type Foto as Slot, type PhotoSize } from '@/api/fotos';
import { Foto as SuFoto } from '@/ui/Foto';

// ============================================================================
// ONE OF HER PICTURES, ON ITACATE'S TWO PAGES INSIDE WERA COCINA. Plan task
// `10.5-v-c-ii`. ⚠️ NOT A COPY, THE ONE PART THAT IS NOT: Itacate's `Foto`
// (`itacate/src/ui/Foto.tsx`) asks for a picture by its path and her kitchen, keeps it
// in memory only, and draws nothing for a path outside her folder. Here the same
// signature hands the path to Wera Cocina's own `Foto` (`@/ui/Foto`) — the pictures
// are hers, on her phone, kept on its disk as her page's editor keeps them — after the
// same folder check, so the copied pages draw what Itacate's draw. Like Itacate's, it
// draws nothing until there is a picture, over the slot's default.
//
// ⚠️ `10.5-v-d`: A PHOTO SHE HAS JUST TAKEN IS NOT IN THE BUCKET YET — it goes up when she
// presses *Publicar* (`@/api/hooks`' `usePublish`). So the card at the foot of *Tu oferta
// de hoy* hands this part her new photos by their paths (`RecienTomadas`), and a path
// found there is drawn from the phone's own file, as her form's photo slot draws it.
// ============================================================================

/** The photos taken on the form and not yet sent, by the path each will be saved under. */
export const RecienTomadas = createContext<ReadonlyMap<string, Slot>>(new Map());

export function Foto({ path, cocinaId, size = 'chica' }: { path: string | null; cocinaId: string; size?: PhotoSize }) {
  const recien = useContext(RecienTomadas);
  if (path === null || !isPicturePath(path, cocinaId)) return null;
  return <SuFoto foto={recien.get(path) ?? guardada(path)} size={size} />;
}
