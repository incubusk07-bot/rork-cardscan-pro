import { useRouter } from "expo-router";
import { Fingerprint, LogOut, ShieldCheck, Trash2, Vibrate } from "lucide-react-native";
import React from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import BrandHeader from "@/components/BrandHeader";
import DisclaimerNote from "@/components/DisclaimerNote";
import GoldButton from "@/components/GoldButton";
import { ANDROID_BUILD } from "@/constants/config";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import { tapHaptic } from "@/utils/haptics";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    session,
    setAuthSheetVisible,
    signOutUser,
    autoCapture,
    setAutoCapture,
    hapticsEnabled,
    setHapticsEnabled,
    clearLocalData,
  } = useApp();

  const confirmClear = () => {
    Alert.alert(
      "Clear local data?",
      "Scans, collection, watchlist and review queue on this device will be erased. Cloud backups (if signed in) are not touched.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            void tapHaptic("warning");
            clearLocalData();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <BrandHeader showBack onBack={() => router.back()} title="Settings" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SCANNING</Text>
          <View style={[styles.card, shadows.card]}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Auto-capture</Text>
                <Text style={styles.rowSub}>Shoot automatically once the card is framed</Text>
              </View>
              <Switch
                testID="settings-auto"
                value={autoCapture}
                onValueChange={setAutoCapture}
                trackColor={{ false: colors.hairlineStrong, true: colors.gold }}
                thumbColor={colors.surface}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowIconBox}>
                <Vibrate size={17} color={colors.goldDeep} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Haptic feedback</Text>
                <Text style={styles.rowSub}>Subtle taps on capture and verdicts</Text>
              </View>
              <Switch
                testID="settings-haptics"
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={{ false: colors.hairlineStrong, true: colors.gold }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={[styles.card, shadows.card]}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{session?.user?.email ?? "Guest mode"}</Text>
                <Text style={styles.rowSub}>
                  {session
                    ? "Collection and gradings back up to your account."
                    : "Everything stays on this device until you sign in."}
                </Text>
              </View>
            </View>
            <View style={styles.buttonPad}>
              {session ? (
                <GoldButton
                  testID="settings-signout"
                  label="Sign Out"
                  variant="ghost"
                  small
                  icon={<LogOut size={15} color={colors.ink} />}
                  onPress={() => void signOutUser()}
                />
              ) : (
                <GoldButton
                  testID="settings-signin"
                  label="Sign In / Create Account"
                  small
                  onPress={() => setAuthSheetVisible(true)}
                />
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA</Text>
          <View style={[styles.card, shadows.card]}>
            <View style={styles.buttonPad}>
              <GoldButton
                testID="settings-clear"
                label="Clear local data"
                variant="danger"
                small
                icon={<Trash2 size={15} color={colors.errorDeep} />}
                onPress={confirmClear}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LEGAL & DISCLAIMERS</Text>
          <DisclaimerNote variant="full" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BUILD</Text>
          <View style={[styles.card, shadows.card, styles.buildCard]}>
            <View style={styles.buildRow}>
              <Fingerprint size={16} color={colors.goldDeep} />
              <Text style={styles.buildTitle}>Android signing (for Google Sign-In)</Text>
            </View>
            <Text style={styles.buildMono}>package: {ANDROID_BUILD.applicationId}</Text>
            <Text style={styles.buildMono}>SHA-1 debug: {ANDROID_BUILD.debugSha1}</Text>
            <Text style={styles.buildMono}>SHA-1 release: {ANDROID_BUILD.releaseSha1}</Text>
            <Text style={styles.buildHint}>
              Replace the placeholders in constants/config.ts and register both fingerprints with
              the Google provider in Supabase. Full steps live in supabase/schema.sql.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={12} color={colors.inkFaint} />
          <Text style={styles.footerText}>Verex v1.0.0 · Not affiliated with PSA, Beckett or CGC</Text>
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
    paddingBottom: 40,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.inkFaint,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.goldFaint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.ink,
  },
  rowSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
  },
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginLeft: 16,
  },
  buttonPad: {
    padding: 14,
    paddingTop: 4,
  },
  buildCard: {
    padding: 16,
    gap: 6,
  },
  buildRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  buildTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.ink,
  },
  buildMono: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.inkSoft,
  },
  buildHint: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.inkFaint,
    marginTop: 6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.inkFaint,
  },
});
