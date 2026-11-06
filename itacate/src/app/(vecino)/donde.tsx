import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDondeBuscar } from '@/lib/DondeBuscarProvider';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { CodigoPostal } from '@/ui/CodigoPostal';
import { Formulario } from '@/ui/Formulario';
import { Llega } from '@/ui/Llega';
import { Opcion } from '@/ui/Opcion';

// ============================================================================
// *DÓNDE BUSCAR* — HER LOCATION, OR A POSTAL CODE, AT HER PICK. Plan task `10.5-v-b`:
// a row of *Tú*, and *Cerca*'s *Cambiar*; the owner's answer 5 of 2026-11-05 (*"We can
// let the user pick the codigo postal or use her location"*), a postal code she types
// even with her location on.
//
// ⚠️ IT NEVER ASKS HER PHONE WHERE SHE IS: *Mi ubicación* only sets her pick back
// (`@/lib/DondeBuscarProvider`), and *Cerca* — the one screen that reads her location
// (`test/donde.test.ts`) — asks the phone, or shows the box and *Usar mi ubicación* when
// the phone will not say. A code is chosen when Google places it (`@/ui/CodigoPostal`,
// from her phone, kept in memory only); then she is taken back to where she came from.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================
export default function DondeBuscar() {
  const { codigo, elegirCodigo, elegirUbicacion } = useDondeBuscar();
  const [quiere, setQuiere] = useState<'ubicacion' | 'codigo'>(codigo === null ? 'ubicacion' : 'codigo');

  return (
    <Formulario style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Banda titulo={ES.donde.titulo} volver={{ label: ES.donde.volver, onPress: () => router.back() }} />
      <SafeAreaView edges={['bottom']} style={styles.cuerpo}>
        <Llega i={0}>
          <Opcion
            titulo={ES.donde.miUbicacion}
            detalle={ES.donde.miUbicacionDetalle}
            elegida={quiere === 'ubicacion'}
            onPress={() => {
              setQuiere('ubicacion');
              elegirUbicacion();
              router.back();
            }}
          />
        </Llega>
        <Llega i={1} style={styles.codigo}>
          <Opcion
            titulo={ES.donde.codigo}
            detalle={codigo === null ? ES.donde.codigoDetalle : ES.donde.codigoEnUso(codigo.cp)}
            elegida={quiere === 'codigo'}
            onPress={() => setQuiere('codigo')}
          />
          {quiere === 'codigo' && (
            <CodigoPostal
              motivo={null}
              onLugar={(nuevo) => {
                elegirCodigo(nuevo);
                router.back();
              }}
            />
          )}
        </Llega>
      </SafeAreaView>
    </Formulario>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: PALETTE.fondo },
  contenido: { flexGrow: 1 },
  cuerpo: { padding: SIZE.space * 1.5, gap: SIZE.space },
  codigo: { gap: SIZE.space },
});
