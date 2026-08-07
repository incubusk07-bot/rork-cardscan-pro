import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  CheckCircle2,
  ClipboardList,
  Crosshair,
  Frame,
  Grip,
  Info,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Square,
  Star,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BrandHeader from "@/components/BrandHeader";
import DisclaimerNote from "@/components/DisclaimerNote";
import GoldButton from "@/components/GoldButton";
import PillarRow from "@/components/PillarRow";
import PriceFlag from "@/components/PriceFlag";
import ProbeSheet from "@/components/ProbeSheet";
import ScoreRing from "@/components/ScoreRing";
import SignalRow from "@/components/SignalRow";
import VerdictBanner from "@/components/VerdictBanner";
import { gameLabel } from "@/constants/config";
import { colors, fonts, radii, shadows } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import { analyzeScan, applyChosenCard, type PipelineStage } from "@/services/pipeline";
import type { MatchedCard, ScanAnalysis } from "@/types/card";
import { formatMoney } from "@/utils/format";
import { tapHaptic } from "@/utils/haptics";

type Stage = PipelineStage | "done" | "retake" | "error";

const STEPS: { key: PipelineStage; label: string; sub: string }[] = [
  { key: "prepare", label: "Preparing image", sub: "Optimizing the frame" },
  { key: "ocr", label: "Reading card text", sub: "Free OCR pre-check — no credits used" },
  { key: "match", label: "Matching reference database", sub: "Pokémon · YGO · One Piece · MTG" },
  { key: "condition", label: "AI condition inspection", sub: "Corners, edges, surface, centering" },
  { key: "verdict", label: "Building verdict", sub: "Weighing authenticity signals" },
];

const STAGE_ORDER: Record<PipelineStage, number> = {
  prepare: 0,
  ocr: 1,
  match: 2,
  condition: 3,
  verdict: 4,
};

function SpinIcon() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  return (
    <Animated.View
      style={{
        transform: [
          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
        ],
      }}
    >
      <Loader2 size={19} color={colors.goldOnDark} />
    </Animated.View>
  );
}

export default function ScanResultScreen() {
  const params = useLocalSearchParams<{ photoUri?: string; scanId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    scans,
    registerScan,
    updateScan,
    labelScan,
    saveToCollection,
    toggleWatch,
    isWatched,
    maybePromptAuth,
    credits,
  } = useApp();

  const [stage, setStage] = useState<Stage>("prepare");
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [probeVisible, setProbeVisible] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (params.scanId) {
      const existing = scans.find((s) => s.id === params.scanId);
      if (existing) {
        setAnalysis(existing);
        setStage("done");
      } else {
        setStage("error");
      }
      return;
    }

    const photoUri = params.photoUri;
    if (!photoUri) {
      setStage("error");
      return;
    }

    (async () => {
      try {
        const result = await analyzeScan({ photoUri }, (s) => setStage(s));
        setAnalysis(result);
        if (!result.quality.ok) {
          void tapHaptic("warning");
          setStage("retake");
          return;
        }
        registerScan(result);
        void tapHaptic("success");
        setStage("done");
        setTimeout(() => maybePromptAuth("scan"), 1400);
      } catch (e) {
        console.log("[scan-result] pipeline failed", e);
        setStage("error");
      }
    })();
  }, [params.photoUri, params.scanId, scans, registerScan, maybePromptAuth]);

  const chooseCandidate = (card: MatchedCard) => {
    if (!analysis) return;
    void tapHaptic("select");
    const next = applyChosenCard(analysis, card);
    setAnalysis(next);
    updateScan(next);
  };

  const onSave = () => {
    if (!analysis || !analysis.card || analysis.savedToCollection) return;
    const ok = saveToCollection(analysis);
    if (ok) {
      void tapHaptic("success");
      setAnalysis({ ...analysis, savedToCollection: true });
    }
  };

  const onLabel = (label: "confirmed_original" | "confirmed_fake") => {
    if (!analysis) return;
    void tapHaptic("select");
    labelScan(analysis.id, label);
    setAnalysis({ ...analysis, userLabel: label });
  };

  const watched = analysis?.card ? isWatched(analysis.card.id) : false;

  const price = analysis?.card?.marketPrice ?? null;

  const stageIndex = useMemo(() => {
    if (stage === "done" || stage === "retake" || stage === "error") return STEPS.length;
    return STAGE_ORDER[stage];
  }, [stage]);

  // ---------- analyzing / retake / error (dark lab) ----------
  if (stage !== "done") {
    return (
      <View style={[styles.darkContainer, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <StatusBar style="light" />
        {stage === "retake" && analysis ? (
          <View style={styles.retakeWrap}>
            <View style={styles.retakePhotoBox}>
              <Image source={{ uri: analysis.photoUri }} style={styles.retakePhoto} contentFit="cover" />
              <View style={styles.retakeDim} />
              <RotateCcw size={34} color={colors.goldOnDark} style={styles.retakeIcon} />
            </View>
            <Text style={styles.darkTitle}>Let’s retake that</Text>
            <Text style={styles.darkBody}>
              The pre-check gatekeeper stopped this scan — nothing was spent.
            </Text>
            <View style={styles.reasonsCard}>
              {analysis.quality.reasons.map((r) => (
                <View key={r} style={styles.reasonRow}>
                  <ShieldAlert size={15} color={colors.amber} />
                  <Text style={styles.reasonText}>{r}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.darkHint}>Even, diffused light · no glare · card fills the frame</Text>
            <GoldButton
              testID="result-retake"
              label="Retake photo"
              onPress={() => router.back()}
              style={styles.retakeButton}
            />
          </View>
        ) : stage === "error" ? (
          <View style={styles.retakeWrap}>
            <ShieldAlert size={40} color={colors.amber} />
            <Text style={styles.darkTitle}>Something went sideways</Text>
            <Text style={styles.darkBody}>
              The analysis couldn’t finish. Check your connection and try again.
            </Text>
            <GoldButton label="Back to scanner" onPress={() => router.back()} style={styles.retakeButton} />
          </View>
        ) : (
          <View style={styles.analyzeWrap}>
            {params.photoUri ? (
              <View style={styles.analyzePhotoBox}>
                <Image source={{ uri: params.photoUri }} style={styles.analyzePhoto} contentFit="cover" />
              </View>
            ) : null}
            <Text style={styles.darkTitle}>Inspecting your card</Text>
            <View style={styles.stepsCard}>
              {STEPS.map((step, i) => {
                const isDone = i < stageIndex;
                const isActive = i === stageIndex;
                return (
                  <View key={step.key} style={styles.stepRow}>
                    <View style={styles.stepIcon}>
                      {isDone ? (
                        <CheckCircle2 size={19} color={colors.goldOnDark} />
                      ) : isActive ? (
                        <SpinIcon />
                      ) : (
                        <View style={styles.stepPending} />
                      )}
                    </View>
                    <View style={styles.stepText}>
                      <Text
                        style={[
                          styles.stepLabel,
                          { color: isDone || isActive ? colors.textOnDark : colors.slateOnDark },
                        ]}
                      >
                        {step.label}
                      </Text>
                      {isActive ? <Text style={styles.stepSub}>{step.sub}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
            <Text style={styles.darkHint}>Zero-credit pre-check — expert review is only ever manual</Text>
          </View>
        )}
      </View>
    );
  }

  // ---------- report (light) ----------
  if (!analysis) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <BrandHeader showBack onBack={() => router.back()} title="Pre-Grade Report" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.identityCard, shadows.card]}>
          <View style={styles.identityImageBox}>
            <Image
              source={{ uri: analysis.card?.imageUrl ?? analysis.photoUri }}
              style={styles.identityImage}
              contentFit="cover"
              transition={180}
            />
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.identityGame}>
              {analysis.card ? gameLabel(analysis.card.game).toUpperCase() : "UNIDENTIFIED"}
            </Text>
            <Text style={styles.identityName} numberOfLines={2}>
              {analysis.card?.name ?? (analysis.nameGuess || "Unknown card")}
            </Text>
            {analysis.card?.setName ? (
              <Text style={styles.identitySet} numberOfLines={1}>
                {analysis.card.setName}
                {analysis.card.number ? ` · ${analysis.card.number}` : ""}
              </Text>
            ) : null}
            <View style={styles.confidenceChip}>
              <Text style={styles.confidenceText}>
                {analysis.card
                  ? `${analysis.matchConfidence}% match confidence`
                  : `Best guess ${analysis.matchConfidence}% — below the 85% bar`}
              </Text>
            </View>
          </View>
        </View>

        {!analysis.card && analysis.candidates.length > 0 ? (
          <View style={[styles.candidatesCard, shadows.card]}>
            <Text style={styles.candidatesTitle}>Which card is this?</Text>
            <Text style={styles.candidatesSub}>
              Confidence was under 85%, so you choose — the verdict stays cautious either way.
            </Text>
            {analysis.candidates.map((c) => (
              <Pressable
                key={c.id}
                testID={`candidate-${c.id}`}
                onPress={() => chooseCandidate(c)}
                style={({ pressed }) => [styles.candidateRow, { opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={styles.candidateImageBox}>
                  {c.imageUrl ? (
                    <Image source={{ uri: c.imageUrl }} style={styles.candidateImage} contentFit="cover" />
                  ) : null}
                </View>
                <View style={styles.candidateInfo}>
                  <Text style={styles.candidateName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.candidateSet} numberOfLines={1}>
                    {c.setName ?? gameLabel(c.game)}
                    {c.number ? ` · ${c.number}` : ""}
                  </Text>
                </View>
                <Text style={styles.candidatePick}>Select</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <VerdictBanner
          verdict={analysis.verdict}
          subtitle={
            analysis.card
              ? `Automated visual screen at ${analysis.matchConfidence}% database match — not a certification.`
              : undefined
          }
        />

        <View style={[styles.sectionCard, shadows.card]}>
          <Text style={styles.sectionTitle}>Authenticity signals</Text>
          {analysis.signals.map((s) => (
            <SignalRow key={s.id} signal={s} />
          ))}
        </View>

        <View style={[styles.sectionCard, shadows.card, styles.conditionCard]}>
          <Text style={styles.sectionTitle}>Condition pre-grade</Text>
          <View style={styles.ringWrap}>
            <ScoreRing score={analysis.conditionScore} />
          </View>
          <View style={styles.pillars}>
            <PillarRow
              icon={<Crosshair size={17} color={colors.goldDeep} />}
              label="Centering"
              value={analysis.pillars.centering}
              delayMs={100}
            />
            <PillarRow
              icon={<Square size={17} color={colors.goldDeep} />}
              label="Corners"
              value={analysis.pillars.corners}
              delayMs={200}
            />
            <PillarRow
              icon={<Frame size={17} color={colors.goldDeep} />}
              label="Edges"
              value={analysis.pillars.edges}
              delayMs={300}
            />
            <PillarRow
              icon={<Grip size={17} color={colors.goldDeep} />}
              label="Surface"
              value={analysis.pillars.surface}
              delayMs={400}
            />
          </View>
        </View>

        {analysis.card ? (
          <View style={[styles.sectionCard, shadows.card]}>
            <Text style={styles.sectionTitle}>Market value</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>{formatMoney(price)}</Text>
              <PriceFlag source={analysis.card.priceSource} />
            </View>
            <Text style={styles.priceMeta}>
              {analysis.card.rarity ? `${analysis.card.rarity} · ` : ""}
              {price !== null
                ? "Live market price from the card database."
                : "No live price for this game yet — set one manually after saving."}
            </Text>
          </View>
        ) : null}

        {analysis.notes.length > 0 ? (
          <View style={styles.notes}>
            {analysis.notes.map((note) => (
              <View key={note} style={styles.noteRow}>
                <Info size={14} color={colors.amberDeep} />
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <GoldButton
            testID="result-save"
            label={analysis.savedToCollection ? "Saved to collection" : "Save to collection"}
            onPress={onSave}
            disabled={!analysis.card || analysis.savedToCollection === true}
          />
          {analysis.card ? (
            <GoldButton
              testID="result-watch"
              label={watched ? "On watchlist" : "Add to watchlist"}
              variant="ghost"
              icon={<Star size={16} color={colors.ink} fill={watched ? colors.gold : "transparent"} />}
              onPress={() => {
                if (analysis.card) toggleWatch(analysis.card);
              }}
            />
          ) : null}
          {submitted ? (
            <Pressable
              testID="result-queue-link"
              onPress={() => router.push("/review-queue")}
              style={({ pressed }) => [styles.submittedCard, { opacity: pressed ? 0.85 : 1 }]}
            >
              <ClipboardList size={18} color={colors.successDeep} />
              <Text style={styles.submittedText}>
                In the expert queue — status: Pending. Tap to view.
              </Text>
            </Pressable>
          ) : (
            <GoldButton
              testID="result-expert"
              label={`Submit for Expert Review (1 credit · ${credits} left)`}
              variant="dark"
              onPress={() => setProbeVisible(true)}
            />
          )}
        </View>

        <View style={[styles.labelCard, shadows.card]}>
          <Text style={styles.labelTitle}>Own this card? Help train Verex</Text>
          {analysis.userLabel ? (
            <View style={styles.labelThanksRow}>
              <CheckCircle2 size={16} color={colors.successDeep} />
              <Text style={styles.labelThanks}>
                Logged as {analysis.userLabel === "confirmed_original" ? "Confirmed Original" : "Confirmed Fake"} —
                thanks, this improves future models.
              </Text>
            </View>
          ) : (
            <View style={styles.labelRow}>
              <Pressable
                testID="label-original"
                onPress={() => onLabel("confirmed_original")}
                style={({ pressed }) => [styles.labelButton, styles.labelOriginal, { opacity: pressed ? 0.8 : 1 }]}
              >
                <ShieldCheck size={15} color={colors.successDeep} />
                <Text style={[styles.labelButtonText, { color: colors.successDeep }]}>Confirmed Original</Text>
              </Pressable>
              <Pressable
                testID="label-fake"
                onPress={() => onLabel("confirmed_fake")}
                style={({ pressed }) => [styles.labelButton, styles.labelFake, { opacity: pressed ? 0.8 : 1 }]}
              >
                <ShieldAlert size={15} color={colors.errorDeep} />
                <Text style={[styles.labelButtonText, { color: colors.errorDeep }]}>Confirmed Fake</Text>
              </Pressable>
            </View>
          )}
        </View>

        <DisclaimerNote variant="full" />
      </ScrollView>

      <ProbeSheet
        visible={probeVisible}
        analysis={analysis}
        onClose={() => setProbeVisible(false)}
        onSubmitted={() => {
          setProbeVisible(false);
          setSubmitted(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerAll: {
    alignItems: "center",
    justifyContent: "center",
  },
  darkContainer: {
    flex: 1,
    backgroundColor: colors.charcoal,
    paddingHorizontal: 26,
  },
  analyzeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  analyzePhotoBox: {
    width: 120,
    height: 164,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.5)",
  },
  analyzePhoto: {
    width: "100%",
    height: "100%",
  },
  darkTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.textOnDark,
    textAlign: "center",
  },
  darkBody: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.slateOnDark,
    textAlign: "center",
  },
  stepsCard: {
    alignSelf: "stretch",
    backgroundColor: colors.charcoalRaise,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.charcoalLine,
    padding: 16,
    gap: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepIcon: {
    width: 22,
    alignItems: "center",
  },
  stepPending: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.charcoalLine,
  },
  stepText: {
    flex: 1,
    gap: 1,
  },
  stepLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  stepSub: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.slateOnDark,
  },
  darkHint: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.slateOnDark,
    textAlign: "center",
  },
  retakeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  retakePhotoBox: {
    width: 120,
    height: 164,
    borderRadius: radii.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  retakePhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  retakeDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 15, 20, 0.62)",
  },
  retakeIcon: {
    position: "relative",
  },
  reasonsCard: {
    alignSelf: "stretch",
    backgroundColor: colors.charcoalRaise,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.charcoalLine,
    padding: 16,
    gap: 10,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  reasonText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textOnDark,
  },
  retakeButton: {
    alignSelf: "stretch",
    marginTop: 6,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  identityCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 14,
  },
  identityImageBox: {
    width: 84,
    height: 116,
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.goldFaint,
  },
  identityImage: {
    width: "100%",
    height: "100%",
  },
  identityInfo: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  identityGame: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.goldDeep,
  },
  identityName: {
    fontFamily: fonts.displaySemi,
    fontSize: 21,
    lineHeight: 26,
    color: colors.ink,
  },
  identitySet: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.inkSoft,
  },
  confidenceChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldPale,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  confidenceText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.goldDeep,
  },
  candidatesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: 16,
    gap: 10,
  },
  candidatesTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 19,
    color: colors.ink,
  },
  candidatesSub: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkSoft,
    marginTop: -4,
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: 10,
  },
  candidateImageBox: {
    width: 44,
    height: 60,
    borderRadius: 6,
    backgroundColor: colors.goldFaint,
    overflow: "hidden",
  },
  candidateImage: {
    width: "100%",
    height: "100%",
  },
  candidateInfo: {
    flex: 1,
    gap: 1,
  },
  candidateName: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.ink,
  },
  candidateSet: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.inkSoft,
  },
  candidatePick: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: colors.goldDeep,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 6,
  },
  conditionCard: {
    gap: 12,
  },
  ringWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  pillars: {
    gap: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  priceValue: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
  },
  priceMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
    marginTop: 4,
  },
  notes: {
    gap: 8,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.amberPale,
    borderRadius: radii.md,
    padding: 12,
  },
  noteText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.amberDeep,
  },
  actions: {
    gap: 10,
  },
  submittedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.successPale,
    borderWidth: 1,
    borderColor: "rgba(18, 183, 106, 0.35)",
    borderRadius: radii.md,
    padding: 14,
  },
  submittedText: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.successDeep,
  },
  labelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 14,
    gap: 10,
  },
  labelTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.ink,
  },
  labelRow: {
    flexDirection: "row",
    gap: 8,
  },
  labelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  labelOriginal: {
    backgroundColor: colors.successPale,
    borderColor: "rgba(18, 183, 106, 0.4)",
  },
  labelFake: {
    backgroundColor: colors.errorPale,
    borderColor: "rgba(240, 68, 56, 0.4)",
  },
  labelButtonText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
  },
  labelThanksRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  labelThanks: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.successDeep,
  },
});
