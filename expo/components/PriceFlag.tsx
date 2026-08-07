import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/constants/theme";
import type { PriceSource } from "@/types/card";

interface PriceFlagProps {
  source: PriceSource;
}

/** Price source flag — always visible next to any price (brand rule). */
export default function PriceFlag({ source }: PriceFlagProps) {
  const isApi = source === "api";
  const label = source === "api" ? "API Priced" : source === "manual" ? "Manual" : "Community";
  return (
    <View
      style={[
        styles.flag,
        { backgroundColor: isApi ? "rgba(95, 89, 78, 0.08)" : colors.amberPale },
      ]}
    >
      <Text style={[styles.text, { color: isApi ? colors.inkSoft : colors.amberDeep }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
