import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Bell,
  ChevronRight,
  Layers,
  ScanLine,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import React, { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import BrandHeader from "@/components/BrandHeader";
import DisclaimerNote from "@/components/DisclaimerNote";
import SectionTitle from "@/components/SectionTitle";
import TrendChart from "@/components/TrendChart";
import { GAMES, conditionLabel } from "@/constants/config";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import type { ScanAnalysis, VerdictKind } from "@/types/card";
import { formatDelta, formatMoney, timeAgo } from "@/utils/format";
import { tapHaptic } from "@/utils/haptics";

const VERDICT_DOT: Record<VerdictKind, string> = {
  likely_original: colors.success,
  likely_counterfeit: colors.error,
  inconclusive: colors.amber,
};

const VERDICT_SHORT: Record<VerdictKind, string> = {
  likely_original: "Likely Original",
  likely_counterfeit: "Likely Fake",
  inconclusive: "Inconclusive",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, collector.";
  if (hour < 18) return "Good afternoon, collector.";
  return "Good evening, collector.";
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    hydrated,
    onboarded,
    portfolioValue,
    portfolioHistory,
    scans,
    collection,
    credits,
    reviewTasks,
  } = useApp();

  useEffect(() => {
    if (hydrated && !onboarded) {
      router.replace("/onboarding");
    }
  }, [hydrated, onboarded, router]);

  const chartPoints = useMemo(
    () => portfolioHistory.slice(-30).map((p) => p.total),
    [portfolioHistory],
  );
  const delta =
    chartPoints.length >= 2 ? chartPoints[chartPoints.length - 1] - chartPoints[0] : 0;
  const pendingReviews = reviewTasks.filter((t) => t.status !== "completed").length;

  return (
    <View style={styles.container}>
      <BrandHeader
        showMenu
        right={
          <Pressable
            testID="home-bell"
            hitSlop={10}
            onPress={() => {
              void tapHaptic("select");
              router.push("/review-queue");
            }}
            style={styles.bellButton}
          >
            <Bell size={21} color={colors.ink} />
            {pendingReviews > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.greetingBlock}>
          <Text style={styles.overline}>THE COLLECTOR’S DESK</Text>
          <Text style={styles.greeting}>{greeting()}</Text>
        </View>

        <Pressable
          testID="home-portfolio"
          onPress={() => {
            void tapHaptic("select");
            router.push("/collection");
          }}
          style={({ pressed }) => [styles.portfolioCard, shadows.raised, { opacity: pressed ? 0.92 : 1 }]}
        >
          <View style={styles.portfolioTop}>
            <View>
              <Text style={styles.portfolioLabel}>PORTFOLIO VALUE</Text>
              <Text style={styles.portfolioValue}>{formatMoney(portfolioValue)}</Text>
            </View>
            <View
              style={[
                styles.deltaChip,
                { backgroundColor: delta >= 0 ? "rgba(18,183,106,0.16)" : "rgba(240,68,56,0.16)" },
              ]}
            >
              {delta >= 0 ? (
                <TrendingUp size={13} color={colors.success} />
              ) : (
                <TrendingDown size={13} color={colors.error} />
              )}
              <Text
                style={[styles.deltaText, { color: delta >= 0 ? colors.success : colors.error }]}
              >
                {formatDelta(delta)}
              </Text>
            </View>
          </View>
          {chartPoints.length > 0 ? (
            <TrendChart
              points={chartPoints}
              width={width - 40 - 36}
              height={58}
              stroke={colors.goldOnDark}
              gradientId="homeTrend"
            />
          ) : (
            <Text style={styles.portfolioEmpty}>Save graded cards to start tracking value.</Text>
          )}
          <View style={styles.portfolioBottom}>
            <Text style={styles.portfolioCount}>
              {collection.length} card{collection.length === 1 ? "" : "s"} in your vault
            </Text>
            <View style={styles.portfolioLink}>
              <Text style={styles.portfolioLinkText}>Open collection</Text>
              <ChevronRight size={14} color={colors.goldSoftOnDark} />
            </View>
          </View>
        </Pressable>

        <Pressable
          testID="home-scan-cta"
          onPress={() => {
            void tapHaptic("medium");
            router.push("/scan");
          }}
          style={({ pressed }) => [styles.scanCta, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
        >
          <View style={styles.scanIconBox}>
            <ScanLine size={26} color={colors.charcoal} />
          </View>
          <View style={styles.scanTextCol}>
            <Text style={styles.scanTitle}>Scan a card</Text>
            <Text style={styles.scanSub}>
              Authenticity signals + condition pre-grade in seconds
            </Text>
          </View>
          <ChevronRight size={20} color={colors.charcoal} />
        </Pressable>

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
            <Text style={[styles.statValue, { color: colors.goldDeep }]}>{credits}</Text>
            <Text style={styles.statLabel}>Credits</Text>
          </View>
        </View>

        {scans.length > 0 ? (
          <View>
            <SectionTitle overline="RECENT" title="Latest pre-grades" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {scans.slice(0, 8).map((scan: ScanAnalysis) => (
                <Pressable
                  key={scan.id}
                  testID={`recent-${scan.id}`}
                  onPress={() => {
                    void tapHaptic("select");
                    router.push({ pathname: "/scan-result", params: { scanId: scan.id } });
                  }}
                  style={({ pressed }) => [styles.recentCard, shadows.card, { opacity: pressed ? 0.88 : 1 }]}
                >
                  <View style={styles.recentImageBox}>
                    {scan.card?.imageUrl ?? scan.photoUri ? (
                      <Image
                        source={{ uri: scan.card?.imageUrl ?? scan.photoUri }}
                        style={styles.recentImage}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <Layers size={22} color={colors.gold} />
                    )}
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {scan.card?.name ?? (scan.nameGuess || "Unknown card")}
                    </Text>
                    <View style={styles.recentVerdictRow}>
                      <View style={[styles.verdictDot, { backgroundColor: VERDICT_DOT[scan.verdict] }]} />
                      <Text style={styles.recentVerdict} numberOfLines={1}>
                        {VERDICT_SHORT[scan.verdict]}
                      </Text>
                    </View>
                    <Text style={styles.recentMeta}>
                      {scan.conditionScore.toFixed(1)} · {conditionLabel(scan.conditionScore)}
                    </Text>
                    <Text style={styles.recentTime}>{timeAgo(scan.createdAt)}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.firstScanCard, shadows.card]}>
            <Sparkles size={20} color={colors.goldDeep} />
            <View style={styles.firstScanText}>
              <Text style={styles.firstScanTitle}>Your desk is clear</Text>
              <Text style={styles.firstScanBody}>
                Scan your first card — no account needed. Guest mode keeps everything on this
                device.
              </Text>
            </View>
          </View>
        )}

        <View>
          <SectionTitle overline="COVERAGE" title="Supported games" />
          <View style={styles.gamesRow}>
            {GAMES.map((g) => (
              <View key={g.id} style={styles.gameChip}>
                <Text style={styles.gameChipText}>{g.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <DisclaimerNote variant="compact" />
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
    gap: 22,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  greetingBlock: {
    gap: 4,
  },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.goldDeep,
  },
  greeting: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  portfolioCard: {
    backgroundColor: colors.charcoal,
    borderRadius: radii.xl,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  portfolioTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  portfolioLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.goldSoftOnDark,
    marginBottom: 4,
  },
  portfolioValue: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 42,
    color: colors.textOnDark,
  },
  deltaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  deltaText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  portfolioEmpty: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.slateOnDark,
  },
  portfolioBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  portfolioCount: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slateOnDark,
  },
  portfolioLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  portfolioLinkText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.goldSoftOnDark,
  },
  scanCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    padding: 16,
  },
  scanIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "rgba(11, 15, 20, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanTextCol: {
    flex: 1,
    gap: 2,
  },
  scanTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 19,
    color: colors.charcoal,
  },
  scanSub: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: "rgba(11, 15, 20, 0.72)",
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
  recentRow: {
    gap: 12,
    paddingRight: 8,
  },
  recentCard: {
    width: 148,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
  },
  recentImageBox: {
    height: 128,
    backgroundColor: colors.goldFaint,
    alignItems: "center",
    justifyContent: "center",
  },
  recentImage: {
    width: "100%",
    height: "100%",
  },
  recentInfo: {
    padding: 10,
    gap: 3,
  },
  recentName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  recentVerdictRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  verdictDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  recentVerdict: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.inkSoft,
    flex: 1,
  },
  recentMeta: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.goldDeep,
  },
  recentTime: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.inkFaint,
  },
  firstScanCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 16,
    alignItems: "flex-start",
  },
  firstScanText: {
    flex: 1,
    gap: 3,
  },
  firstScanTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 17,
    color: colors.ink,
  },
  firstScanBody: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  gamesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gameChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  gameChipText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.inkSoft,
  },
});
