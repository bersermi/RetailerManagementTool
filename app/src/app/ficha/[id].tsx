import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogLine, type CatalogEntry } from '@/api/catalog';
import { activePatch, catalogEditErrorMessage } from '@/api/catalogEdit';
import { canWriteCatalog } from '@/api/catalogWrite';
import { useCatalog, useCosts, useEditProduct, useMyRole, useSales, useWorkspace } from '@/api/hooks';
import { bestWeekdayOf, boughtWhen, lastCostOf, perHundred, siblingsOf, weekOfProduct } from '@/api/productPage';
import { marginOf } from '@/cart/buying';
import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { TITULO } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { PrecioRapido } from '@/ui/PrecioRapido';
import { RetiroProducto } from '@/ui/RetiroProducto';
import { Vacio } from '@/ui/Vacio';

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
  const { loading, entries, failed, locationId } = useCatalog();
  const costs = useCosts(id ?? null);
  const { sales, today, factors } = useSales();
  const { edit, busy } = useEditProduct(mayWrite ? (id ?? null) : null);

  const [pricing, setPricing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const entry = entries.find((row) => row.id === id);
  if (entry === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top }}>
        <Atras label={ES.catalog.back} />
        <Vacio line={catalogLine(loading, '', failed)} />
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
            <Text style={{ fontSize: scale.titleSize, ...TITULO, color: PALETTE.tinta }}>{entry.name}</Text>
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
                style={{ paddingHorizontal: scale.space, paddingVertical: scale.rowGap / 2, borderRadius: scale.tapTarget, backgroundColor: PALETTE.accion }}
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
            figure={last === null ? ES.products.page.costNone : last.centavos === null ? '' : ES.products.page.perUnit(formatMXN(last.centavos), unit)}
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

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: scale.space,
            padding: scale.space,
            borderRadius: scale.space,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            backgroundColor: PALETTE.superficie,
          }}
        >
          <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
            <Rotulo text={ES.products.page.weekTitle} ink={PALETTE.tintaApagada} />
            <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
              {week.quantity === null ? ES.products.page.weekNone : ES.products.page.week(week.quantity, formatMXN(week.centavos))}
            </Text>
            {best === null ? null : (
              <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.marca }}>
                {ES.products.page.bestDay(ES.dates.weekdays[best] ?? '')}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: scale.rowGap / 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {week.bars.map((value, i) => (
              <View key={i} style={{ alignItems: 'center', gap: scale.rowGap / 4 }}>
                <View
                  style={{
                    width: scale.rowGap,
                    height: Math.max(scale.rowGap / 3, (value / tallest) * scale.tapTarget),
                    borderRadius: scale.rowGap / 3,
                    backgroundColor: i === week.today ? PALETTE.marca : i > week.today ? PALETTE.linea : PALETTE.accion,
                  }}
                />
                <Text style={{ fontSize: scale.smallSize * 0.75, color: PALETTE.tintaApagada }}>{ES.products.page.days[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {family.shown.length === 0 ? null : (
          <View style={{ gap: scale.rowGap / 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Rotulo text={ES.products.page.moreOf(entry.familyName)} ink={PALETTE.tintaApagada} />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate({ pathname: '/productos', params: { pasillo: entry.familyId } })}
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
          entries={entries}
          workspaceId={workspace.id}
          locationId={locationId}
          onSaved={() => undefined}
          onClose={() => setPricing(false)}
          cost={last === null ? null : { centavos: last.centavos, label: last.centavos === null ? '' : formatMXN(last.centavos) }}
        />
      ) : null}

      <RetiroProducto
        asking={asking}
        working={retiring || busy}
        failed={failure}
        onConfirm={() => void retire()}
        onCancel={() => setAsking(false)}
      />
    </View>
  );
}

/**
 * The picture at the top — the product's initials on its ground until the
 * photos arrive (`8g`'s second part), and the way back over it.
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
      <View style={{ position: 'absolute', left: scale.space, top: top + scale.rowGap }}>
        <Atras label={`‹ ${entry.familyName === '' ? ES.catalog.title : entry.familyName}`} />
      </View>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ fontSize: scale.titleSize * 2.6, fontWeight: '700', color: PALETTE.tintaApagada }}
      >
        {entry.initials}
      </Text>
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
        borderRadius: scale.tapTarget,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.accion }}>{label}</Text>
    </Pressable>
  );
}

function Rotulo({ text, ink }: { text: string; ink: string }) {
  const { scale } = useDensity();
  return (
    <Text style={{ fontSize: scale.smallSize * 0.85, fontWeight: '700', letterSpacing: scale.smallSize * 0.08, textTransform: 'uppercase', color: ink }}>
      {text}
    </Text>
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
        borderRadius: scale.space,
        borderWidth: ground === PALETTE.superficie ? 1 : 0,
        borderColor: PALETTE.linea,
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
      onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: entry.id } })}
      style={{ width: side, borderRadius: scale.space, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie, overflow: 'hidden' }}
    >
      <View style={{ height: side * 0.7, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.accionSuave }}>
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tintaApagada }}>{entry.initials}</Text>
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
        borderRadius: scale.space * 0.75,
        borderWidth: 1,
        borderColor: ink,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: ink }}>{label}</Text>
    </Pressable>
  );
}
