import { guardada, isPicturePath, type PhotoSize } from '@/api/fotos';
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
// ============================================================================

export function Foto({ path, cocinaId, size = 'chica' }: { path: string | null; cocinaId: string; size?: PhotoSize }) {
  if (path === null || !isPicturePath(path, cocinaId)) return null;
  return <SuFoto foto={guardada(path)} size={size} />;
}
