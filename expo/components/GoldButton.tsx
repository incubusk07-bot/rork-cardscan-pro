import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, fonts, radii } from "@/constants/theme";
import { tapHaptic } from "@/utils/haptics";

type Variant = "gold" | "dark" | "ghost" | "ghostOnDark" | "danger";

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  small?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  gold: { bg: colors.gold, text: colors.charcoal },
  dark: { bg: colors.charcoal, text: colors.goldOnDark },
  ghost: { bg: "transparent", text: colors.ink, border: colors.hairlineStrong },
  ghostOnDark: { bg: "transparent", text: colors.textOnDark, border: colors.charcoalLine },
  danger: { bg: colors.errorPale, text: colors.errorDeep },
};

export default function GoldButton({
  label,
  onPress,
  variant = "gold",
  disabled = false,
  loading = false,
  icon,
  small = false,
  style,
  testID,
}: GoldButtonProps) {
  const config = VARIANT_STYLES[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={inactive}
      onPress={() => {
        void tapHaptic("light");
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.regular,
        {
          backgroundColor: config.bg,
          borderColor: config.border ?? "transparent",
          borderWidth: config.border ? 1 : 0,
          opacity: inactive ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={config.text} />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            style={[
              styles.label,
              small ? styles.labelSmall : null,
              { color: config.text },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  regular: {
    minHeight: 52,
    paddingHorizontal: 20,
  },
  small: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  labelSmall: {
    fontSize: 13,
  },
});
