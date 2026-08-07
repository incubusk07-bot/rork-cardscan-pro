import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii } from "@/constants/theme";

interface PillarRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  delayMs?: number;
}

/** Condition pillar row — icon, label, animated gold bar, serif value. */
export default function PillarRow({ icon, label, value, delayMs = 0 }: PillarRowProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0.04, Math.min(1, value / 10)),
      duration: 800,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, value, delayMs]);

  const widthPct = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthPct }]} />
      </View>
      <Text style={styles.value}>{value.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  iconBox: {
    width: 26,
    alignItems: "center",
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
    width: 82,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.hairline,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.goldDeep,
    width: 38,
    textAlign: "right",
  },
});
