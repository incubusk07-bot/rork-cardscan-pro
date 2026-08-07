import { Image } from "expo-image";
import { Layers } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import PriceFlag from "@/components/PriceFlag";
import { gameLabel } from "@/constants/config";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import type { CollectionItem } from "@/types/card";
import { formatMoney } from "@/utils/format";
import { tapHaptic } from "@/utils/haptics";

interface CardTileProps {
  item: CollectionItem;
  onPress: () => void;
}

export default function CardTile({ item, onPress }: CardTileProps) {
  const price = item.manualPrice ?? item.card.marketPrice;
  const imageSource = item.card.imageUrl ?? item.photoUri;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void tapHaptic("select");
        onPress();
      }}
      style={({ pressed }) => [styles.tile, shadows.card, { opacity: pressed ? 0.88 : 1 }]}
    >
      <View style={styles.imageBox}>
        {imageSource ? (
          <Image source={{ uri: imageSource }} style={styles.image} contentFit="cover" transition={180} />
        ) : (
          <View style={styles.placeholder}>
            <Layers size={26} color={colors.gold} />
          </View>
        )}
        {item.conditionScore !== null ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{item.conditionScore.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.card.name}
        </Text>
        <Text style={styles.set} numberOfLines={1}>
          {item.card.setName ?? gameLabel(item.card.game)}
          {item.card.number ? ` · ${item.card.number}` : ""}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatMoney(price)}</Text>
          <PriceFlag source={item.manualPrice !== null ? "manual" : item.card.priceSource} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
  },
  imageBox: {
    aspectRatio: 0.78,
    backgroundColor: colors.goldFaint,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.5)",
  },
  scoreText: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.goldOnDark,
  },
  info: {
    padding: 11,
    gap: 3,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.ink,
  },
  set: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.inkSoft,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  price: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink,
  },
});
