// ============================================================================
// ⚠️ ITACATE'S COPY OF WERA COCINA'S `cocina/src/lib/escaner.ts` (plan `10.9e-iii`: *Escanear* and *Mi código*),
// held to it code for code by `test/gemelos.test.ts` — a fix to one is a fix to both, in one PR.
// WHAT THE SCANNER'S BOX SHOWS, FROM THE CAMERA'S PERMISSION ALONE. Plan task `10.9c` (`@/ui/Escaner`).
//
// ⚠️ THE PHONE ASKS ONLY WHEN SHE TAPS (the row: *asked the first time she taps Escanear*): a permission
// never asked is a button, and the tap asks. Allowed — here, or by *Tomar foto*, which asks for the same
// camera — the box is the camera at once. Refused, it says so with the typed box as the way, and offers to
// ask again while the phone still will (Android, after one *No*); once it will not (an iPhone after one
// *No*, Android after two), the button opens the app's settings instead. Nothing here is remembered: the
// phone's answer is the whole state, read again when she comes back from its settings.
// ============================================================================

/** The part of `expo-camera`'s permission answer the box reads (`useCameraPermissions`). */
export interface PermisoDeCamara {
  readonly granted: boolean;
  readonly status: 'granted' | 'denied' | 'undetermined';
  readonly canAskAgain: boolean;
}

export type CajaDelEscaner =
  /** The answer is not read yet: the button, not yet tappable. */
  | 'leyendo'
  /** Never asked: a button; the tap asks. */
  | 'boton'
  /** Allowed: the camera. */
  | 'camara'
  /** Refused, and the phone will ask again: why, and a button that asks. */
  | 'negada'
  /** Refused for good: why, and the way to the app's settings. */
  | 'ajustes';

export function cajaDelEscaner(permiso: PermisoDeCamara | null): CajaDelEscaner {
  if (permiso === null) return 'leyendo';
  if (permiso.granted) return 'camara';
  if (permiso.status === 'undetermined') return permiso.canAskAgain ? 'boton' : 'ajustes';
  return permiso.canAskAgain ? 'negada' : 'ajustes';
}
