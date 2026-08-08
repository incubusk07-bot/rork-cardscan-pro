import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import {
  ClipboardList,
  House,
  Layers,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radii } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import { tapHaptic } from "@/utils/haptics";

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  route: string;
  matches: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "Home / Scanner",
    icon: House,
    route: "/",
    matches: (p) => p === "/" || p === "/scan",
  },
  {
    key: "collection",
    label: "My Collection & Portfolio",
    icon: Layers,
    route: "/collection",
    matches: (p) => p.startsWith("/collection") || p.startsWith("/card"),
  },
  {
    key: "review",
    label: "Expert Review Queue",
    icon: ClipboardList,
    route: "/review-queue",
    matches: (p) => p.startsWith("/review-queue"),
  },
  {
    key: "settings",
    label: "App Settings & Disclaimers",
    icon: Settings,
    route: "/settings",
    matches: (p) => p.startsWith("/settings"),
  },
];

/** Dark + gold sidebar (locked brand variant) with profile header. */
export default function DrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { session, syncState, setAuthSheetVisible, signOutUser } = useApp();

  const email = session?.user?.email ?? null;
  const displayName = email ? email.split("@")[0] : "Guest collector";
  const initial = (email ?? "V")[0].toUpperCase();

  const go = (route: string) => {
    void tapHaptic("select");
    props.navigation.closeDrawer();
    if (route === "/") {
      router.push("/(drawer)/(tabs)" as never);
    } else if (route === "/collection") {
      router.push("/(drawer)/(tabs)/collection" as never);
    } else {
      router.push(route as never);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            {email ? (
              <Text style={styles.avatarText}>{initial}</Text>
            ) : (
              <Image
                source={require("@/assets/images/brand/mark.png")}
                style={styles.avatarImg}
                contentFit="contain"
              />
            )}
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {email ?? "Local device only"}
            </Text>
            <View style={styles.syncChip}>
              <View
                style={[
                  styles.syncDot,
                  { backgroundColor: session && syncState !== "error" ? colors.success : colors.amber },
                ]}
              />
              <Text style={styles.syncText}>
                {session ? (syncState === "syncing" ? "Syncing…" : "Synced") : "Guest mode"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.brandDivider}>
          <Image
            source={require("@/assets/images/brand/mark.png")}
            style={styles.mark}
            contentFit="contain"
          />
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = item.matches(pathname);
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                testID={`drawer-${item.key}`}
                accessibilityRole="button"
                onPress={() => go(item.route)}
                style={({ pressed }) => [
                  styles.navItem,
                  active ? styles.navItemActive : null,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Icon size={20} color={active ? colors.goldOnDark : colors.slateOnDark} />
                <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dividerLineFull} />

        {session ? (
          <Pressable
            testID="drawer-signout"
            onPress={() => {
              props.navigation.closeDrawer();
              void signOutUser();
            }}
            style={({ pressed }) => [styles.navItem, { opacity: pressed ? 0.8 : 1 }]}
          >
            <LogOut size={20} color={colors.slateOnDark} />
            <Text style={styles.navLabel}>Sign Out</Text>
          </Pressable>
        ) : (
          <Pressable
            testID="drawer-signin"
            onPress={() => {
              props.navigation.closeDrawer();
              setAuthSheetVisible(true);
            }}
            style={({ pressed }) => [styles.signInButton, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.signInText}>Sign In / Create Account</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <ShieldCheck size={13} color={colors.slateOnDark} />
        <Text style={styles.footerText}>Pre-Grade Estimates only · Not official certification</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.charcoal,
    paddingHorizontal: 18,
  },
  scroll: {
    gap: 18,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.goldOnDark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "72%",
    height: "72%",
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.goldOnDark,
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.textOnDark,
    textTransform: "capitalize",
  },
  email: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slateOnDark,
  },
  syncChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)",
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 4,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: colors.goldSoftOnDark,
  },
  brandDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 7,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.charcoalLine,
  },
  dividerLineFull: {
    height: 1,
    backgroundColor: colors.charcoalLine,
  },
  nav: {
    gap: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: radii.md,
  },
  navItemActive: {
    backgroundColor: "rgba(212, 175, 55, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
  },
  navLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14.5,
    color: colors.slateOnDark,
    flex: 1,
  },
  navLabelActive: {
    color: colors.textOnDark,
    fontFamily: fonts.bold,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: colors.goldOnDark,
    height: 50,
    borderRadius: radii.md,
  },
  signInText: {
    fontFamily: fonts.extrabold,
    fontSize: 14.5,
    color: colors.charcoal,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 12,
  },
  footerText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.slateOnDark,
    flex: 1,
  },
});
