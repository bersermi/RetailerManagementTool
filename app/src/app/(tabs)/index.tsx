import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { placeholderGrossCentavos } from '@/wiring';

// ============================================================================
// ⚠️ STILL NOT INICIO. §2.8's Inicio is today's takings, today's count, and
// anything expiring within 48 hours — none of which exists yet, because none of
// it has a query behind it in this app. Área 13 added the module cards. All of
// that is `5d`.
//
// ⚠️⚠️ THE TWO TEMPORARY BLOCKS `5a-ii` PUT HERE ARE GONE, AND THIS IS THE TASK
// THAT WAS NAMED TO DELETE THEM. Both said so in their own comments — *"whoever
// builds Ajustes deletes this block"* — and both are now on a surface that is
// not going anywhere:
//
//   * the density switch, which `5a-iii-b` refused to persist while it lived
//     here, because *"persisting it behind a placeholder switch would put the
//     write in the file that gets deleted"*. It is persisted now (`5b-ii-a`).
//   * `Cerrar sesión`, which was here so that `5a-iv` could DEMONSTRATE C1.4 —
//     the only way to tell a session that survived from one that was never
//     asked for is to end one deliberately and be asked again.
//
// ⚠️ THE LOG-OUT IS STILL REACHABLE IN TWO TAPS, and that matters to a dated
// obligation rather than to a preference: the `5a-iv-d` day-8 and day-30
// readings both end by signing out, and a control that had moved somewhere
// unreachable would have broken the instrument rather than the app.
//
// WHAT IS LEFT HERE: the money formatter at whatever size the mode says — the
// one thing `5a-ii` could only claim on a machine and can be LOOKED AT on a
// phone — and the way into Ajustes.
// ============================================================================

export default function Inicio() {
  const { scale } = useDensity();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: PALETTE.fondo,
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale.space * 2,
      }}
    >
      <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>
        {formatMXN(placeholderGrossCentavos())}
      </Text>

      <Ajustes />
    </View>
  );
}

/**
 * The way into the sheet.
 *
 * ⚠️⚠️ IT IS A BUTTON IN THE MIDDLE OF A PLACEHOLDER, AND THAT IS NOT WHERE IT
 * ENDS UP. §2.8's Inicio — as amended by área 13 — puts state at the top and the
 * module cards below it, and Ajustes belongs with the rows to Productos and
 * Proveedores rather than alone in the centre of an empty screen. `5d` builds
 * that screen and places this properly. ⚠️ THE ALTERNATIVE WAS A HEADER ICON,
 * refused because the tab shell's header is react-navigation's and a
 * `headerRight` here would be the first navigation option this app sets for
 * decoration — and C12.1 forbids an icon with no word beside it, which a header
 * corner has no room for.
 *
 * ⚠️ `router.push` AND NOT `replace`: a sheet you come back from is the whole
 * reason §2.8 made it a sheet.
 */
function Ajustes() {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/ajustes')}
      style={{
        minHeight: scale.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space * 1.5,
        borderRadius: scale.space / 2,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      {/* C12.1 — the icon NEVER appears without its word. */}
      <MaterialCommunityIcons name="cog-outline" size={scale.iconSize} color={PALETTE.tinta} />
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>{ES.settings.title}</Text>
    </Pressable>
  );
}
