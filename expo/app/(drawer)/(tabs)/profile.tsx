import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  ClipboardList,
  Gem,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import BrandHeader from "@/components/BrandHeader";
import DisclaimerNote from "@/components/DisclaimerNote";
import GoldButton from "@/components/GoldButton";
import { ANDROID_BUILD } from "@/constants/config";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import { tapHaptic } from "@/utils/haptics";

export default function ProfileScreen() {
  const router = useRouter();
  const {
    session,
    syncState,
    setAuthSheetVisible,
    signOutUser,
    credits,
    scans,
    collection,
    watchlist,
    reviewTasks,
  } = useApp();

  const email = session?.user?.email ?? null;
  const displayName = email ? email.split("@")[0] : "Guest collector";
  const initial = (email ?? "V")[0].toUpperCase();
  const pendingReviews = reviewTasks.filter((t) => t.status !== "completed").length;

  return (
    <View style={styles.container}>
      <BrandHeader showMenu title="Profile" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.accountCard, shadows.card]}>
          <View style={styles.avatarRow}>
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
            <View style={styles.accountInfo}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {email ?? "Data stays on this device"}
              </Text>
              <View style={styles.syncChip}>
                <View
                  style={[
                    styles.syncDot,
                    { backgroundColor: session && syncState !== "error" ? colors.success : colors.amber },
                  ]}
                />
                <Text style={styles.syncText}>
                  {session
                    ? syncState === "syncing"
                      ? "Syncing to cloud…"
                      : "Backed up to cloud"
                    : "Guest mode · local only"}
                </Text>
              </View>
            </View>
          </View>
          {session ? (
            <GoldButton
              testID="profile-signout"
              label="Sign Out"
              variant="ghost"
              small
              icon={<LogOut size={15} color={colors.ink} />}
              onPress={() => void signOutUser()}
            />
          ) : (
            <GoldButton
              testID="profile-signin"
              label="Sign In / Create Account"
              small
              onPress={() => setAuthSheetVisible(true)}
            />
          )}
        </View>

        <View style={[styles.creditsCard, shadows.card]}>
          <View style={styles.creditsIcon}>
            <Gem size={22} color={colors.goldOnDark} />
          </View>
          <View style={styles.creditsInfo}>
            <Text style={styles.creditsValue}>{credits}</Text>
            <Text style={styles.creditsLabel}>Expert review credits</Text>
            <Text style={styles.creditsSub}>
              Spent only when you explicitly submit a card for expert review.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{scans.length}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{collection.length}</Text>
            <Text style={styles.statLabel}>In vault</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{watchlist.length}</Text>
            <Text style={styles.statLabel}>Watching</Text>
          </View>
        </View>

        <View style={styles.menu}>
          <Pressable
            testID="profile-review-queue"
            onPress={() => {
              void tapHaptic("select");
              router.push("/review-queue");
            }}
            style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.8 : 1 }]}
          >
            <ClipboardList size={20} color={colors.goldDeep} />
            <Text style={styles.menuLabel}>Expert Review Queue</Text>
            {pendingReviews > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingReviews}</Text>
              </View>
            ) : null}
            <ChevronRight size={18} color={colors.inkFaint} />
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            testID="profile-settings"
            onPress={() => {
              void tapHaptic("select");
              router.push("/settings");
            }}
            style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Settings size={20} color={colors.goldDeep} />
            <Text style={styles.menuLabel}>App Settings & Disclaimers</Text>
            <ChevronRight size={18} color={colors.inkFaint} />
          </Pressable>
        </View>

        <DisclaimerNote variant="full" />

        <View style={styles.buildInfo}>
          <ShieldCheck size={12} color={colors.inkFaint} />
          <Text style={styles.buildText}>
            Verex v1.0.0 · {ANDROID_BUILD.applicationId}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 16,
    gap: 14,
  },
  avatarRow: {
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
    borderColor: colors.gold,
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
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    color: colors.ink,
    textTransform: "capitalize",
  },
  email: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.inkSoft,
  },
  syncChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: colors.inkSoft,
  },
  creditsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.charcoal,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    padding: 16,
  },
  creditsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(212, 175, 55, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  creditsInfo: {
    flex: 1,
    gap: 1,
  },
  creditsValue: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.goldOnDark,
  },
  creditsLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textOnDark,
  },
  creditsSub: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.slateOnDark,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: 14,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.inkSoft,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  menuLabel: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14.5,
    color: colors.ink,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginLeft: 48,
  },
  badge: {
    backgroundColor: colors.goldPale,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.goldDeep,
  },
  buildInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  buildText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.inkFaint,
  },
});
