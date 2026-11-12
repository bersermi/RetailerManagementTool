import { useState } from 'react';
import { Text } from 'react-native';

import { MIN_SCORES, minScorePatch, type MinScore } from '@/api/ajustes';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { FilaOpcion } from '@/ui/FilaOpcion';
import { Grupo } from '@/ui/Grupo';
import { Aclaracion, PantallaDeAjustes } from '@/ui/PantallaDeAjustes';

// ============================================================================
// *AJUSTES DE APARTADOS › QUIÉN PUEDE APARTAR* — plan task `10.5b-iv-c`, `10.5b-ii`'s final design
// (the page *Names, Records and Stars*, version 5, `ajustes`; the owner's round 4 of 2026-11-10:
// *"The feature not to be at plain view but in Ajustes on the Cocina for people that explore …
// 'Mas de 75%' 'Mas de 80%' or 'Mas de 85%' not other options for now"*). Four options and no
// others, *Todos* how every kitchen starts; saved on the tap (`min_score`, `0080`).
// ⚠️ ONE SCREEN DEEP AND NAMED NOWHERE ELSE: nothing on *Hoy* or *Apartados* says a rule is on.
// ⚠️ WHAT IT DOES, SAID ON IT: by her score (her share of thumbs up from every kitchen); someone
// with no score yet always passes; it applies when a neighbour reserves and cancels nobody.
// ============================================================================

const OPCIONES: readonly (MinScore | null)[] = [null, ...MIN_SCORES];

export default function AjustesDeApartados() {
  const [problema, setProblema] = useState<string | null>(null);
  const a = ES.ajustes.apartados;
  return (
    <PantallaDeAjustes titulo={a.titulo} problema={problema} setProblema={setProblema}>
      {({ ajustes, guardar, busy }) => (
        <>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{a.quien}</Text>
          <Grupo sinIconos>
            {OPCIONES.map((opcion) => (
              <FilaOpcion
                key={opcion ?? 'todos'}
                titulo={opcion === null ? a.todos : a.masDe(opcion)}
                elegida={ajustes.minScore === opcion}
                disabled={busy}
                onElegir={() => {
                  if (ajustes.minScore !== opcion) guardar(minScorePatch(opcion));
                }}
              />
            ))}
          </Grupo>
          <Aclaracion>{a.explica}</Aclaracion>
          <Aclaracion>{a.nuevas}</Aclaracion>
          <Aclaracion>{a.nadieSeCancela}</Aclaracion>
        </>
      )}
    </PantallaDeAjustes>
  );
}
