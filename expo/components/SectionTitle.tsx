import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, type } from "@/constants/theme";

interface SectionTitleProps {
  overline?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  dark?: boolean;
}

export default function SectionTitle({ overline, title, actionLabel, onAction, dark }: SectionTitleProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        {overline ? (
          <Text style={[type.micro, dark ? { color: colors.slateOnDark } : null]}>{overline}</Text>
        ) : null}
        <Text style={[styles.title, dark ? { color: colors.textOnDark } : null]}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  textCol: {
    gap: 2,
    flex: 1,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 21,
    lineHeight: 26,
    color: colors.ink,
  },
  action: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.goldDeep,
    paddingBottom: 2,
  },
});
