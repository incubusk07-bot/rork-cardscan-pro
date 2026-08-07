import type { GameId } from "@/types/card";

export const SUPABASE_URL: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://uplwlwumsptrbxvoazzi.supabase.co";

export const SUPABASE_ANON_KEY: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwbHdsd3Vtc3B0cmJ4dm9henppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwODQ3MzIsImV4cCI6MjEwMTY2MDczMn0.7C_GT_EAjAunuEBBy2Rq-EmZ1zH2X8VNg00j1SLMC5s";

export const OCR_SPACE_API_KEY: string =
  process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY ?? "K85953072488957";

export const POKEMONTCG_API_KEY: string =
  process.env.EXPO_PUBLIC_POKEMONTCG_API_KEY ?? "24f7e0ed-8b82-47e1-91a0-10ab826c66c5";

export const APITCG_KEY: string =
  process.env.EXPO_PUBLIC_APITCG_KEY ??
  "803ff6439697ac28d5ec180ace539629982d4487f6f8bbb5d64e5c53fc767207";

export const TOOLKIT_URL: string =
  process.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com";

export const TOOLKIT_SECRET: string =
  process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? "";

/** Rork Toolkit vision model used for condition + counterfeit-signal analysis. */
export const VISION_MODEL = "google/gemini-2.5-flash";

export const MATCH_CONFIDENCE_THRESHOLD = 85;
export const FREE_REVIEW_CREDITS = 3;
export const AUTH_PROMPT_AFTER_SCANS = 2;

export const DISCLAIMER =
  "This app provides an automated Pre-Grade Estimate using computer vision, not an official certification. Accuracy depends on photo quality, lighting, and card condition. High-quality counterfeits and proxies (especially MTG) may not be detected by camera-based analysis. This app is NOT affiliated with PSA, Beckett, CGC, or any grading company.";

export const MTG_PROXY_NOTE =
  "High-end proxies may pass visual check — a physical light test is recommended for MTG cards.";

export const ONE_PIECE_NOTE =
  "One Piece uses the generic pipeline — confidence is weighted lower by default.";

/**
 * Deep-link redirect used by Supabase Google OAuth on the standalone
 * Android build. Must be whitelisted in Supabase → Auth → URL
 * Configuration → Redirect URLs. In Expo Go / Rork preview the app
 * automatically falls back to the exp:// development URL instead.
 */
export const GOOGLE_OAUTH_REDIRECT = "com.cardscanner.app://" as const;

/**
 * Android build configuration.
 * SHA fingerprints are required for Supabase Google OAuth on Android.
 * Debug:   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
 * Release: Play Console → Setup → App signing (App signing key certificate)
 */
export const ANDROID_BUILD = {
  applicationId: "com.cardscanner.app",
  oauthRedirect: GOOGLE_OAUTH_REDIRECT,
  debugSha1: "REPLACE_WITH_DEBUG_SHA1_FINGERPRINT",
  debugSha256: "REPLACE_WITH_DEBUG_SHA256_FINGERPRINT",
  releaseSha1: "REPLACE_WITH_RELEASE_SHA1_FINGERPRINT",
  releaseSha256: "REPLACE_WITH_RELEASE_SHA256_FINGERPRINT",
} as const;

export interface GameInfo {
  id: GameId;
  label: string;
  short: string;
}

export const GAMES: GameInfo[] = [
  { id: "pokemon", label: "Pokémon", short: "PKM" },
  { id: "yugioh", label: "Yu-Gi-Oh!", short: "YGO" },
  { id: "onepiece", label: "One Piece", short: "OP" },
  { id: "mtg", label: "Magic: The Gathering", short: "MTG" },
  { id: "nba", label: "NBA", short: "NBA" },
];

export function gameLabel(id: GameId | null | undefined): string {
  const found = GAMES.find((g) => g.id === id);
  return found ? found.label : "Unknown";
}

export interface ProbeQuestion {
  id: string;
  text: string;
}

export const PROBE_QUESTIONS: ProbeQuestion[] = [
  {
    id: "foil",
    text: "When tilted under light, does the surface show the expected foil / holo texture for this card?",
  },
  {
    id: "back",
    text: "Does the card back match an official back exactly (color saturation, borders, logo position)?",
  },
  {
    id: "layers",
    text: "Looking at the card edge, can you see the standard layered core (e.g. a thin dark core line)?",
  },
  {
    id: "feel",
    text: "Do the thickness and stiffness feel identical to other cards from the same set?",
  },
];

export const CONDITION_LABELS: { min: number; label: string }[] = [
  { min: 9.5, label: "Pristine" },
  { min: 9, label: "Near Mint+" },
  { min: 8, label: "Near Mint" },
  { min: 7, label: "Excellent" },
  { min: 6, label: "Very Good" },
  { min: 5, label: "Good" },
  { min: 0, label: "Played" },
];

export function conditionLabel(score: number): string {
  const found = CONDITION_LABELS.find((c) => score >= c.min);
  return found ? found.label : "Played";
}
