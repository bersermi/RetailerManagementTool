// ============================================================================
// WERA'S CATALOG PHOTOS, SCALED — the half of `catalog-photos.sh` that touches
// pixels. Plan task `8o`.
//
//   swift docs/runbooks/catalog-photos.swift <photo> <out-dir>
//
// Writes <out-dir>/720.jpg and <out-dir>/160.jpg — the WHOLE photo, upright,
// fitted into the square on white, at 70 % JPEG — and prints the two byte counts
// and the photo's longer side in pixels (under 720, the product's page shows it
// soft).
//
// ⚠️ FITTED, NOT CUT — THE OPPOSITE OF THE APP'S CAMERA (`app/src/capture/
// photo.ts`), AND ON PURPOSE. A person framing a shot puts the product in the
// middle, so the app keeps the middle square. A catalog photo gathered from
// anywhere may be a bottle 262 px wide and 500 tall (measured in his folders,
// 2026-10-18): its middle square is less than half the bottle. LEEME.md asks for
// the product centred on a plain ground, which is exactly what white margins give.
// A square photo comes out the same either way.
//
// Reads whatever ImageIO reads: JPG, PNG, HEIC, WebP and AVIF are all measured
// here. A transparent background becomes white.
//
// ⚠️⚠️ NO METADATA IS COPIED, AND THAT IS WHY THIS IS NOT `sips`: a photo taken
// on the owner's phone may carry WHERE it was taken, and Wera's bucket is read
// by every signed-in person. Only the pixels are written here; `sips` carries
// the source's properties across.
// ============================================================================

import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data("catalog-photos: \(message)\n".utf8))
  exit(1)
}

let args = CommandLine.arguments
guard args.count == 3 else { fail("usage: catalog-photos.swift <photo> <out-dir>") }
let source = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2], isDirectory: true)

guard let input = CGImageSourceCreateWithURL(source as CFURL, nil) else { fail("cannot read \(source.path)") }
guard let props = CGImageSourceCopyPropertiesAtIndex(input, 0, nil) as? [CFString: Any],
      let width = props[kCGImagePropertyPixelWidth] as? Int,
      let height = props[kCGImagePropertyPixelHeight] as? Int
else { fail("\(source.path) has no size") }

// Upright: the thumbnail call applies the EXIF orientation, at full size.
let upright: CGImage = {
  let options: [CFString: Any] = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceCreateThumbnailWithTransform: true,
    kCGImageSourceThumbnailMaxPixelSize: max(width, height),
  ]
  guard let image = CGImageSourceCreateThumbnailAtIndex(input, 0, options as CFDictionary) else {
    fail("cannot decode \(source.path)")
  }
  return image
}()

let longer = max(upright.width, upright.height)
guard longer >= 160 else { fail("\(source.path) is \(upright.width)×\(upright.height) — too small for a photo") }

func write(_ px: Int) -> Int {
  guard let context = CGContext(
    data: nil, width: px, height: px, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
  else { fail("no drawing context") }
  // A transparent PNG becomes white, the plain ground LEEME.md asks for.
  context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  context.fill(CGRect(x: 0, y: 0, width: px, height: px))
  context.interpolationQuality = .high
  // The longer side fills the square; the shorter is centred between white margins.
  let scale = CGFloat(px) / CGFloat(longer)
  let w = CGFloat(upright.width) * scale, h = CGFloat(upright.height) * scale
  context.draw(upright, in: CGRect(x: (CGFloat(px) - w) / 2, y: (CGFloat(px) - h) / 2, width: w, height: h))
  guard let scaled = context.makeImage() else { fail("cannot scale to \(px)") }
  let target = outDir.appendingPathComponent("\(px).jpg")
  guard let dest = CGImageDestinationCreateWithURL(target as CFURL, UTType.jpeg.identifier as CFString, 1, nil)
  else { fail("cannot write \(target.path)") }
  CGImageDestinationAddImage(dest, scaled, [kCGImageDestinationLossyCompressionQuality: 0.7] as CFDictionary)
  guard CGImageDestinationFinalize(dest) else { fail("cannot finish \(target.path)") }
  return (try? FileManager.default.attributesOfItem(atPath: target.path)[.size] as? Int) ?? 0
}

try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
print("\(write(720)) \(write(160)) \(longer)")
