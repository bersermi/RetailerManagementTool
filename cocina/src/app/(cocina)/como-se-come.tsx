import { useState } from 'react';

import { comerPatch, esLaUnica } from '@/api/ajustes';
import { ES } from '@/strings';
import { FilaInterruptor } from '@/ui/FilaInterruptor';
import { Grupo } from '@/ui/Grupo';
import { Aclaracion, PantallaDeAjustes } from '@/ui/PantallaDeAjustes';

// ============================================================================
// *CÓMO SE COME* — plan task `10.5b-iv-c`, the family-shell page's sheet (stage 2, `srvSheet`;
// calls 26 and 27, ruled 2026-11-05): *Para llevar* (on at first) and *Para comer aquí* (off),
// at least one, saved on the tap (`para_llevar`, `para_aqui`, `0079`). Each offer can narrow
// them on *Publicar*; with both on, the neighbour picks when she reserves, *para llevar* first.
// ⚠️ THE LAST ONE ON CANNOT BE SWITCHED OFF (`esLaUnica`): the database refuses a kitchen with
// neither (`22023`), so the switch is drawn still, and *Al menos una* says why. The *desechable*
// is its own row (`10.5b-ii`'s final design: *Cómo se come*, then *El desechable*).
// ============================================================================

export default function ComoSeCome() {
  const [problema, setProblema] = useState<string | null>(null);
  const c = ES.ajustes.comer;
  return (
    <PantallaDeAjustes titulo={c.titulo} problema={problema} setProblema={setProblema}>
      {({ ajustes, guardar, busy }) => (
        <>
          <Aclaracion>{c.intro}</Aclaracion>
          <Grupo>
            <FilaInterruptor
              icono="shopping-outline"
              titulo={c.llevar}
              detalle={c.llevarDetalle}
              encendido={ajustes.llevar}
              fijo={esLaUnica(ajustes, 'llevar')}
              disabled={busy}
              onCambiar={(on) => {
                const patch = comerPatch(ajustes, 'llevar', on);
                if (patch !== null) guardar(patch);
              }}
            />
            <FilaInterruptor
              icono="silverware-fork-knife"
              titulo={c.aqui}
              detalle={c.aquiDetalle}
              encendido={ajustes.aqui}
              fijo={esLaUnica(ajustes, 'aqui')}
              disabled={busy}
              onCambiar={(on) => {
                const patch = comerPatch(ajustes, 'aqui', on);
                if (patch !== null) guardar(patch);
              }}
            />
          </Grupo>
          <Aclaracion>{c.nota}</Aclaracion>
        </>
      )}
    </PantallaDeAjustes>
  );
}
