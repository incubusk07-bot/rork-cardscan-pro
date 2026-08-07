import React from "react";
import { StyleSheet, Text, View } from "react-native";

import GoldButton from "@/components/GoldButton";
import { colors, fonts, radii } from "@/constants/theme";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ icon, title, body, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {ctaLabel && onCta ? (
        <GoldButton label={ctaLabel} onPress={onCta} small style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 32,
    gap: 6,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldPale,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    color: colors.ink,
    textAlign: "center",
  },
  body: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkSoft,
    textAlign: "center",
  },
  cta: {
    marginTop: 14,
    minWidth: 160,
  },
});
