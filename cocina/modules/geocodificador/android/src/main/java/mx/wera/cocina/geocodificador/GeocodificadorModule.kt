// ============================================================================
// THE PHONE'S OWN GEOCODER ON ANDROID — GOOGLE'S — ASKED FOR AN ADDRESS SHE
// TYPED. Plan task `10.4d`, the owner's ruling of 2026-11-01. Its twin is
// `cocina/modules/geocodificador/ios/GeocodificadorModule.swift`; the rules that
// read what it answers are `cocina/src/lib/buscar.ts`'s, pinned by
// `cocina/test/buscar.test.ts`.
//
// ⚠️ NO PERMISSION, AND THAT IS WHY THIS FILE EXISTS: `android.location.Geocoder`
// needs none, while `expo-location`'s `geocodeAsync` (57.0.20) refuses without the
// foreground location permission — which this app blocks (`app.json`) and never
// asks for. Nothing here reads where the phone is.
//
// ⚠️ NOTHING IS KEPT: the answer goes back to JavaScript, which only moves the
// map (Google's terms forbid keeping it). What is stored is what she typed and
// where she tapped.
//
// ⚠️ ASKED AS IT WAS MEASURED (2026-11-02): Mexico's Spanish, inside the box the
// app passes (the Valle de México), at most `limite` answers. Nothing found is an
// empty list; any failure is a rejection, and JavaScript then asks LocationIQ.
// ============================================================================
package mx.wera.cocina.geocodificador

import android.location.Address
import android.location.Geocoder
import android.os.Build
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

class GeocodificadorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Geocodificador")

    // caja: south, west, north, east — in degrees.
    AsyncFunction("buscar") { pregunta: String, caja: List<Double>, limite: Int, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      if (caja.size != 4) {
        promise.reject(ERROR, "The box is four numbers: south, west, north, east", null)
        return@AsyncFunction
      }
      // A phone without Google's services has no geocoder: JavaScript asks LocationIQ.
      if (!Geocoder.isPresent()) {
        promise.reject(ERROR, "This phone has no geocoder", null)
        return@AsyncFunction
      }
      val (sur, oeste, norte, este) = caja
      val geocoder = Geocoder(context, ESPANOL_DE_MEXICO)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        geocoder.getFromLocationName(pregunta, limite, sur, oeste, norte, este, object : Geocoder.GeocodeListener {
          override fun onGeocode(addresses: MutableList<Address>) {
            promise.resolve(addresses.mapNotNull(::fila))
          }

          override fun onError(errorMessage: String?) {
            promise.reject(ERROR, errorMessage ?: "The geocoder failed", null)
          }
        })
      } else {
        // Before Android 13 the call blocks; an AsyncFunction runs off the main thread.
        try {
          @Suppress("DEPRECATION")
          val addresses = geocoder.getFromLocationName(pregunta, limite, sur, oeste, norte, este) ?: emptyList()
          promise.resolve(addresses.mapNotNull(::fila))
        } catch (failure: Exception) {
          promise.reject(ERROR, failure.message ?: "The geocoder failed", failure)
        }
      }
    }
  }

  /** One answer, as JavaScript reads it — or nothing, when it has no point. */
  private fun fila(address: Address): Map<String, Any?>? {
    if (!address.hasLatitude() || !address.hasLongitude()) return null
    return mapOf(
      "latitude" to address.latitude,
      "longitude" to address.longitude,
      "calle" to address.thoroughfare,
      "numero" to address.subThoroughfare,
      "colonia" to address.subLocality,
      "ciudad" to address.locality,
      "estado" to address.adminArea,
      "cp" to address.postalCode,
    )
  }

  private companion object {
    const val ERROR = "ERR_GEOCODIFICADOR"

    /** Mexico's Spanish: the answers' names as she would write them. */
    val ESPANOL_DE_MEXICO: Locale = Locale.Builder().setLanguage("es").setRegion("MX").build()
  }
}
