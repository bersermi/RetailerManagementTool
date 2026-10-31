// ============================================================================
// ONE LINE OF WHAT SHE PUBLISHES. Plan task `10.4b-iv-a`.
//
// ⚠️ PROPOSAL B, AS HE CHOSE IT (2026-10-29): a dish or, with one switch, a
// surprise bag. The switch changes the hints — *Comida corrida* becomes *Bolsa
// de pan* — and the description's label becomes *¿Qué suele llevar?*; only a
// bag asks what it is usually worth. A fonda who publishes dishes sees the
// drawing's fields: a name, a line of description, the price, how many, tags.
//
// ⚠️ EVERY CHANGE IS HANDED UP AS A FUNCTION OF THE LINE AS IT IS (`onChange`),
// so two taps on two tags between renders both land — the form holds the lines
// and applies each to the current one, by its key.
//
// ⚠️ THE NUMBER BOXES SHARE ONE *Listo* BAR (`padId`, `@/ui/TecladoListo`): an
// iPhone's number pad has no key to put it away. Hints are muted ink, never
// values; nothing is chosen for her — a dish, no tag — until she chooses.
// ============================================================================

import { Pressable, Text, View } from 'react-native';

import { DESCRIPTION_MAX, NAME_MAX, TAGS, type LineDraft, type Tag } from '@/api/listing';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Campo } from '@/ui/Campo';

type Change = (line: LineDraft) => Partial<Omit<LineDraft, 'key'>>;

export function Renglon({
  line,
  n,
  onChange,
  onRemove,
  editable,
  padId,
}: {
  line: LineDraft;
  n: number;
  onChange: (change: Change) => void;
  onRemove: (() => void) | null;
  editable: boolean;
  padId: string;
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
      <View style={{ flexDirection: 'row', gap: SIZE.space }}>
        <Campo
          grows
          label={ES.publicar.precio}
          value={line.price}
          onChangeText={(price) => onChange(() => ({ price }))}
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
      {line.surprise && (
        <Campo
          label={ES.publicar.vale}
          value={line.usual}
          onChangeText={(usual) => onChange(() => ({ usual }))}
          keyboardType="decimal-pad"
          inputAccessoryViewID={padId}
          editable={editable}
        />
      )}

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
    </View>
  );
}
