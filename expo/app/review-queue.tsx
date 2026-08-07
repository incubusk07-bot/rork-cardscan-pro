import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { CheckCircle2, ClipboardList, Clock3, Gem, Search } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import BrandHeader from "@/components/BrandHeader";
import DisclaimerNote from "@/components/DisclaimerNote";
import EmptyState from "@/components/EmptyState";
import GoldButton from "@/components/GoldButton";
import { conditionLabel, gameLabel } from "@/constants/config";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import type { ReviewStatus, ReviewTask } from "@/types/card";
import { timeAgo } from "@/utils/format";

const STATUS_CONFIG: Record<ReviewStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Pending", bg: colors.amberPale, text: colors.amberDeep },
  in_review: { label: "In Review", bg: colors.goldPale, text: colors.goldDeep },
  completed: { label: "Completed", bg: colors.successPale, text: colors.successDeep },
};

export default function ReviewQueueScreen() {
  const router = useRouter();
  const { reviewTasks, credits } = useApp();

  return (
    <View style={styles.container}>
      <BrandHeader showBack onBack={() => router.back()} title="Expert Review" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.creditsCard, shadows.card]}>
          <View style={styles.creditsIcon}>
            <Gem size={22} color={colors.goldOnDark} />
          </View>
          <View style={styles.creditsInfo}>
            <Text style={styles.creditsValue}>{credits}</Text>
            <Text style={styles.creditsLabel}>credits remaining</Text>
          </View>
          <GoldButton label="Top-ups soon" variant="ghostOnDark" small disabled onPress={() => undefined} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR QUEUE · {reviewTasks.length}</Text>
          {reviewTasks.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={28} color={colors.goldDeep} />}
              title="No expert reviews yet"
              body="When a verdict feels uncertain, submit the card from its Pre-Grade Report. Credits are only spent when you submit."
            />
          ) : (
            reviewTasks.map((task: ReviewTask) => {
              const status = STATUS_CONFIG[task.status];
              return (
                <View key={task.id} style={[styles.taskCard, shadows.card]}>
                  <View style={styles.taskImageBox}>
                    {task.photoUri ? (
                      <Image source={{ uri: task.photoUri }} style={styles.taskImage} contentFit="cover" />
                    ) : (
                      <Search size={18} color={colors.gold} />
                    )}
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskName} numberOfLines={1}>
                      {task.cardName}
                    </Text>
                    <Text style={styles.taskMeta} numberOfLines={1}>
                      {task.game ? `${gameLabel(task.game)} · ` : ""}
                      {task.conditionScore.toFixed(1)} {conditionLabel(task.conditionScore)} ·{" "}
                      {timeAgo(task.createdAt)}
                    </Text>
                    <View style={styles.taskFooter}>
                      <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                        {task.status === "completed" ? (
                          <CheckCircle2 size={12} color={status.text} />
                        ) : (
                          <Clock3 size={12} color={status.text} />
                        )}
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                      </View>
                      <Text style={styles.answersMeta}>
                        {task.probeAnswers.filter((a) => a.answer).length}/{task.probeAnswers.length} checks passed
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.howCard, shadows.card]}>
          <Text style={styles.howTitle}>How expert review works</Text>
          <View style={styles.howRow}>
            <Text style={styles.howNumber}>1</Text>
            <Text style={styles.howText}>
              You answer four quick physical probes — foil, back, edge core, feel.
            </Text>
          </View>
          <View style={styles.howRow}>
            <Text style={styles.howNumber}>2</Text>
            <Text style={styles.howText}>
              Your photo + probe answers land in the human review queue (1 credit).
            </Text>
          </View>
          <View style={styles.howRow}>
            <Text style={styles.howNumber}>3</Text>
            <Text style={styles.howText}>
              A reviewer weighs traits the camera can’t see and returns a written opinion.
            </Text>
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
    gap: 18,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(212, 175, 55, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  creditsInfo: {
    flex: 1,
  },
  creditsValue: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.goldOnDark,
  },
  creditsLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slateOnDark,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.inkFaint,
  },
  taskCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 12,
  },
  taskImageBox: {
    width: 56,
    height: 76,
    borderRadius: 8,
    backgroundColor: colors.goldFaint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  taskImage: {
    width: "100%",
    height: "100%",
  },
  taskInfo: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  taskName: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.ink,
  },
  taskMeta: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.inkSoft,
  },
  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 3,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  answersMeta: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.inkFaint,
  },
  howCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 16,
    gap: 12,
  },
  howTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.ink,
  },
  howRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  howNumber: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.goldDeep,
    width: 20,
    textAlign: "center",
  },
  howText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
});
