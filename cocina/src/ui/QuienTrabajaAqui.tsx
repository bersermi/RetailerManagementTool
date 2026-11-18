import { useState } from 'react';
import { Text, View } from 'react-native';

import { detalleDePersona, equipoDe, nombreDePersona, type Persona, type Rol } from '@/api/equipo';
import { useEquipo, useQuitar, useServicios } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { quitarTexto } from '@/lib/ayudante';
import { useNota } from '@/lib/NotaProvider';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Fila } from '@/ui/Fila';
import { Grupo } from '@/ui/Grupo';
import { HojaConfirmar } from '@/ui/HojaConfirmar';

// ============================================================================
// *QUIÉN TRABAJA AQUÍ* — THE OWNER'S LIST, IN HER *MI COCINA*. Plan task `10.9b-ii`, the owner's
// rulings of 2026-11-16 and 17 (G18, G19: the owner removes a helper from this list; the
// family-shell page's `teamRows` and `quitarSheet`, round 7). Each person by name and role — her own
// row *Dueña · tú* — and a helper's opening *¿Quitar a Lupita de tu cocina?*: *Su teléfono deja de
// ver tu cocina* (`@/lib/ayudante`' `quitarTexto`: and, with the card, her code to stamp). *Quitar a
// Lupita* waits for the database; then *Quitaste a Lupita de tu cocina* with *Deshacer*, 8 seconds.
//
// ⚠️ DRAWN ONLY WHILE SOMEONE ELSE WORKS HERE — UNTIL `10.9b-iii` BRINGS *INVITAR A ALGUIEN*, which
// makes the section always drawn. Today every kitchen's list is its owner alone, and a section of
// one row with nothing to do is space taken from her (his ruling G31: less pressure on her screens).
// ⚠️ READ ON THE OWNER'S PHONE ALONE (`useEquipo`'s `rol`): this component is the owner's
// *Mi cocina*'s, and the read is not even made for anyone else. The rules are `@/api/equipo`'s,
// pinned by `test/equipo.test.ts`. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its
// instrument.
// ============================================================================

export function QuienTrabajaAqui({ kitchenId, rol }: { kitchenId: string; rol: Rol | null | undefined }) {
  const { session } = useAuth();
  const equipo = useEquipo(kitchenId, rol);
  const servicios = useServicios(kitchenId);
  const { quitar, deshacer, busy } = useQuitar(kitchenId);
  const { avisar } = useNota();
  const [abierta, setAbierta] = useState<Persona | null>(null);

  const personas = equipoDe(equipo.data, session?.user.id ?? null);
  if (personas.length < 2 && abierta === null) return null;

  const seccion = { fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.tintaApagada } as const;

  async function confirmar(persona: Persona): Promise<string | null> {
    const problema = await quitar(persona.userId);
    if (problema !== null) return problema;
    const nombre = nombreDePersona(persona);
    setAbierta(null);
    avisar(ES.equipo.quitada(nombre), () => deshacer(persona.userId), { hecho: ES.equipo.sigue(nombre), fallo: ES.equipo.noSigue });
    return null;
  }

  return (
    <View style={{ gap: SIZE.rowGap }}>
      <Text style={seccion}>{ES.equipo.seccion}</Text>
      <Grupo>
        {personas.map((persona) => (
          <Fila
            key={persona.userId}
            icono="account-outline"
            titulo={nombreDePersona(persona)}
            detalle={detalleDePersona(persona)}
            onPress={persona.quitable ? () => setAbierta(persona) : undefined}
          />
        ))}
      </Grupo>
      <HojaConfirmar
        visible={abierta !== null}
        titulo={abierta === null ? '' : ES.equipo.quitarTitulo(nombreDePersona(abierta))}
        texto={quitarTexto(servicios.data)}
        confirmar={abierta === null ? '' : ES.equipo.quitar(nombreDePersona(abierta))}
        confirmando={ES.equipo.quitando}
        cancelar={ES.equipo.cancelar}
        ocupado={busy}
        onConfirmar={() => (abierta === null ? Promise.resolve(null) : confirmar(abierta))}
        onCerrar={() => setAbierta(null)}
      />
    </View>
  );
}
