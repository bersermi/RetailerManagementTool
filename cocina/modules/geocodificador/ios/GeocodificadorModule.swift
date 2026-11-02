// ============================================================================
// THE PHONE'S OWN GEOCODER ON AN IPHONE — APPLE'S — ASKED FOR AN ADDRESS SHE
// TYPED. Plan task `10.4d`, the owner's ruling of 2026-11-01. Its twin is
// `cocina/modules/geocodificador/android/…/GeocodificadorModule.kt`; the rules
// that read what it answers are `cocina/src/lib/buscar.ts`'s, pinned by
// `cocina/test/buscar.test.ts`.
//
// ⚠️ NO PERMISSION: `CLGeocoder` needs none, and nothing here reads where the
// phone is. ⚠️ NOTHING IS KEPT: the answer goes back to JavaScript, which only
// moves the map (Apple's licence forbids keeping it).
//
// ⚠️ ASKED AS IT WAS MEASURED (2026-10-31 and 2026-11-02): Mexico's Spanish, and
// the box the app passes (the Valle de México) as the circle around its centre
// that reaches its longer side's ends — Apple takes a region as a hint, not a
// fence, so JavaScript drops anything outside the box. Nothing found is an empty
// list; any other failure is a rejection, and JavaScript then asks LocationIQ.
// ============================================================================
import CoreLocation
import ExpoModulesCore

/// Metres in one degree of latitude (and of longitude at the equator).
private let metrosPorGrado = 111_320.0

public class GeocodificadorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Geocodificador")

    // caja: south, west, north, east — in degrees.
    AsyncFunction("buscar") { (pregunta: String, caja: [Double], limite: Int) async throws -> [[String: Any?]] in
      guard caja.count == 4 else {
        throw CajaInvalidaException()
      }
      let sur = caja[0], oeste = caja[1], norte = caja[2], este = caja[3]
      let centro = CLLocationCoordinate2D(latitude: (sur + norte) / 2, longitude: (oeste + este) / 2)
      let alto = (norte - sur) * metrosPorGrado
      let ancho = (este - oeste) * metrosPorGrado * cos(centro.latitude * .pi / 180)
      let region = CLCircularRegion(center: centro, radius: max(alto, ancho) / 2, identifier: "caja")
      let geocoder = CLGeocoder()
      do {
        let marcas = try await geocoder.geocodeAddressString(
          pregunta, in: region, preferredLocale: Locale(identifier: "es_MX"))
        return marcas.prefix(max(limite, 0)).compactMap(fila)
      } catch {
        let nsError = error as NSError
        if nsError.domain == kCLErrorDomain && nsError.code == CLError.Code.geocodeFoundNoResult.rawValue {
          return []
        }
        throw error
      }
    }
  }
}

/// One answer, as JavaScript reads it — or nothing, when it has no point.
private func fila(_ marca: CLPlacemark) -> [String: Any?]? {
  guard let punto = marca.location?.coordinate else {
    return nil
  }
  return [
    "latitude": punto.latitude,
    "longitude": punto.longitude,
    "calle": marca.thoroughfare,
    "numero": marca.subThoroughfare,
    "colonia": marca.subLocality,
    "ciudad": marca.locality,
    "estado": marca.administrativeArea,
    "cp": marca.postalCode,
  ]
}

private final class CajaInvalidaException: Exception {
  override var reason: String {
    "The box is four numbers: south, west, north, east"
  }
}
