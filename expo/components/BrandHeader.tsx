import { DrawerActions } from "@react-navigation/native";
import { Image } from "expo-image";
import { useNavigation } from "expo-router";
import { ChevronLeft, Menu } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts } from "@/constants/theme";
import { tapHaptic } from "@/utils/haptics";

interface BrandHeaderProps {
  title?: string;
  dark?: boolean;
  showMenu?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

/**
 * Custom header: hamburger (drawer) or back on the left, gold wordmark or
 * serif title centered, optional action on the right.
 */
export default function BrandHeader({
  title,
  dark = false,
  showMenu = false,
  showBack = false,
  onBack,
  right,
}: BrandHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const iconColor = dark ? colors.goldOnDark : colors.ink;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 6,
          backgroundColor: dark ? colors.charcoal : "transparent",
          borderBottomColor: dark ? colors.charcoalLine : "transparent",
        },
      ]}
    >
      <View style={styles.side}>
        {showMenu ? (
          <Pressable
            testID="header-menu"
            accessibilityLabel="Open menu"
            hitSlop={10}
            onPress={() => {
              void tapHaptic("select");
              navigation.dispatch(DrawerActions.openDrawer());
            }}
            style={styles.iconButton}
          >
            <Menu size={22} color={iconColor} />
          </Pressable>
        ) : showBack ? (
          <Pressable
            testID="header-back"
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={() => {
              void tapHaptic("select");
              if (onBack) onBack();
            }}
            style={styles.iconButton}
          >
            <ChevronLeft size={24} color={iconColor} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      <View style={styles.center}>
        {title ? (
          <Text style={[styles.title, { color: dark ? colors.textOnDark : colors.ink }]} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <Image
            source={require("@/assets/images/brand/wordmark.png")}
            style={styles.wordmark}
            contentFit="contain"
          />
        )}
      </View>

      <View style={[styles.side, styles.rightSide]}>{right ?? <View style={styles.iconButton} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 52,
    alignItems: "flex-start",
  },
  rightSide: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 19,
  },
  wordmark: {
    width: 118,
    height: 20,
  },
});
