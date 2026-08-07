import {
  MATCH_CONFIDENCE_THRESHOLD,
  MTG_PROXY_NOTE,
  ONE_PIECE_NOTE,
} from "@/constants/config";
import { resizeForUpload } from "@/lib/resize-for-upload";
import { searchAllGames } from "@/services/cardApis";
import { runOcr } from "@/services/ocr";
import { analyzeCardImage } from "@/services/vision";
import type {
  AuthenticitySignal,
  GameId,
  MatchedCard,
  OcrOutcome,
  PillarScores,
  ScanAnalysis,
  VerdictKind,
  VisionAssessment,
} from "@/types/card";
import { clamp, makeId } from "@/utils/format";
import { nameSimilarity, normalizeText, tokenOverlap } from "@/utils/similarity";

export type PipelineStage = "prepare" | "ocr" | "match" | "condition" | "verdict";

export interface PipelineInput {
  photoUri: string;
}

/** Guess the game from OCR keywords. */
export function guessGame(text: string): GameId | null {
  const t = text.toLowerCase();
  if (/(one piece card game|don!!|op\d{2}-\d{3})/i.test(text)) return "onepiece";
  if (/\batk\s*\/|\bdef\s*\/|atk\/\d|def\/\d|yu-gi-oh/i.test(text)) return "yugioh";
  if (
    /\bhp\b/.test(t) &&
    /(weakness|resistance|retreat|pok[eé]mon|evolves from)/i.test(text)
  )
    return "pokemon";
  if (/(pok[eé]mon)/i.test(text)) return "pokemon";
  if (/(instant|sorcery|creature|planeswalker|enchantment|wizards of the coast|mana)/i.test(text))
    return "mtg";
  if (/(nba|panini|topps|hoops|prizm|donruss)/i.test(text)) return "nba";
  return null;
}

/** Pull the most likely card name from OCR lines. */
export function guessName(lines: string[]): string {
  const cleaned = lines
    .map((l) =>
      l
        .replace(/\b\d+\s*hp\b|\bhp\s*\d+\b/gi, " ")
        .replace(/\b(stage\s*\d|basic|evolves from \w+)\b/gi, " ")
        .replace(/[^A-Za-z0-9'.\- &é]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((l) => l.length >= 3 && /[a-zA-Z]{3,}/.test(l));

  const pool = cleaned.slice(0, 5);
  if (pool.length === 0) return "";
  let best = pool[0];
  let bestScore = 0;
  for (const line of pool) {
    const letters = (line.match(/[a-zA-Z]/g) ?? []).length;
    const wordCount = line.split(" ").length;
    const score = letters - Math.max(0, wordCount - 4) * 3 - Math.max(0, line.length - 26);
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  }
  return best.split(" ").slice(0, 4).join(" ");
}

function extractNumberGuess(text: string): string | null {
  const patterns = [/\b(\d{1,3}\/\d{2,3})\b/, /\b(OP\d{2}-\d{3})\b/i, /\b([A-Z]{2,4}-[A-Z]{0,2}\d{3})\b/];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

interface Ranked {
  card: MatchedCard;
  similarity: number;
}

function rankCandidates(name: string, cards: MatchedCard[]): Ranked[] {
  const seen = new Set<string>();
  const ranked: Ranked[] = [];
  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    ranked.push({ card, similarity: nameSimilarity(name, card.name) });
  }
  ranked.sort((a, b) => b.similarity - a.similarity);
  return ranked.slice(0, 5);
}

function isMostlyUppercase(line: string): boolean {
  const letters = line.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length >= 0.8;
}

function buildSignals(params: {
  card: MatchedCard | null;
  matchConfidence: number;
  textSim: number;
  ocr: OcrOutcome;
  vision: VisionAssessment | null;
}): AuthenticitySignal[] {
  const { card, matchConfidence, textSim, ocr, vision } = params;
  const signals: AuthenticitySignal[] = [];

  signals.push({
    id: "reference_match",
    label: "Reference database match",
    passed: card ? matchConfidence >= MATCH_CONFIDENCE_THRESHOLD : false,
    detail: card
      ? `${matchConfidence}% match to ${card.name}${card.setName ? ` · ${card.setName}` : ""}`
      : "No confident match found",
  });

  if (card) {
    signals.push({
      id: "ocr_crosscheck",
      label: "OCR text cross-check",
      passed: ocr.ok ? textSim >= 0.55 : null,
      detail: ocr.ok
        ? `${Math.round(textSim * 100)}% of card text matches the reference`
        : "Card text could not be read",
    });
  }

  if (vision) {
    signals.push({
      id: "print_sharpness",
      label: "Print sharpness",
      passed: vision.printSharpness >= 6,
      detail: `${vision.printSharpness.toFixed(1)}/10 print clarity`,
    });
    signals.push({
      id: "surface_anomalies",
      label: "Surface anomaly screen",
      passed: vision.authenticityFlags.length === 0,
      detail:
        vision.authenticityFlags.length > 0
          ? vision.authenticityFlags.join(", ")
          : "No suspicious traits detected",
    });
    if (card && (card.game === "pokemon" || card.game === "yugioh")) {
      signals.push({
        id: "holo_variance",
        label: "Holo / foil pattern variance",
        passed: vision.holoVarianceOk,
        detail:
          vision.holoVarianceOk === null
            ? "Not a foil card or not assessable"
            : vision.holoVarianceOk
              ? "Foil pattern consistent with genuine print"
              : "Foil pattern looks inconsistent",
      });
    }
  } else {
    signals.push({
      id: "vision_unavailable",
      label: "AI surface screen",
      passed: null,
      detail: "AI analysis unavailable — reduced signal set",
    });
  }

  if (card && card.game === "yugioh" && ocr.ok) {
    const nameLine = ocr.lines.find((l) => nameSimilarity(card.name, l) >= 0.6);
    signals.push({
      id: "name_case",
      label: "Name letter-case check",
      passed: nameLine ? isMostlyUppercase(nameLine) : null,
      detail: nameLine
        ? isMostlyUppercase(nameLine)
          ? "Name printed in expected uppercase style"
          : "Name casing differs from official print"
        : "Name line not isolated",
    });
  }

  return signals;
}

function computePillars(vision: VisionAssessment | null): PillarScores {
  if (vision) {
    return {
      centering: clamp(vision.centering, 1, 10),
      corners: clamp(vision.corners, 1, 10),
      edges: clamp(vision.edges, 1, 10),
      surface: clamp(vision.surface, 1, 10),
    };
  }
  return { centering: 8, corners: 8, edges: 8, surface: 7.5 };
}

export function overallScore(pillars: PillarScores): number {
  const weighted =
    pillars.centering * 0.2 + pillars.corners * 0.25 + pillars.edges * 0.25 + pillars.surface * 0.3;
  return Math.round(clamp(weighted, 1, 10) * 10) / 10;
}

function decideVerdict(params: {
  card: MatchedCard | null;
  matchConfidence: number;
  textSim: number;
  vision: VisionAssessment | null;
}): VerdictKind {
  const { card, matchConfidence, textSim, vision } = params;
  if (!card || matchConfidence < MATCH_CONFIDENCE_THRESHOLD) return "inconclusive";

  const flags = vision?.authenticityFlags.length ?? 0;
  const holoFail = vision?.holoVarianceOk === false;
  const sharpnessFail = vision !== null && vision.printSharpness < 5;
  const structuralFails = (flags >= 2 ? 1 : 0) + (holoFail ? 1 : 0) + (sharpnessFail ? 1 : 0);

  if (textSim < 0.35 || structuralFails >= 2) return "likely_counterfeit";
  if (textSim >= 0.55 && flags === 0 && !holoFail && !sharpnessFail) return "likely_original";
  return "inconclusive";
}

/**
 * Full zero-credit local pre-check pipeline:
 * resize → OCR (free) → reference match (free APIs) → AI vision condition pass → verdict.
 * Halts with quality.ok=false (no credits, no review capacity) on unreadable frames.
 */
export async function analyzeScan(
  input: PipelineInput,
  onStage: (stage: PipelineStage) => void,
): Promise<ScanAnalysis> {
  onStage("prepare");
  const { base64 } = await resizeForUpload(input.photoUri);

  onStage("ocr");
  const ocr = await runOcr(base64);
  const nameGuess = guessName(ocr.lines);
  const gameHint = guessGame(ocr.text);
  const numberGuess = extractNumberGuess(ocr.text);
  console.log("[pipeline] nameGuess:", nameGuess, "game:", gameHint, "number:", numberGuess);

  onStage("match");
  const found = nameGuess ? await searchAllGames(nameGuess, gameHint) : [];
  const ranked = rankCandidates(nameGuess, found);

  onStage("condition");
  const vision = await analyzeCardImage(base64);

  onStage("verdict");
  const qualityReasons: string[] = [];
  if (vision && !vision.isCard) qualityReasons.push("No trading card was detected in the frame.");
  if (vision?.blurry && ocr.text.length < 12) qualityReasons.push("The photo is too blurry to read.");
  if (vision?.tooDark) qualityReasons.push("Lighting is too low — use even, diffused light.");
  if (vision?.glare && ocr.text.length < 12) qualityReasons.push("Strong glare is covering the print.");
  if (!vision && !ocr.ok) qualityReasons.push("Card text could not be read from this photo.");

  const quality = { ok: qualityReasons.length === 0, reasons: qualityReasons };

  let top: Ranked | null = ranked.length > 0 ? ranked[0] : null;
  let confidence = top ? Math.round(top.similarity * 100) : 0;
  if (top && numberGuess && top.card.number && normalizeText(top.card.number) === normalizeText(numberGuess)) {
    confidence = Math.min(100, confidence + 6);
  }
  if (top && top.card.game === "onepiece") {
    confidence = Math.round(confidence * 0.9);
  }

  const card = top && confidence >= MATCH_CONFIDENCE_THRESHOLD ? top.card : null;
  const reference = card ?? (top ? top.card : null);
  const textSim = reference
    ? Math.max(
        tokenOverlap(reference.name, ocr.text),
        reference.referenceText ? tokenOverlap(ocr.text.slice(0, 200), reference.referenceText) : 0,
      )
    : 0;

  const signals = buildSignals({ card, matchConfidence: confidence, textSim, ocr, vision });
  const pillars = computePillars(vision);
  const verdict = quality.ok
    ? decideVerdict({ card, matchConfidence: confidence, textSim, vision })
    : "inconclusive";

  const notes: string[] = [];
  const effectiveGame = card?.game ?? gameHint;
  if (effectiveGame === "mtg") notes.push(MTG_PROXY_NOTE);
  if (effectiveGame === "onepiece") notes.push(ONE_PIECE_NOTE);
  if (!vision) notes.push("AI condition analysis was unavailable — this estimate uses a reduced signal set.");
  if (vision?.summary) notes.push(vision.summary);

  return {
    id: makeId("scan"),
    createdAt: new Date().toISOString(),
    photoUri: input.photoUri,
    quality,
    ocrText: ocr.text,
    nameGuess,
    matchConfidence: confidence,
    card,
    candidates: ranked.map((r) => r.card).slice(0, 3),
    verdict,
    conditionScore: overallScore(pillars),
    pillars,
    signals,
    notes,
  };
}

/** Re-finalize an analysis after the user picks a candidate (<85% path). */
export function applyChosenCard(analysis: ScanAnalysis, chosen: MatchedCard): ScanAnalysis {
  const textSim = tokenOverlap(chosen.name, analysis.ocrText);
  const signals = analysis.signals.map((s) => {
    if (s.id === "reference_match") {
      return {
        ...s,
        passed: null,
        detail: `Identified by user selection: ${chosen.name}${chosen.setName ? ` · ${chosen.setName}` : ""}`,
      };
    }
    if (s.id === "ocr_crosscheck") {
      return {
        ...s,
        passed: textSim >= 0.55 ? true : textSim >= 0.35 ? null : false,
        detail: `${Math.round(textSim * 100)}% of card text matches the selected reference`,
      };
    }
    return s;
  });
  const notes = analysis.notes.includes("Card identified by user selection — verdict stays cautious.")
    ? analysis.notes
    : [...analysis.notes, "Card identified by user selection — verdict stays cautious."];
  return { ...analysis, card: chosen, signals, notes, verdict: "inconclusive" };
}
