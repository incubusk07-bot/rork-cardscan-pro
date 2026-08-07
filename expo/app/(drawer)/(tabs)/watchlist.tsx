import { Image } from "expo-image";
import { Search, Star, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import BrandHeader from "@/components/BrandHeader";
import Chip from "@/components/Chip";
import EmptyState from "@/components/EmptyState";
import PriceFlag from "@/components/PriceFlag";
import { GAMES, gameLabel } from "@/constants/config";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import { searchGame } from "@/services/cardApis";
import type { GameId, MatchedCard, WatchItem } from "@/types/card";
import { formatMoney } from "@/utils/format";
import { tapHaptic } from "@/utils/haptics";

export default function WatchlistScreen() {
  const { watchlist, isWatched, toggleWatch } = useApp();

  const [query, setQuery] = useState<string>("");
  const [game, setGame] = useState<GameId>("pokemon");
  const [results, setResults] = useState<MatchedCard[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  const runSearch = async () => {
    if (query.trim().length < 2 || searching) return;
    setSearching(true);
    setSearched(true);
    try {
      const found = await searchGame(game, query.trim());
      setResults(found);
    } catch (e) {
      console.log("[watchlist] search failed", e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const renderCardRow = (card: MatchedCard) => {
    const watched = isWatched(card.id);
    return (
      <View key={card.id} style={[styles.row, shadows.card]}>
        <View style={styles.rowImageBox}>
          {card.imageUrl ? (
            <Image source={{ uri: card.imageUrl }} style={styles.rowImage} contentFit="cover" transition={150} />
          ) : (
            <Star size={18} color={colors.gold} />
          )}
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>
            {card.name}
          </Text>
          <Text style={styles.rowSet} numberOfLines={1}>
            {card.setName ?? gameLabel(card.game)}
            {card.number ? ` · ${card.number}` : ""}
          </Text>
          <View style={styles.rowPriceRow}>
            <Text style={styles.rowPrice}>{formatMoney(card.marketPrice)}</Text>
            <PriceFlag source={card.priceSource} />
          </View>
        </View>
        <Pressable
          testID={`watch-toggle-${card.id}`}
          hitSlop={8}
          onPress={() => {
            void tapHaptic(watched ? "select" : "success");
            toggleWatch(card);
          }}
          style={({ pressed }) => [
            styles.starButton,
            watched ? styles.starButtonActive : null,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Star
            size={19}
            color={watched ? colors.goldDeep : colors.inkFaint}
            fill={watched ? colors.gold : "transparent"}
          />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BrandHeader showMenu title="Watchlist" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Search size={17} color={colors.inkFaint} />
            <TextInput
              testID="watchlist-query"
              style={styles.searchInput}
              placeholder="Search a card to watch…"
              placeholderTextColor={colors.inkFaint}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable hitSlop={8} onPress={clearSearch}>
                <X size={16} color={colors.inkFaint} />
              </Pressable>
            ) : null}
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={GAMES.filter((g) => g.id !== "nba")}
            keyExtractor={(g) => g.id}
            contentContainerStyle={styles.gameRow}
            renderItem={({ item }) => (
              <Chip label={item.label} active={game === item.id} onPress={() => setGame(item.id)} />
            )}
          />
          <Pressable
            testID="watchlist-search"
            onPress={runSearch}
            disabled={searching || query.trim().length < 2}
            style={({ pressed }) => [
              styles.searchButton,
              { opacity: pressed || searching || query.trim().length < 2 ? 0.6 : 1 },
            ]}
          >
            {searching ? (
              <ActivityIndicator size="small" color={colors.charcoal} />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </Pressable>
        </View>

        {searched ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RESULTS</Text>
            {searching ? null : results.length === 0 ? (
              <Text style={styles.noResults}>
                Nothing found — try a shorter name or another game.
              </Text>
            ) : (
              results.slice(0, 6).map(renderCardRow)
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WATCHING · {watchlist.length}</Text>
          {watchlist.length === 0 ? (
            <EmptyState
              icon={<Star size={28} color={colors.goldDeep} />}
              title="No cards on watch"
              body="Search above and star the cards you're hunting — prices show at a glance."
            />
          ) : (
            watchlist.map((w: WatchItem) => renderCardRow(w.card))
          )}
        </View>
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
    paddingBottom: 32,
    gap: 20,
  },
  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 14,
    gap: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.md,
    paddingHorizontal: 13,
    height: 48,
    backgroundColor: colors.surfaceAlt,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14.5,
    color: colors.ink,
  },
  gameRow: {
    gap: 8,
  },
  searchButton: {
    backgroundColor: colors.gold,
    height: 46,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.charcoal,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.inkFaint,
  },
  noResults: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.inkSoft,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 10,
  },
  rowImageBox: {
    width: 52,
    height: 70,
    borderRadius: 8,
    backgroundColor: colors.goldFaint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rowImage: {
    width: "100%",
    height: "100%",
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
  },
  rowSet: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.inkSoft,
  },
  rowPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  rowPrice: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink,
  },
  starButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceAlt,
  },
  starButtonActive: {
    backgroundColor: colors.goldPale,
    borderColor: colors.gold,
  },
});
