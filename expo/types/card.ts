export type GameId = "pokemon" | "yugioh" | "onepiece" | "mtg" | "nba";

export type PriceSource = "api" | "community" | "manual";

export interface MatchedCard {
  id: string;
  game: GameId;
  name: string;
  setName?: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  referenceText?: string;
  marketPrice: number | null;
  priceSource: PriceSource;
}

export interface PillarScores {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
}

export type VerdictKind = "likely_original" | "likely_counterfeit" | "inconclusive";

export interface AuthenticitySignal {
  id: string;
  label: string;
  passed: boolean | null;
  detail?: string;
}

export interface QualityGate {
  ok: boolean;
  reasons: string[];
}

export interface ScanAnalysis {
  id: string;
  createdAt: string;
  photoUri: string;
  quality: QualityGate;
  ocrText: string;
  nameGuess: string;
  matchConfidence: number;
  card: MatchedCard | null;
  candidates: MatchedCard[];
  verdict: VerdictKind;
  conditionScore: number;
  pillars: PillarScores;
  signals: AuthenticitySignal[];
  notes: string[];
  userLabel?: "confirmed_original" | "confirmed_fake";
  savedToCollection?: boolean;
  synced?: boolean;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface CollectionItem {
  id: string;
  addedAt: string;
  card: MatchedCard;
  conditionScore: number | null;
  verdict: VerdictKind | null;
  photoUri?: string;
  manualPrice: number | null;
  priceHistory: PricePoint[];
  synced?: boolean;
}

export interface WatchItem {
  id: string;
  addedAt: string;
  card: MatchedCard;
}

export type ReviewStatus = "pending" | "in_review" | "completed";

export interface ProbeAnswer {
  questionId: string;
  question: string;
  answer: boolean;
}

export interface ReviewTask {
  id: string;
  createdAt: string;
  cardName: string;
  game: GameId | null;
  photoUri?: string;
  status: ReviewStatus;
  probeAnswers: ProbeAnswer[];
  verdict: VerdictKind;
  conditionScore: number;
}

export interface PortfolioPoint {
  date: string;
  total: number;
}

export interface VisionAssessment {
  isCard: boolean;
  blurry: boolean;
  glare: boolean;
  tooDark: boolean;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printSharpness: number;
  holoVarianceOk: boolean | null;
  authenticityFlags: string[];
  summary: string;
}

export interface OcrOutcome {
  text: string;
  lines: string[];
  ok: boolean;
}
