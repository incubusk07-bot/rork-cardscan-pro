import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii } from "@/constants/theme";
import type { VerdictKind } from "@/types/card";

interface VerdictBannerProps {
  verdict: VerdictKind;
  subtitle?: string;
}

const CONFIG: Record<
  VerdictKind,
  { bg: string; border: string; text: string; title: string; fallback: string }
> = {
  likely_original: {
    bg: colors.successPale,
    border: "rgba(18, 183, 106, 0.35)",
    text: colors.successDeep,
    title: "Likely Original",
    fallback: "Automated analysis suggests this card is likely original.",
  },
  likely_counterfeit: {
    bg: colors.errorPale,
    border: "rgba(240, 68, 56, 0.35)",
    text: colors.errorDeep,
    title: "Likely Counterfeit",
    fallback: "Several signals differ from the official reference print.",
  },
  inconclusive: {
    bg: colors.amberPale,
    border: "rgba(245, 158, 11, 0.35)",
    text: colors.amberDeep,
    title: "Inconclusive",
    fallback: "Not enough signal to call it — try expert review or retake the photo.",
  },
};

export default function VerdictBanner({ verdict, subtitle }: VerdictBannerProps) {
  const config = CONFIG[verdict];
  const Icon =
    verdict === "likely_original"
      ? ShieldCheck
      : verdict === "likely_counterfeit"
        ? ShieldAlert
        : ShieldQuestion;

  return (
    <View style={[styles.banner, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Icon size={28} color={config.text} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: config.text }]}>{config.title}</Text>
        <Text style={styles.subtitle}>{subtitle ?? config.fallback}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 16,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkSoft,
  },
});
