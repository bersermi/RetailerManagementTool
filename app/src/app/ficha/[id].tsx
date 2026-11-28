import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PACK_WORDS, catalogLine, type CatalogEntry, type PackWord } from '@/api/catalog';
import { activePatch, catalogEditErrorMessage, packPatch } from '@/api/catalogEdit';
import { canWriteCatalog } from '@/api/catalogWrite';
import { useCatalog, useCosts, useEditProduct, useMyRole, useSales, useWorkspace } from '@/api/hooks';
import {
  bestWeekdayOf,
  boughtWhen,
  costNoneLine,
  lastCostOf,
  perHundred,
  siblingsOf,
  weekDrawn,
  weekNoneLine,
  weekOfProduct,
} from '@/api/productPage';
import { MAX_ENTEROS, TECLAS_PUNTO, decimalesDe, escribir, type Tecla } from '@/cart/bascula';
import { marginOf } from '@/cart/buying';
import { traeDe } from '@/cart/paquete';
import { shownUnitOf } from '@/cart/quantity';
import { formatMXN } from '@/format/mxn';
import { useOnline } from '@/offline/useOnline';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { letraTitulo } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { Bascula } from '@/ui/Bascula';
import { PrecioRapido } from '@/ui/PrecioRapido';
import { RetiroProducto } from '@/ui/RetiroProducto';
import { Foto } from '@/ui/Foto';
import { Vacio } from '@/ui/Vacio';
import { Rotulo } from '@/ui/Rotulo';
import { ESQUINA } from '@/theme/density';

// ============================================================================
// LA FICHA — ONE PRODUCT, OPENED. Plan task `8g`, the owner's rulings of
// 2026-10-17: a tap on a product in Productos opens its page (*"The product
// page"*), with the one hook he kept — what a new price would earn, as it is
// typed — and the rule that a product from Wera's catalog keeps its name and
// its picture, so its page offers *Ya no lo vendo* where the shop's own offers
// *Editar*.
//
// ⚠️⚠️ IT REPLACES LA FAMILIA AS THE PLACE A TAP LANDS, AND THE FAMILY IS STILL
// ON IT. His ruling of 2026-09-15 — *"the full product family opens with the
// tapped variant preselected"* — was made when a family was one product in a
// few sizes; in the starter catalog a family is an AISLE (*Refrescos*, 126), so
// the family is *Más de Refrescos* here and *Ver los 126* opens the aisle.
//
// ⚠️ THE PICTURE IS THE PRODUCT'S INITIALS UNTIL `8g`'s SECOND PART lands the
// photos (C8.14: a product without one is finished, never pending).
//
// ⚠️ EVERY FIGURE IS A READ THE PHONE ALREADY HOLDS — the catalog, the six
// months of sales Números reads — except *Te cuesta*, which is Costos' own read
// for this one product. The arithmetic is `@/api/productPage`'s (`R3`).
// ============================================================================

export default function Ficha() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useMyRole();
  const mayWrite = canWriteCatalog(role);
  const workspace = useWorkspace();
  const { loading, entries, failed } = useCatalog();
  const costs = useCosts(id ?? null);
  const { sales, today, factors } = useSales();
  const { edit } = useEditProduct(mayWrite ? (id ?? null) : null);
  // ⚠️ `8g`'s round 3: with no signal, a card whose read never arrived says *Se ve
  // cuando haya señal* — never *Todavía no lo has comprado* or *No se ha vendido
  // esta semana*, which is what an empty answer used to read as (`@/api/productPage`).
  const online = useOnline();

  const [pricing, setPricing] = useState(false);
  const [packing, setPacking] = useState(false);
  const [asking, setAsking] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const entry = entries.find((row) => row.id === id);
  if (entry === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top }}>
        <Atras label={ES.catalog.back} />
        <Vacio line={catalogLine(loading, '', failed, online)} />
      </View>
    );
  }

  const unit = ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit;
  const last = lastCostOf(costs);
  const margin = last === null ? null : marginOf(entry, last.perBase, factors);
  const week = weekOfProduct(sales.days, entry.id, today, entries, factors);
  const best = bestWeekdayOf(sales.days, entry.id);
  const family = siblingsOf(entries, entry, 8);
  const tallest = Math.max(1, ...week.bars);

  async function retire() {
    setFailure(null);
    setRetiring(true);
    try {
      await edit(activePatch(false));
    } catch (thrown) {
      setRetiring(false);
      setFailure(catalogEditErrorMessage(thrown));
      return;
    }
    setRetiring(false);
    setAsking(false);
    // ⚠️ BACK TO PRODUCTOS, AND THE PRODUCT IS GONE FROM IT — `catalogFrom` drops
    // `is_active` false, so its absence is the confirmation (`producto/[id]`'s).
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Portada entry={entry} top={insets.top} />

      <ScrollView contentContainerStyle={{ padding: scale.space, gap: scale.space, paddingBottom: scale.space * 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: scale.space }}>
          <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
            <Text style={{ ...letraTitulo(scale), color: PALETTE.tinta }}>{entry.name}</Text>
            <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
              {ES.products.page.sub(entry.familyName, unit)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: scale.rowGap / 2 }}>
            <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: entry.centavos === null ? PALETTE.tintaApagada : PALETTE.tinta }}>
              {entry.centavos === null ? ES.products.page.noPrice : formatMXN(entry.centavos)}
            </Text>
            {mayWrite ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setPricing(true)}
                style={{ paddingHorizontal: scale.space, paddingVertical: scale.rowGap / 2, borderRadius: ESQUINA.boton, backgroundColor: PALETTE.accion }}
              >
                <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.superficie }}>{ES.products.page.changePrice}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: scale.rowGap }}>
          <Tarjeta
            title={ES.products.page.costTitle}
            ink={PALETTE.compra}
            ground={PALETTE.superficie}
            figure={last === null ? costNoneLine(costs.state, online) : last.centavos === null ? '' : ES.products.page.perUnit(formatMXN(last.centavos), unit)}
            line={last === null ? null : ES.products.page.costWhen(last.provider, boughtWhen(last.day, today))}
          />
          {typeof margin === 'number' ? (
            <Tarjeta
              title={margin < 0 ? ES.products.page.loseTitle : ES.products.page.earnTitle}
              ink={margin < 0 ? PALETTE.error : PALETTE.accion}
              ground={margin < 0 ? PALETTE.superficie : PALETTE.accionSuave}
              figure={ES.products.page.perUnit(formatMXN(Math.abs(margin)), unit)}
              line={(() => {
                const n = entry.centavos === null ? null : perHundred(margin, entry.centavos);
                return n === null ? null : ES.products.page.perHundred(n);
              })()}
            />
          ) : null}
        </View>

        {/* ⚠️ `14.5`: HOW IT ARRIVES — only where Comprar's pad can offer it, a
            product counted in the unit it is sold in (`paqueteDe`'s rule). */}
        {shownUnitOf(entry) !== entry.priceUnit ? null : (
          <TeLlega entry={entry} mayWrite={mayWrite} onChange={() => setPacking(true)} />
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: scale.space,
            padding: scale.space,
            borderRadius: ESQUINA.hoja,
            backgroundColor: PALETTE.superficie,
          }}
        >
          <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
            <Rotulo text={ES.products.page.weekTitle} />
            <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
              {week.quantity === null ? weekNoneLine(sales.state, online) : ES.products.page.week(week.quantity, formatMXN(week.centavos))}
            </Text>
            {best === null ? null : (
              <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.marca }}>
                {ES.products.page.bestDay(ES.dates.weekdays[best] ?? '')}
              </Text>
            )}
          </View>
          {!weekDrawn(sales.state, online) ? null : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: scale.rowGap / 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {week.bars.map((value, i) => (
                <View key={i} style={{ alignItems: 'center', gap: scale.rowGap / 4 }}>
                  <View
                    style={{
                      width: scale.rowGap,
                      height: Math.max(scale.rowGap / 3, (value / tallest) * scale.tapTarget),
                      borderRadius: ESQUINA.marca,
                      backgroundColor: i === week.today ? PALETTE.marca : i > week.today ? PALETTE.linea : PALETTE.accion,
                    }}
                  />
                  <Text style={{ fontSize: scale.smallSize * 0.75, color: PALETTE.tintaApagada }}>{ES.products.page.days[i]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {family.shown.length === 0 ? null : (
          <View style={{ gap: scale.rowGap / 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Rotulo text={ES.products.page.moreOf(entry.familyName)} />
              <Pressable
                accessibilityRole="button"
                // ⚠️ `8g`'s review (2026-10-20): BACK TO THE PRODUCTOS ALREADY OPEN, on
                // this aisle. `navigate` pushed a second Productos on top, and
                // *Volver* from it returned to this page instead of the list.
                onPress={() => router.dismissTo({ pathname: '/productos', params: { pasillo: entry.familyId } })}
                style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.accion }}>
                  {`${ES.products.page.seeAll(family.total)} ›`}
                </Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: scale.rowGap }}>
              {family.shown.map((other) => (
                <Vecino key={other.id} entry={other} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: scale.rowGap,
          paddingHorizontal: scale.space,
          paddingTop: scale.rowGap,
          paddingBottom: scale.rowGap + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: PALETTE.linea,
          backgroundColor: PALETTE.banda,
        }}
      >
        <Accion label={ES.products.page.prices} ink={PALETTE.accion} onPress={() => router.push({ pathname: '/precios/[id]', params: { id: entry.id } })} />
        <Accion label={ES.products.page.costs} ink={PALETTE.compra} onPress={() => router.push({ pathname: '/costos/[id]', params: { id: entry.id } })} />
        {mayWrite ? (
          entry.prebuilt ? (
            <Accion label={ES.catalog.edit.retire} ink={PALETTE.error} onPress={() => { setFailure(null); setAsking(true); }} />
          ) : (
            <Accion label={ES.products.page.edit} ink={PALETTE.accion} onPress={() => router.push({ pathname: '/producto/[id]', params: { id: entry.id } })} />
          )
        ) : null}
      </View>

      {pricing && workspace !== null ? (
        <PrecioRapido
          entry={entry}
          adding={false}
          workspaceId={workspace.id}
          onSaved={() => undefined}
          onClose={() => setPricing(false)}
          cost={last === null ? null : { centavos: last.centavos, label: last.centavos === null ? '' : formatMXN(last.centavos) }}
        />
      ) : null}

      {packing ? (
        <HojaPaquete
          entry={entry}
          // ⚠️ NOT YET KNOWN IS NOT OFFLINE (`useOnline`'s null): the save says so if it fails.
          online={online !== false}
          onSave={(word, holds) => {
            const patch = packPatch(word, holds);
            return patch === null ? Promise.resolve() : edit(patch);
          }}
          onClose={() => setPacking(false)}
        />
      ) : null}

      <RetiroProducto
        asking={asking}
        working={retiring}
        failed={failure}
        onConfirm={() => void retire()}
        onCancel={() => setAsking(false)}
      />
    </View>
  );
}

/**
 * The picture at the top — its photo, the LARGE file, standing whole in the
 * band (`8o`), or its initials on the band's ground; and the way back over it.
 */
function Portada({ entry, top }: { entry: CatalogEntry; top: number }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        paddingTop: top,
        height: top + scale.tapTarget * 4.5,
        backgroundColor: PALETTE.accionSuave,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ fontSize: scale.titleSize * 2.6, fontWeight: '700', color: PALETTE.tintaApagada }}
      >
        {entry.initials}
      </Text>
      {/* ⚠️ THE PHOTO BEFORE THE WAY BACK, so *‹ Refrescos* is drawn over it. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top }}>
        <Foto picture={entry.picture} size="large" fit="contain" />
      </View>
      <View style={{ position: 'absolute', left: scale.space, top: top + scale.rowGap }}>
        <Atras label={`‹ ${entry.familyName === '' ? ES.catalog.title : entry.familyName}`} />
      </View>
    </View>
  );
}

function Atras({ label }: { label: string }) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.back()}
      style={{
        alignSelf: 'flex-start',
        minHeight: scale.tapTarget * 0.8,
        justifyContent: 'center',
        paddingHorizontal: scale.space,
        borderRadius: ESQUINA.boton,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.accion }}>{label}</Text>
    </Pressable>
  );
}

function Tarjeta({ title, ink, ground, figure, line }: { title: string; ink: string; ground: string; figure: string; line: string | null }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        flex: 1,
        gap: scale.rowGap / 4,
        padding: scale.space,
        borderRadius: ESQUINA.hoja,
        backgroundColor: ground,
      }}
    >
      <Rotulo text={title} ink={ink} />
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: ink }}>{figure}</Text>
      {line === null ? null : <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{line}</Text>}
    </View>
  );
}

function Vecino({ entry }: { entry: CatalogEntry }) {
  const { scale } = useDensity();
  const side = scale.tapTarget * 1.9;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[entry.name, entry.price].filter((part) => part !== '').join('. ')}
      // ⚠️ `8g`'s review (2026-10-20): A SIBLING REPLACES THIS PAGE. Pushed, three
      // sizes took four *Volver* to reach Productos, and *‹ Refrescos* went to the
      // previous size instead of the aisle. Now one *Volver* goes back to where
      // this page was opened from.
      onPress={() => router.replace({ pathname: '/ficha/[id]', params: { id: entry.id } })}
      style={{ width: side, borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.superficie, overflow: 'hidden' }}
    >
      <View style={{ height: side * 0.7, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.accionSuave }}>
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tintaApagada }}>{entry.initials}</Text>
        <Foto picture={entry.picture} fit="contain" />
      </View>
      <View style={{ padding: scale.rowGap / 2, gap: scale.rowGap / 4 }}>
        <Text numberOfLines={1} style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.tinta }}>{entry.name}</Text>
        <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.tinta }}>{entry.price}</Text>
      </View>
    </Pressable>
  );
}

function Accion({ label, ink, onPress }: { label: string; ink: string; onPress: () => void }) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: scale.tapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: ESQUINA.boton,
        borderWidth: 1,
        borderColor: ink,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: ink }}>{label}</Text>
    </Pressable>
  );
}

/**
 * ⚠️ `14.5`: *TE LLEGA* — how the product arrives, *En caja de 13 kg* or *Suelto*,
 * what Comprar's pad offers at every delivery. *Cambiar* for the owner and a
 * manager, the fence every edit on this page keeps.
 */
function TeLlega({ entry, mayWrite, onChange }: { entry: CatalogEntry; mayWrite: boolean; onChange: () => void }) {
  const { scale } = useDensity();
  const unit = ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit;
  const line =
    entry.pack === null
      ? ES.products.page.arrives.loose
      : ES.products.page.arrives.packed(ES.packs[entry.pack.word].one, traeDe(entry.pack), unit);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.space,
        padding: scale.space,
        borderRadius: ESQUINA.hoja,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
        <Rotulo text={ES.products.page.arrives.title} ink={PALETTE.compra} />
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{line}</Text>
      </View>
      {mayWrite ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.products.page.arrives.change}: ${ES.products.page.arrives.title} ${line}`}
          onPress={onChange}
          style={{
            minHeight: scale.tapTarget,
            justifyContent: 'center',
            paddingHorizontal: scale.space,
            borderRadius: ESQUINA.boton,
            backgroundColor: PALETTE.compraSuave,
          }}
        >
          <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.compra }}>
            {ES.products.page.arrives.change}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * ⚠️ `14.5`: *¿CÓMO TE LLEGA?* — the pack chosen among `0101`'s eight words, or
 * loose, and what one holds keyed on the counter's own pad (`src/ui/Bascula`), as
 * Comprar keys it. It saves with signal only — an edit of the product, like every
 * other on this page — and a refusal is said under it, never swallowed.
 */
function HojaPaquete({
  entry,
  online,
  onSave,
  onClose,
}: {
  entry: CatalogEntry;
  online: boolean;
  onSave: (word: PackWord | null, holds: string) => Promise<void>;
  onClose: () => void;
}) {
  const { scale } = useDensity();
  const unit = shownUnitOf(entry);
  const word = ES.units[unit as keyof typeof ES.units] ?? unit;
  const [elegida, setElegida] = useState<PackWord | null>(entry.pack?.word ?? null);
  const [trae, setTrae] = useState(entry.pack === null ? '' : traeDe(entry.pack));
  const [fresco, setFresco] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const patch = packPatch(elegida, trae);
  const same =
    patch !== null &&
    patch.pack_word === (entry.pack?.word ?? null) &&
    (elegida === null || (entry.pack !== null && patch.pack_size === traeDe(entry.pack)));
  const off = !online || saving || patch === null || same;
  const sinPunto = decimalesDe(unit) === 0;

  async function guardar() {
    if (off) return;
    setSaving(true);
    setFailed(false);
    try {
      await onSave(elegida, trae);
    } catch {
      setSaving(false);
      setFailed(true);
      return;
    }
    setSaving(false);
    onClose();
  }

  const choices: readonly (PackWord | null)[] = [null, ...PACK_WORDS];
  return (
    <Bascula
      entry={entry}
      detalle={
        <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.compra }}>
          {ES.products.page.arrives.ask}
        </Text>
      }
      fichas={[]}
      teclas={TECLAS_PUNTO}
      apagada={(tecla: Tecla) => elegida === null || (tecla === 'punto' && sinPunto)}
      onTecla={(tecla) => {
        setTrae(escribir(fresco && tecla !== 'borrar' ? '' : trae, tecla, decimalesDe(unit), MAX_ENTEROS.cantidad));
        setFresco(false);
      }}
      accion={{
        label: saving ? ES.products.page.arrives.saving : ES.products.page.arrives.save,
        onPress: () => void guardar(),
        off,
      }}
      onQuitar={null}
      onClose={onClose}
    >
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap / 2 }}>
        {choices.map((choice) => {
          const on = choice === elegida;
          const label =
            choice === null ? ES.products.page.arrives.looseChoice : ES.packs[choice].one.charAt(0).toUpperCase() + ES.packs[choice].one.slice(1);
          return (
            <Pressable
              key={choice ?? 'suelto'}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setElegida(choice);
                setFresco(true);
              }}
              style={{
                flexGrow: 1,
                minWidth: scale.tapTarget * 2,
                minHeight: scale.tapTarget,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: scale.rowGap,
                borderRadius: ESQUINA.chip,
                borderWidth: on ? 2 : 1,
                borderColor: on ? PALETTE.compra : PALETTE.linea,
                backgroundColor: on ? PALETTE.compra : PALETTE.superficie,
              }}
            >
              <Text style={{ fontSize: scale.smallSize, fontWeight: on ? '700' : '600', color: on ? PALETTE.superficie : PALETTE.tinta }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {elegida === null ? null : (
        <View
          accessibilityLabel={`${ES.buy.pad.holds(ES.packs[elegida].one)}: ${trae === '' ? '0' : trae} ${word}`}
          style={{
            minHeight: scale.tapTarget * 1.2,
            justifyContent: 'center',
            paddingHorizontal: scale.space,
            borderRadius: ESQUINA.campo,
            borderWidth: 2,
            borderColor: PALETTE.compra,
            backgroundColor: PALETTE.superficie,
          }}
        >
          <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>
            {ES.buy.pad.holds(ES.packs[elegida].one)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scale.rowGap / 2 }}>
            <Text
              style={{
                fontSize: scale.moneySize,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
                color: trae === '' ? PALETTE.tintaApagada : PALETTE.tinta,
              }}
            >
              {trae === '' ? '0' : trae}
            </Text>
            <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tintaApagada }}>{word}</Text>
          </View>
        </View>
      )}
      <Text style={{ fontSize: scale.smallSize, color: failed ? PALETTE.error : PALETTE.tintaApagada }}>
        {failed
          ? ES.products.page.arrives.failed
          : !online
            ? ES.products.page.arrives.offline
            : ES.products.page.arrives.hint}
      </Text>
    </Bascula>
  );
}
