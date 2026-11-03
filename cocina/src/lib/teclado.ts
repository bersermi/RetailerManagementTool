// ============================================================================
// HOW FAR A FORM SCROLLS SO THE FIELD BEING TYPED IN STAYS ABOVE THE KEYBOARD.
// Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S RULE, COPIED (`app/src/lib/teclado.ts`, plan `8g`): from Android 15
// an app is drawn edge to edge and the system no longer shortens the window for
// the keyboard, so the app makes the room itself, as on iPhone. Wera's first user
// could not see the password he was typing until it did. `@/ui/Formulario`
// scrolls by this; pure, so `test/data-layer.test.ts` reads it.
// ============================================================================

/**
 * How far to scroll so a field ends `margin` above the keyboard — `0` when it
 * already does. All in the same window coordinates: the field's top and height
 * as `measureInWindow` gives them, the keyboard's top as its event does.
 */
export function desplazamiento(fieldTop: number, fieldHeight: number, keyboardTop: number, margin: number): number {
  return Math.max(0, fieldTop + fieldHeight + margin - keyboardTop);
}

/**
 * ⚠️ THIS APP'S OWN, NOT WERA'S (`10.4g-i`): how far to scroll so a SEARCH box
 * ends `margin` below the form's top — what opens under it, Google's suggestions
 * (`@/ui/Direccion`), then has the room down to the keyboard, where a box held
 * just above the keyboard would hide every row. Negative scrolls back, when the
 * box sits above that line. In window coordinates, as above: the box's top as
 * `measureInWindow` gives it, the form's top the same way.
 */
export function hastaArriba(fieldTop: number, formTop: number, margin: number): number {
  return fieldTop - formTop - margin;
}
