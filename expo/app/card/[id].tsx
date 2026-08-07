import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Layers, PencilLine, Trash2 } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import BrandHeader from "@/components/BrandHeader";
import DisclaimerNote from "@/components/DisclaimerNote";
import EmptyState from "@/components/EmptyState";
import GoldButton from "@/components/GoldButton";
import PriceFlag from "@/components/PriceFlag";
import TrendChart from "@/components/TrendChart";
import VerdictBanner from "@/components/VerdictBanner";
import { conditionLabel, gameLabel } from "@/constants/config";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import { formatMoney, shortDate } from "@/utils/format";
import { tapHaptic } from "@/utils/haptics";

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { collection, setManualPrice, removeFromCollection } = useApp();

  const item = useMemo(() => collection.find((c) => c.id === id) ?? null, [collection, id]);

  const [editingPrice, setEditingPrice] = useState<boolean>(false);
  const [priceDraft, setPriceDraft] = useState<string>("");

  if (!item) {
    return (
      <View style={styles.container}>
        <BrandHeader showBack onBack={() => router.back()} title="Card" />
        <EmptyState
          icon={<Layers size={28} color={colors.goldDeep} />}
          title="Card not found"
          body="This card is no longer in your collection."
          ctaLabel="Back to collection"
          onCta={() => router.back()}
        />
      </View>
    );
  }

  const price = item.manualPrice ?? item.card.marketPrice;
  const historyPoints = item.priceHistory.map((p) => p.price);

  const savePrice = () => {
    const parsed = parseFloat(priceDraft.replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0) {
      setManualPrice(item.id, Math.round(parsed * 100) / 100);
      void tapHaptic("success");
    }
    setEditingPrice(false);
    setPriceDraft("");
  };

  const confirmRemove = () => {
    Alert.alert("Remove from vault?", `${item.card.name} will be removed from your collection.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void tapHaptic("warning");
          removeFromCollection(item.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <BrandHeader showBack onBack={() => router.back()} title="Card detail" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, shadows.card]}>
          <View style={styles.heroImageBox}>
            {item.card.imageUrl ?? item.photoUri ? (
              <Image
                source={{ uri: item.card.imageUrl ?? item.photoUri }}
                style={styles.heroImage}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <Layers size={40} color={colors.gold} />
            )}
          </View>
          <Text style={styles.game}>{gameLabel(item.card.game).toUpperCase()}</Text>
          <Text style={styles.name}>{item.card.name}</Text>
          {item.card.setName ? (
            <Text style={styles.set}>
              {item.card.setName}
              {item.card.number ? ` · ${item.card.number}` : ""}
              {item.card.rarity ? ` · ${item.card.rarity}` : ""}
            </Text>
          ) : null}
          {item.conditionScore !== null ? (
            <View style={styles.scoreChip}>
              <Text style={styles.scoreChipText}>
                {item.conditionScore.toFixed(1)} · {conditionLabel(item.conditionScore)}
              </Text>
            </View>
          ) : null}
        </View>

        {item.verdict ? <VerdictBanner verdict={item.verdict} /> : null}

        <View style={[styles.sectionCard, shadows.card]}>
          <View style={styles.priceHeader}>
            <Text style={styles.sectionTitle}>Value</Text>
            <Pressable
              testID="detail-edit-price"
              hitSlop={8}
              onPress={() => {
                setEditingPrice((v) => !v);
                setPriceDraft(price !== null ? String(price) : "");
              }}
              style={styles.editButton}
            >
              <PencilLine size={15} color={colors.goldDeep} />
              <Text style={styles.editText}>{editingPrice ? "Cancel" : "Set manually"}</Text>
            </Pressable>
          </View>

          {editingPrice ? (
            <View style={styles.editRow}>
              <TextInput
                testID="detail-price-input"
                style={styles.priceInput}
                placeholder="Value in USD"
                placeholderTextColor={colors.inkFaint}
                keyboardType="decimal-pad"
                value={priceDraft}
                onChangeText={setPriceDraft}
                autoFocus
              />
              <GoldButton label="Save" small onPress={savePrice} />
            </View>
          ) : (
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>{formatMoney(price)}</Text>
              <PriceFlag source={item.manualPrice !== null ? "manual" : item.card.priceSource} />
            </View>
          )}

          {historyPoints.length > 0 ? (
            <View style={styles.chartBlock}>
              <TrendChart
                points={historyPoints}
                width={width - 40 - 32}
                height={64}
                stroke={colors.gold}
                gradientId="detailTrend"
              />
              <Text style={styles.chartMeta}>
                {item.priceHistory.length} price point{item.priceHistory.length === 1 ? "" : "s"} ·
                since {shortDate(item.priceHistory[0].date)}
              </Text>
            </View>
          ) : (
            <Text style={styles.noHistory}>
              No price history yet — refresh prices from the collection screen to build the curve.
            </Text>
          )}
        </View>

        <View style={[styles.sectionCard, shadows.card]}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Added</Text>
            <Text style={styles.detailValue}>{shortDate(item.addedAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Game</Text>
            <Text style={styles.detailValue}>{gameLabel(item.card.game)}</Text>
          </View>
          {item.card.number ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Number</Text>
              <Text style={styles.detailValue}>{item.card.number}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price source</Text>
            <Text style={styles.detailValue}>
              {item.manualPrice !== null ? "Manual" : item.card.priceSource === "api" ? "Live API" : "Community"}
            </Text>
          </View>
        </View>

        <GoldButton
          testID="detail-remove"
          label="Remove from collection"
          variant="danger"
          icon={<Trash2 size={16} color={colors.errorDeep} />}
          onPress={confirmRemove}
        />

        <DisclaimerNote variant="compact" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 18,
    alignItems: "center",
    gap: 4,
  },
  heroImageBox: {
    width: 190,
    height: 264,
    borderRadius: radii.md,
    backgroundColor: colors.goldFaint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 10,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  game: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.goldDeep,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
    textAlign: "center",
  },
  set: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.inkSoft,
    textAlign: "center",
  },
  scoreChip: {
    backgroundColor: colors.charcoal,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.5)",
  },
  scoreChipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.goldOnDark,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.ink,
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  editText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: colors.goldDeep,
  },
  editRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    height: 46,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  priceValue: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.ink,
  },
  chartBlock: {
    gap: 6,
    marginTop: 4,
  },
  chartMeta: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.inkFaint,
  },
  noHistory: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  detailLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.inkSoft,
  },
  detailValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
});
