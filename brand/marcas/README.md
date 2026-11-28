# brand/marcas — two marks that are not ours

Step 11, row `11.10-i` (2026-11-28). The three apps draw two companies' marks: Google's *G* on
*Continuar con Google*, and WhatsApp's glyph where a button opens a chat. Neither is ours to draw
(`brand/iconos/README.md`, *Two marks that are not ours*), so neither is in the icon font: each is
its owner's own file, used by its owner's own rules. Until this row the apps drew both from
MaterialCommunityIcons, in our colours — which both owners' rules forbid (below).

## Google — `google/`

**The rules** (developers.google.com/identity/branding-guidelines, read 2026-11-28):

- *"The button must always include the standard color for the Google 'G'."* — and, under
  *Incorrect button design*: *"Don't use monochrome versions of the Google 'G' for the button."*
- *"Regardless of the text, you can't change the size or color of the Google 'G' logo. It must be
  the standard color version … and appear on a white background."* The button may be scaled,
  keeping its proportions.
- The words may be localised (*"Localization of this text … is permitted and encouraged"*); never
  *Google* alone. Ours: *Continuar con Google*.
- *"Your website or app must follow these guidelines to complete the app verification process."*

**The file:** `boton-claro@4x.png` is Google's own, unmodified — `Android + Web/PNG @4x/Light/Theme=Light,
Show text=No, Shape=Square, Platform=Android+Web@4x.png` from
https://developers.google.com/static/identity/images/signin-assets.zip (downloaded 2026-11-28; the zip's
SHA-256 `ba884069e12093b06bcfd776915081254a7c95094b80d50be2c5dc6bac1c1da1`). `bash google/render.sh` cuts the
G out of its middle, on the button's own white, and scales it to `g.png`, `g@2x.png` and `g@3x.png`
(24 points). Each app's `src/marca/google/` holds the three byte for byte (`test/iconos.test.ts`).

**How the apps draw it:** the G at half the button's height (Google's 20 in 40; ours 24 in 48, 30 at
Wera's *Letra grande*), left of the words, on the button's white (`superficie`, `#FFFFFF`). The
button keeps our edge (`linea`) — Google's light theme names `#747775`; the rules' hard words are the
G's colour and the white behind it.

## WhatsApp — `whatsapp/`

**The rules** (meta.com/es-la/brand/resources/whatsapp/whatsapp-brand/, read 2026-11-28, in Spanish):
*"Tampoco debes modificar ninguno de los colores del logotipo"*; *"Solo puedes usar los Recursos de
la marca WhatsApp oficiales"*; *"NO uses una imagen que pueda confundirse con el logotipo … o una
variación de ellos"*; it may be resized, *"siempre y cuando no sean el elemento más destacado"*.

**The files** (`11.10-iii`, 2026-11-28): `Digital_Glyph_Green_RGB_2026.png` and `.svg`,
`Digital_Glyph_White_RGB_2026.png` and `.svg` are Meta's own, unmodified — `Brand Resource Center Page
Downloads/01_Glyph/01_Digital RGB/` in `WhatsApp-Brand-Resource-Center.zip` (SHA-256
`31cd2eaacb0abfd3640e51cb807c21dafba872e3aff8e520ff20ee6a1b01498f`), which the owner downloaded on 2026-11-28
after ticking *"Leí y acepto las normas aplicables y otras condiciones de uso"* — Meta hands the pack out only
so, and accepting a company's terms is the owner's act. The pack's black glyph and its two wordmarks are not
used. `bash whatsapp/render.sh` scales the two PNGs, keeping their proportions, to `verde.png` and
`blanco.png` at 1×, 2× and 3× (32 points); each app's `src/marca/whatsapp/` holds the six byte for byte
(`test/iconos.test.ts`).

**How the apps draw it:** `@/ui/Icono` draws `whatsapp` as one of the two pictures, never tinted, at five
sixths of the icon's size with a twelfth around it (a drawing in `brand/iconos/` fills 20–22 of its 24
units), so it sits where the old glyph sat. Which picture: `@/marca/glifos`' `varianteDeWhatsapp` reads the
colour the place asks its icon for — a light one means a filled button's white word, so the white glyph; any
other (the sheet's inks, the action colour) the green glyph. Never the most prominent thing on a screen: it
sits beside its button's or row's words, at the icon's size. Until `11.10-iii` the apps drew
MaterialCommunityIcons' look-alike in each button's colour.
