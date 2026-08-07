import { ShieldCheck } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DISCLAIMER } from "@/constants/config";
import { colors, fonts, radii } from "@/constants/theme";

interface DisclaimerNoteProps {
  variant?: "compact" | "full";
  dark?: boolean;
}

export default function DisclaimerNote({ variant = "compact", dark = false }: DisclaimerNoteProps) {
  if (variant === "full") {
    return (
      <View style={[styles.fullCard, dark ? styles.fullCardDark : null]}>
        <View style={styles.fullHeader}>
          <ShieldCheck size={16} color={dark ? colors.goldOnDark : colors.goldDeep} />
          <Text style={[styles.fullTitle, dark ? { color: colors.textOnDark } : null]}>
            Pre-Grade Estimate — read this
          </Text>
        </View>
        <Text style={[styles.fullBody, dark ? { color: colors.slateOnDark } : null]}>{DISCLAIMER}</Text>
      </View>
    );
  }
  return (
    <View style={styles.compactRow}>
      <ShieldCheck size={13} color={dark ? colors.slateOnDark : colors.inkFaint} />
      <Text style={[styles.compactText, dark ? { color: colors.slateOnDark } : null]}>
        Pre-Grade Estimates only · Not official certification
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  compactText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.inkFaint,
  },
  fullCard: {
    backgroundColor: colors.goldFaint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.goldPale,
    padding: 16,
    gap: 8,
  },
  fullCardDark: {
    backgroundColor: colors.charcoalRaise,
    borderColor: colors.charcoalLine,
  },
  fullHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.ink,
  },
  fullBody: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.inkSoft,
  },
});
