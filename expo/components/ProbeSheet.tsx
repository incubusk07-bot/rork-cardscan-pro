import { ClipboardCheck } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GoldButton from "@/components/GoldButton";
import { PROBE_QUESTIONS } from "@/constants/config";
import { colors, fonts, radii } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import type { ProbeAnswer, ScanAnalysis } from "@/types/card";
import { tapHaptic } from "@/utils/haptics";

interface ProbeSheetProps {
  visible: boolean;
  analysis: ScanAnalysis;
  onClose: () => void;
  onSubmitted: () => void;
}

/**
 * Guided probe questions shown BEFORE spending an expert-review credit.
 * Credits are only deducted on explicit submission.
 */
export default function ProbeSheet({ visible, analysis, onClose, onSubmitted }: ProbeSheetProps) {
  const { credits, submitForReview } = useApp();
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});

  const allAnswered = PROBE_QUESTIONS.every((q) => answers[q.id] === true || answers[q.id] === false);
  const noCredits = credits <= 0;

  const setAnswer = (id: string, value: boolean) => {
    void tapHaptic("select");
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const submit = () => {
    const probeAnswers: ProbeAnswer[] = PROBE_QUESTIONS.map((q) => ({
      questionId: q.id,
      question: q.text,
      answer: answers[q.id] === true,
    }));
    const ok = submitForReview(analysis, probeAnswers);
    if (ok) {
      void tapHaptic("success");
      setAnswers({});
      onSubmitted();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdropWrap}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <ClipboardCheck size={20} color={colors.goldDeep} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Quick physical check</Text>
              <Text style={styles.subtitle}>
                Answer these before sending to an expert — some traits can’t be seen by camera.
              </Text>
            </View>
          </View>

          <ScrollView style={styles.questions} contentContainerStyle={styles.questionsContent}>
            {PROBE_QUESTIONS.map((q, index) => (
              <View key={q.id} style={styles.questionCard}>
                <Text style={styles.questionNumber}>QUESTION {index + 1} OF {PROBE_QUESTIONS.length}</Text>
                <Text style={styles.questionText}>{q.text}</Text>
                <View style={styles.answerRow}>
                  <Pressable
                    testID={`probe-${q.id}-yes`}
                    onPress={() => setAnswer(q.id, true)}
                    style={[styles.answer, answers[q.id] === true ? styles.answerYes : null]}
                  >
                    <Text
                      style={[
                        styles.answerText,
                        answers[q.id] === true ? { color: colors.successDeep } : null,
                      ]}
                    >
                      Yes
                    </Text>
                  </Pressable>
                  <Pressable
                    testID={`probe-${q.id}-no`}
                    onPress={() => setAnswer(q.id, false)}
                    style={[styles.answer, answers[q.id] === false ? styles.answerNo : null]}
                  >
                    <Text
                      style={[
                        styles.answerText,
                        answers[q.id] === false ? { color: colors.errorDeep } : null,
                      ]}
                    >
                      No
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.credits}>
              {noCredits
                ? "No expert review credits left — top-ups coming soon."
                : `This uses 1 credit · ${credits} left`}
            </Text>
            <GoldButton
              testID="probe-submit"
              label="Submit for Expert Review"
              onPress={submit}
              disabled={!allAnswered || noCredits}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "88%",
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairlineStrong,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldPale,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 19,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  questions: {
    flexGrow: 0,
  },
  questionsContent: {
    gap: 10,
    paddingBottom: 6,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 14,
    gap: 8,
  },
  questionNumber: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    letterSpacing: 1,
    color: colors.goldDeep,
  },
  questionText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  answerRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  answer: {
    flex: 1,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  answerYes: {
    backgroundColor: colors.successPale,
    borderColor: "rgba(18, 183, 106, 0.45)",
  },
  answerNo: {
    backgroundColor: colors.errorPale,
    borderColor: "rgba(240, 68, 56, 0.45)",
  },
  answerText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.inkSoft,
  },
  footer: {
    paddingTop: 12,
    gap: 10,
  },
  credits: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.inkSoft,
    textAlign: "center",
  },
});
