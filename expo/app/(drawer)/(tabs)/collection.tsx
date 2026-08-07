import { useFocusEffect, useRouter } from "expo-router";
import { Layers, Plus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import BrandHeader from "@/components/BrandHeader";
import CardTile from "@/components/CardTile";
import Chip from "@/components/Chip";
import DisclaimerNote from "@/components/DisclaimerNote";
import EmptyState from "@/components/EmptyState";
import GoldButton from "@/components/GoldButton";
import TrendChart from "@/components/TrendChart";
import { GAMES } from "@/constants/config";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import type { CollectionItem, GameId } from "@/types/card";
import { formatDelta, formatMoney } from "@/utils/format";
import { tapHaptic } from "@/utils/haptics";

type Filter = GameId | "all";

interface ManualDraft {
  name: string;
  setName: string;
  price: string;
  game: GameId;
}

export default function CollectionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    collection,
    portfolioValue,
    portfolioHistory,
    refreshPrices,
    refreshingPrices,
    maybePromptAuth,
    addManualCard,
  } = useApp();

  const [filter, setFilter] = useState<Filter>("all");
  const [manualVisible, setManualVisible] = useState<boolean>(false);
  const [draft, setDraft] = useState<ManualDraft>({ name: "", setName: "", price: "", game: "nba" });

  useFocusEffect(
    useCallback(() => {
      maybePromptAuth("collection");
    }, [maybePromptAuth]),
  );

  const filtered = useMemo(
    () => (filter === "all" ? collection : collection.filter((i) => i.card.game === filter)),
    [collection, filter],
  );

  const chartPoints = useMemo(
    () => portfolioHistory.slice(-30).map((p) => p.total),
    [portfolioHistory],
  );
  const delta = chartPoints.length >= 2 ? chartPoints[chartPoints.length - 1] - chartPoints[0] : 0;

  const saveManual = () => {
    const price = parseFloat(draft.price.replace(",", "."));
    if (!draft.name.trim()) return;
    addManualCard({
      name: draft.name.trim(),
      setName: draft.setName.trim() || undefined,
      price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
      game: draft.game,
    });
    void tapHaptic("success");
    setDraft({ name: "", setName: "", price: "", game: "nba" });
    setManualVisible(false);
  };

  const header = (
    <View style={styles.headerBlock}>
      <View style={[styles.portfolioCard, shadows.card]}>
        <View style={styles.portfolioTop}>
          <View style={styles.portfolioTextCol}>
            <Text style={styles.portfolioLabel}>PORTFOLIO VALUE</Text>
            <Text style={styles.portfolioValue}>{formatMoney(portfolioValue)}</Text>
            <View style={styles.deltaRow}>
              {delta >= 0 ? (
                <TrendingUp size={13} color={colors.success} />
              ) : (
                <TrendingDown size={13} color={colors.error} />
              )}
              <Text style={[styles.deltaText, { color: delta >= 0 ? colors.success : colors.error }]}>
                {formatDelta(delta)} recent
              </Text>
            </View>
          </View>
          <Pressable
            testID="collection-refresh"
            onPress={() => {
              void tapHaptic("select");
              void refreshPrices();
            }}
            disabled={refreshingPrices}
            style={({ pressed }) => [styles.refreshButton, { opacity: pressed || refreshingPrices ? 0.6 : 1 }]}
          >
            {refreshingPrices ? (
              <ActivityIndicator size="small" color={colors.goldDeep} />
            ) : (
              <RefreshCw size={17} color={colors.goldDeep} />
            )}
          </Pressable>
        </View>
        {chartPoints.length > 0 ? (
          <TrendChart
            points={chartPoints}
            width={width - 40 - 32}
            height={56}
            stroke={colors.gold}
            gradientId="collectionTrend"
          />
        ) : null}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: "all" as Filter, label: "All" }, ...GAMES.map((g) => ({ id: g.id as Filter, label: g.label }))]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <Chip label={item.label} active={filter === item.id} onPress={() => setFilter(item.id)} />
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <BrandHeader
        showMenu
        title="My Collection"
        right={
          <Pressable
            testID="collection-add-manual"
            hitSlop={10}
            onPress={() => {
              void tapHaptic("select");
              setManualVisible(true);
            }}
            style={styles.addButton}
          >
            <Plus size={21} color={colors.ink} />
          </Pressable>
        }
      />

      <FlatList
        data={filtered}
        keyExtractor={(item: CollectionItem) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={header}
        ListFooterComponent={
          filtered.length > 0 ? (
            <View style={styles.footer}>
              <DisclaimerNote variant="compact" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Layers size={30} color={colors.goldDeep} />}
            title={filter === "all" ? "Your vault is empty" : "Nothing here yet"}
            body={
              filter === "all"
                ? "Scan a card and save it to start tracking your portfolio value."
                : "No cards for this game yet. Scan one or add it manually."
            }
            ctaLabel="Scan a card"
            onCta={() => router.push("/scan")}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.tileWrap}>
            <CardTile
              item={item}
              onPress={() => router.push({ pathname: "/card/[id]", params: { id: item.id } })}
            />
          </View>
        )}
      />

      <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalWrap}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setManualVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add card manually</Text>
            <Text style={styles.modalSub}>
              For NBA and anything without live pricing — flagged as Manual.
            </Text>
            <View style={styles.modalGameRow}>
              {GAMES.map((g) => (
                <Chip
                  key={g.id}
                  label={g.short}
                  active={draft.game === g.id}
                  onPress={() => setDraft((d) => ({ ...d, game: g.id }))}
                />
              ))}
            </View>
            <TextInput
              testID="manual-name"
              style={styles.modalInput}
              placeholder="Card name (e.g. LeBron James #6)"
              placeholderTextColor={colors.inkFaint}
              value={draft.name}
              onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
            />
            <TextInput
              testID="manual-set"
              style={styles.modalInput}
              placeholder="Set (optional)"
              placeholderTextColor={colors.inkFaint}
              value={draft.setName}
              onChangeText={(t) => setDraft((d) => ({ ...d, setName: t }))}
            />
            <TextInput
              testID="manual-price"
              style={styles.modalInput}
              placeholder="Value in USD (optional)"
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={draft.price}
              onChangeText={(t) => setDraft((d) => ({ ...d, price: t }))}
            />
            <GoldButton
              testID="manual-save"
              label="Add to collection"
              onPress={saveManual}
              disabled={!draft.name.trim()}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBlock: {
    gap: 14,
    marginBottom: 16,
  },
  portfolioCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 16,
    gap: 10,
  },
  portfolioTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  portfolioTextCol: {
    gap: 3,
  },
  portfolioLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.goldDeep,
  },
  portfolioValue: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  deltaText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldPale,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  listContent: {
    padding: 20,
    paddingBottom: 32,
  },
  column: {
    gap: 12,
  },
  tileWrap: {
    flex: 1,
    marginBottom: 12,
  },
  footer: {
    paddingTop: 12,
  },
  modalWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    color: colors.ink,
  },
  modalSub: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkSoft,
    marginTop: -6,
  },
  modalGameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    height: 50,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
  },
});
