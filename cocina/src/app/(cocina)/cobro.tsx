import { useState } from 'react';

import { pagoPatch } from '@/api/ajustes';
import { ES } from '@/strings';
import { PALETTE } from '@/theme/palette';
import { FilaInterruptor } from '@/ui/FilaInterruptor';
import { Grupo } from '@/ui/Grupo';
import { Aclaracion, PantallaDeAjustes } from '@/ui/PantallaDeAjustes';

// ============================================================================
// *CÓMO TE PAGAN* — plan task `10.5b-iv-c`, the family-shell page's sheet (stage 2, `cobroSheet`,
// ruled 2026-11-05): *Efectivo*, always; *Tarjeta*, with her own terminal; *Transferencia*, to
// her account by SPEI — each a switch, off at first, saved on the tap (`accepts_card`,
// `accepts_transfer`, `0079`). Itacate shows the neighbour these, and she picks one beside
// *Apartar*. ⚠️ ONLY THE METHOD: no account, card or amount is asked, kept or shown — with
// *Transferencia* on, the line under it says so. Pushed over *Mi cocina*, a screen rather than
// the drawing's sheet: one way to every setting, and *‹ Mi cocina* to go back.
// ============================================================================

export default function Cobro() {
  const [problema, setProblema] = useState<string | null>(null);
  const c = ES.ajustes.cobro;
  return (
    <PantallaDeAjustes titulo={c.titulo} problema={problema} setProblema={setProblema}>
      {({ ajustes, guardar, busy }) => (
        <>
          <Grupo>
            <FilaInterruptor icono="cash" titulo={c.efectivo} detalle={c.efectivoDetalle} encendido fijo />
            <FilaInterruptor
              icono="credit-card-outline"
              titulo={c.tarjeta}
              detalle={c.tarjetaDetalle}
              encendido={ajustes.tarjeta}
              disabled={busy}
              onCambiar={(on) => guardar(pagoPatch('tarjeta', on))}
            />
            <FilaInterruptor
              icono="bank-transfer"
              titulo={c.transferencia}
              detalle={c.transferenciaDetalle}
              encendido={ajustes.transferencia}
              disabled={busy}
              onCambiar={(on) => guardar(pagoPatch('transferencia', on))}
            />
          </Grupo>
          {ajustes.transferencia && <Aclaracion color={PALETTE.accion}>{c.notaTransferencia}</Aclaracion>}
          <Aclaracion>{c.nota}</Aclaracion>
        </>
      )}
    </PantallaDeAjustes>
  );
}
