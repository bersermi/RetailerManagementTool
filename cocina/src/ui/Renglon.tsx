// ============================================================================
// ONE LINE OF WHAT SHE PUBLISHES. Plan task `10.4b-iv-a`.
//
// ⚠️ PROPOSAL B, AS HE CHOSE IT (2026-10-29): a dish or, with one switch, a
// surprise bag. The switch changes the hints — *Comida corrida* becomes *Bolsa
// de pan* — and the description's label becomes *¿Qué suele llevar?*. A fonda who
// publishes dishes sees the drawing's fields: a name, a line of description, the
// price, how many, what it is usually worth, tags.
//
// ⚠️ `10.5-v-d`: *LO QUE VALE NORMALMENTE* ON EVERY LINE, REQUIRED (the owner's ruling
// of 2026-11-06) — until then a bag's alone, and optional. It sits under the price,
// so the two figures the saving is made of are read together; the price boxes carry
// the drawing's hints (*60*, *120*), which the card at the form's foot shows until she
// types her own.
//
// ⚠️ EVERY CHANGE IS HANDED UP AS A FUNCTION OF THE LINE AS IT IS (`onChange`),
// so two taps on two tags between renders both land — the form holds the lines
// and applies each to the current one, by its key.
//
// ⚠️ THE NUMBER BOXES SHARE ONE *Listo* BAR (`padId`, `@/ui/TecladoListo`): an
// iPhone's number pad has no key to put it away. Hints are muted ink, never
// values; nothing is chosen for her — a dish, no tag — until she chooses.
//
// ⚠️ `10.5-ii`: A PHOTO PER DISH (proposal B), under what the dish is — its
// square, *Tomar foto* and *Elegir* (`@/ui/CampoFoto`); with none, her kitchen's
// drawing on her colour (`fondo`). *Repetir* opens with yesterday's photo in it.
// The form opens the camera and makes the photo's path; this draws the slot.
//
// ⚠️ `10.5b-iv-c`: *CÓMO SE COME*, AFTER *AVISA SI PICA* — only when her kitchen offers both
// ways (`cocina`, her settings; the family-shell page's form, call 26): *Para llevar* and *Para
// comer aquí*, both on at first, each switched off for this dish alone. A bag says it is always
// to go instead. With one way, nothing is asked: the dish is her kitchen's.
// ============================================================================

import { Pressable, Text, View } from 'react-native';

import { NINGUNA } from '@/api/fotos';
import { DESCRIPTION_MAX, NAME_MAX, TAGS, ofreceLasDos, type ComoSeCome, type LineDraft, type Tag } from '@/api/listing';
import type { Defaults } from '@/api/pagina';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Campo } from '@/ui/Campo';
import { CampoFoto } from '@/ui/CampoFoto';
import { Dibujo } from '@/ui/Dibujo';

type Change = (line: LineDraft) => Partial<Omit<LineDraft, 'key'>>;

export function Renglon({
  line,
  n,
  onChange,
  onRemove,
  editable,
  padId,
  fondo,
  nota,
  onFoto,
  cocina = null,
}: {
  line: LineDraft;
  n: number;
  onChange: (change: Change) => void;
  onRemove: (() => void) | null;
  editable: boolean;
  padId: string;
  /** Her kitchen's drawing and colour — what a dish with no photo wears. */
  fondo: Defaults;
  /** What a refused camera or a failed photo meant, in words; `null` for none. */
  nota: string | null;
  /** The camera (`true`) or the gallery, for this line. */
  onFoto: (tomar: boolean) => void;
  /** `10.5b-iv-c`: her kitchen's ways, once read — the dish is asked only when both are on. */
  cocina?: ComoSeCome | null;
}) {
  const kind = line.surprise ? 'bolsa' : 'platillo';
  const toggle = (tag: Tag) =>
    onChange((now) => ({ tags: now.tags.includes(tag) ? now.tags.filter((t) => t !== tag) : [...now.tags, tag] }));
  const pill = (on: boolean) =>
    ({
      minHeight: SIZE.tapTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SIZE.space,
      borderRadius: SIZE.space * 0.75,
      borderWidth: on ? 2 : 1,
      borderColor: on ? PALETTE.accion : PALETTE.linea,
      backgroundColor: on ? PALETTE.accionSuave : PALETTE.superficie,
      opacity: editable ? 1 : 0.6,
    }) as const;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: PALETTE.linea,
        borderRadius: SIZE.space,
        backgroundColor: PALETTE.fondo,
        padding: SIZE.space,
        gap: SIZE.space,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
          {ES.publicar.renglon(line.surprise, n)}
        </Text>
        {onRemove !== null && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${ES.publicar.quitar}: ${ES.publicar.renglon(line.surprise, n)}`}
            disabled={!editable}
            onPress={onRemove}
            hitSlop={SIZE.rowGap}
            style={{ minHeight: SIZE.tapTarget, justifyContent: 'center', paddingHorizontal: SIZE.rowGap }}
          >
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{ES.publicar.quitar}</Text>
          </Pressable>
        )}
      </View>

      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
        {([false, true] as const).map((surprise) => {
          const on = line.surprise === surprise;
          const word = surprise ? ES.publicar.bolsa : ES.publicar.platillo;
          return (
            <Pressable
              key={word}
              accessibilityRole="radio"
              accessibilityLabel={word}
              accessibilityState={{ checked: on, disabled: !editable }}
              disabled={!editable}
              onPress={() => onChange(() => ({ surprise }))}
              style={[pill(on), { flex: 1 }]}
            >
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: on ? '700' : '400', color: PALETTE.tinta }}>{word}</Text>
            </Pressable>
          );
        })}
      </View>

      <Campo
        label={ES.publicar.nombre}
        value={line.name}
        onChangeText={(name) => onChange(() => ({ name }))}
        placeholder={ES.publicar.nombreEjemplo[kind]}
        maxLength={NAME_MAX}
        autoCapitalize="sentences"
        editable={editable}
      />
      <Campo
        label={ES.publicar.descripcion[kind]}
        value={line.description}
        onChangeText={(description) => onChange(() => ({ description }))}
        placeholder={ES.publicar.descripcionEjemplo[kind]}
        maxLength={DESCRIPTION_MAX}
        autoCapitalize="sentences"
        editable={editable}
      />
      <CampoFoto
        label={ES.publicar.foto}
        forma="platillo"
        foto={line.foto}
        defecto={<Dibujo dibujo={fondo.dibujo} color={fondo.color} modo="cuadro" />}
        nota={nota ?? (line.foto.kind === 'ninguna' ? ES.publicar.sinFoto : null)}
        busy={!editable}
        onTomar={() => onFoto(true)}
        onElegir={() => onFoto(false)}
        onQuitar={() => onChange(() => ({ foto: NINGUNA }))}
      />
      <View style={{ flexDirection: 'row', gap: SIZE.space }}>
        <Campo
          grows
          label={ES.publicar.precio}
          value={line.price}
          onChangeText={(price) => onChange(() => ({ price }))}
          placeholder={ES.publicar.precioEjemplo}
          keyboardType="decimal-pad"
          inputAccessoryViewID={padId}
          editable={editable}
        />
        <Campo
          grows
          label={ES.publicar.cuantos}
          value={line.count}
          onChangeText={(count) => onChange(() => ({ count }))}
          keyboardType="number-pad"
          inputAccessoryViewID={padId}
          maxLength={3}
          editable={editable}
        />
      </View>
      <Campo
        label={ES.publicar.vale}
        value={line.usual}
        onChangeText={(usual) => onChange(() => ({ usual }))}
        placeholder={ES.publicar.valeEjemplo}
        keyboardType="decimal-pad"
        inputAccessoryViewID={padId}
        editable={editable}
      />

      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>{ES.publicar.etiquetas}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
        {TAGS.map((tag) => {
          const on = line.tags.includes(tag);
          return (
            <Pressable
              key={tag}
              accessibilityRole="checkbox"
              accessibilityLabel={ES.publicar.etiqueta[tag]}
              accessibilityState={{ checked: on, disabled: !editable }}
              disabled={!editable}
              onPress={() => toggle(tag)}
              style={pill(on)}
            >
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: on ? '700' : '400', color: PALETTE.tinta }}>
                {ES.publicar.etiqueta[tag]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {ofreceLasDos(cocina) &&
        (line.surprise ? (
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.publicar.bolsaParaLlevar}</Text>
        ) : (
          <>
            <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>{ES.publicar.comoSeCome}</Text>
            <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
              {(['llevar', 'aqui'] as const).map((forma) => {
                const on = line[forma];
                const word = ES.publicar[forma];
                return (
                  <Pressable
                    key={forma}
                    accessibilityRole="checkbox"
                    accessibilityLabel={word}
                    accessibilityState={{ checked: on, disabled: !editable }}
                    disabled={!editable}
                    onPress={() => onChange((now) => (forma === 'llevar' ? { llevar: !now.llevar } : { aqui: !now.aqui }))}
                    style={[pill(on), { flex: 1 }]}
                  >
                    <Text style={{ fontSize: SIZE.bodySize, fontWeight: on ? '700' : '400', color: PALETTE.tinta }}>{word}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ))}
    </View>
  );
}
