import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, radii } from "@/constants/theme";
import { tapHaptic } from "@/utils/haptics";

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  dark?: boolean;
  testID?: string;
}

export default function Chip({ label, active = false, onPress, dark = false, testID }: ChipProps) {
  const activeBg = dark ? "rgba(212, 175, 55, 0.16)" : colors.goldPale;
  const activeText = dark ? colors.goldOnDark : colors.goldDeep;
  const idleBg = dark ? colors.charcoalRaise : colors.surface;
  const idleText = dark ? colors.slateOnDark : colors.inkSoft;
  const idleBorder = dark ? colors.charcoalLine : colors.hairline;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={
        onPress
          ? () => {
              void tapHaptic("select");
              onPress();
            }
          : undefined
      }
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? activeBg : idleBg,
          borderColor: active ? colors.gold : idleBorder,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: active ? activeText : idleText }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});
