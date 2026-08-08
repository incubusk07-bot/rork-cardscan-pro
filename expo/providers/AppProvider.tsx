import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AUTH_PROMPT_AFTER_SCANS,
  FREE_REVIEW_CREDITS,
  GOOGLE_OAUTH_REDIRECT,
  SUPABASE_URL,
} from "@/constants/config";
import { resizeForUpload } from "@/lib/resize-for-upload";
import { supabase } from "@/lib/supabase";
import { refreshCardPrice } from "@/services/cardApis";
import type {
  CollectionItem,
  GameId,
  MatchedCard,
  PortfolioPoint,
  ProbeAnswer,
  ReviewTask,
  ScanAnalysis,
  WatchItem,
} from "@/types/card";
import { base64ToUint8Array } from "@/utils/base64";
import { makeId } from "@/utils/format";

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = "verex.state.v1";

export type SyncState = "local" | "syncing" | "synced" | "error";

export interface AuthResult {
  ok: boolean;
  message: string;
}

interface PersistedState {
  onboarded: boolean;
  scans: ScanAnalysis[];
  scanCount: number;
  collection: CollectionItem[];
  watchlist: WatchItem[];
  reviewTasks: ReviewTask[];
  credits: number;
  portfolioHistory: PortfolioPoint[];
  autoCapture: boolean;
  hapticsEnabled: boolean;
}

function parseAuthParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const collect = (segment: string) => {
    for (const pair of segment.split("&")) {
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const key = decodeURIComponent(pair.slice(0, eq));
      const value = decodeURIComponent(pair.slice(eq + 1));
      out[key] = value;
    }
  };
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  if (queryIndex >= 0) {
    collect(url.slice(queryIndex + 1, hashIndex > queryIndex ? hashIndex : undefined));
  }
  if (hashIndex >= 0) collect(url.slice(hashIndex + 1));
  return out;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [onboarded, setOnboarded] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>(null);
  const [scans, setScans] = useState<ScanAnalysis[]>([]);
  const [scanCount, setScanCount] = useState<number>(0);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>([]);
  const [credits, setCredits] = useState<number>(FREE_REVIEW_CREDITS);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioPoint[]>([]);
  const [autoCapture, setAutoCapture] = useState<boolean>(true);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [pendingScan, setPendingScan] = useState<ScanAnalysis | null>(null);
  const [authSheetVisible, setAuthSheetVisible] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [refreshingPrices, setRefreshingPrices] = useState<boolean>(false);

  const authPromptShownRef = useRef<boolean>(false);
  const migratedForUserRef = useRef<string | null>(null);

  // ---------- hydration ----------
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const state = JSON.parse(raw) as Partial<PersistedState>;
          setOnboarded(state.onboarded === true);
          setScans(Array.isArray(state.scans) ? state.scans : []);
          setScanCount(typeof state.scanCount === "number" ? state.scanCount : 0);
          setCollection(Array.isArray(state.collection) ? state.collection : []);
          setWatchlist(Array.isArray(state.watchlist) ? state.watchlist : []);
          setReviewTasks(Array.isArray(state.reviewTasks) ? state.reviewTasks : []);
          setCredits(typeof state.credits === "number" ? state.credits : FREE_REVIEW_CREDITS);
          setPortfolioHistory(Array.isArray(state.portfolioHistory) ? state.portfolioHistory : []);
          setAutoCapture(state.autoCapture !== false);
          setHapticsEnabled(state.hapticsEnabled !== false);
        }
      } catch (e) {
        console.log("[app] hydrate failed", e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // ---------- persistence ----------
  useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = {
      onboarded,
      scans,
      scanCount,
      collection,
      watchlist,
      reviewTasks,
      credits,
      portfolioHistory,
      autoCapture,
      hapticsEnabled,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.log("[app] persist failed", e),
    );
  }, [
    hydrated,
    onboarded,
    scans,
    scanCount,
    collection,
    watchlist,
    reviewTasks,
    credits,
    portfolioHistory,
    autoCapture,
    hapticsEnabled,
  ]);

  // ---------- auth session ----------
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((e) => console.log("[auth] getSession failed", e));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // ---------- supabase helpers ----------
  const uploadScanPhoto = useCallback(
    async (userId: string, recordId: string, photoUri: string): Promise<string | null> => {
      try {
        const { base64 } = await resizeForUpload(photoUri, 1_500_000);
        const bytes = base64ToUint8Array(base64);
        const path = `${userId}/${recordId}.jpg`;
        const { error } = await supabase.storage
          .from("scans")
          .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
        if (error) {
          console.log("[storage] upload failed", error.message);
          return null;
        }
        return path;
      } catch (e) {
        console.log("[storage] upload error", e);
        return null;
      }
    },
    [],
  );

  const syncGradingRecord = useCallback(
    async (analysis: ScanAnalysis, userId: string) => {
      try {
        const imagePath = await uploadScanPhoto(userId, analysis.id, analysis.photoUri);
        const { error } = await supabase.from("grading_records").upsert({
          id: analysis.id,
          user_id: userId,
          created_at: analysis.createdAt,
          game: analysis.card?.game ?? null,
          card_id: analysis.card?.id ?? null,
          card_name: analysis.card?.name ?? analysis.nameGuess,
          set_name: analysis.card?.setName ?? null,
          card_number: analysis.card?.number ?? null,
          image_path: imagePath,
          verdict: analysis.verdict,
          condition_score: analysis.conditionScore,
          match_confidence: analysis.matchConfidence,
          pillars: analysis.pillars,
          signals: analysis.signals,
          notes: analysis.notes,
          market_price: analysis.card?.marketPrice ?? null,
          price_source: analysis.card?.priceSource ?? null,
        });
        if (error) console.log("[sync] grading record failed", error.message);
      } catch (e) {
        console.log("[sync] grading record error", e);
      }
    },
    [uploadScanPhoto],
  );

  // ---------- guest → account migration ----------
  const migrateGuestData = useCallback(
    async (userId: string) => {
      setSyncState("syncing");
      try {
        if (collection.length > 0) {
          const rows = collection.map((item) => ({
            id: item.id,
            user_id: userId,
            added_at: item.addedAt,
            game: item.card.game,
            card_id: item.card.id,
            card_name: item.card.name,
            set_name: item.card.setName ?? null,
            card_number: item.card.number ?? null,
            rarity: item.card.rarity ?? null,
            image_url: item.card.imageUrl ?? null,
            condition_score: item.conditionScore,
            verdict: item.verdict,
            market_price: item.card.marketPrice,
            manual_price: item.manualPrice,
            price_source: item.card.priceSource,
            price_history: item.priceHistory,
          }));
          const { error } = await supabase.from("collection_items").upsert(rows, { onConflict: "id" });
          if (error) throw new Error(error.message);
        }
        if (watchlist.length > 0) {
          const rows = watchlist.map((w) => ({
            id: w.id,
            user_id: userId,
            added_at: w.addedAt,
            game: w.card.game,
            card_id: w.card.id,
            card_name: w.card.name,
            set_name: w.card.setName ?? null,
            image_url: w.card.imageUrl ?? null,
            market_price: w.card.marketPrice,
          }));
          const { error } = await supabase.from("watchlist_items").upsert(rows, { onConflict: "id" });
          if (error) console.log("[sync] watchlist failed", error.message);
        }
        for (const scan of scans.slice(0, 10)) {
          await syncGradingRecord(scan, userId);
        }
        if (reviewTasks.length > 0) {
          const rows = reviewTasks.map((t) => ({
            id: t.id,
            user_id: userId,
            created_at: t.createdAt,
            card_name: t.cardName,
            game: t.game,
            status: t.status,
            probe_answers: t.probeAnswers,
            auto_verdict: t.verdict,
            auto_condition_score: t.conditionScore,
          }));
          const { error } = await supabase.from("review_queue").upsert(rows, { onConflict: "id" });
          if (error) console.log("[sync] review queue failed", error.message);
        }
        setCollection((prev) => prev.map((i) => ({ ...i, synced: true })));
        setScans((prev) => prev.map((s) => ({ ...s, synced: true })));
        setSyncState("synced");
        console.log("[sync] guest data migrated");
      } catch (e) {
        console.log("[sync] migration failed", e);
        setSyncState("error");
      }
    },
    [collection, watchlist, scans, reviewTasks, syncGradingRecord],
  );

  useEffect(() => {
    const userId = session?.user?.id;
    if (!hydrated || !userId) return;
    if (migratedForUserRef.current === userId) return;
    migratedForUserRef.current = userId;
    void migrateGuestData(userId);
  }, [session, hydrated, migrateGuestData]);

  // ---------- scans ----------
  const registerScan = useCallback(
    (analysis: ScanAnalysis) => {
      setScans((prev) => [analysis, ...prev.filter((s) => s.id !== analysis.id)].slice(0, 25));
      setScanCount((c) => c + 1);
      const userId = session?.user?.id;
      if (userId && analysis.quality.ok) {
        void syncGradingRecord(analysis, userId);
      }
    },
    [session, syncGradingRecord],
  );

  const updateScan = useCallback((updated: ScanAnalysis) => {
    setScans((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setPendingScan((prev) => (prev && prev.id === updated.id ? updated : prev));
  }, []);

  const labelScan = useCallback(
    (scanId: string, label: "confirmed_original" | "confirmed_fake") => {
      const source: ScanAnalysis | null = scans.find((s) => s.id === scanId) ?? null;
      setScans((prev) => prev.map((s) => (s.id === scanId ? { ...s, userLabel: label } : s)));
      setPendingScan((prev) => (prev && prev.id === scanId ? { ...prev, userLabel: label } : prev));
      const userId = session?.user?.id;
      if (userId) {
        (async () => {
          try {
            const { error } = await supabase.from("labeled_training_scans").upsert({
              id: `label_${scanId}`,
              user_id: userId,
              label,
              game: source?.card?.game ?? null,
              card_name: source?.card?.name ?? source?.nameGuess ?? null,
              traits: {
                pillars: source?.pillars ?? {},
                signals: source?.signals ?? [],
                verdict: source?.verdict ?? null,
                matchConfidence: source?.matchConfidence ?? null,
              },
            });
            if (error) console.log("[label] sync failed", error.message);
          } catch (e) {
            console.log("[label] sync error", e);
          }
        })();
      }
    },
    [session, scans],
  );

  // ---------- auth prompt (soft-gate, never blocks) ----------
  const maybePromptAuth = useCallback(
    (trigger: "scan" | "collection") => {
      if (session || authPromptShownRef.current) return;
      const shouldShow =
        trigger === "scan"
          ? scanCount >= AUTH_PROMPT_AFTER_SCANS
          : collection.length > 0 || scanCount > 0;
      if (shouldShow) {
        authPromptShownRef.current = true;
        setAuthSheetVisible(true);
      }
    },
    [session, scanCount, collection.length],
  );

  // ---------- collection ----------
  const saveToCollection = useCallback(
    (analysis: ScanAnalysis): boolean => {
      if (!analysis.card) return false;
      const card = analysis.card;
      const now = new Date().toISOString();
      const item: CollectionItem = {
        id: makeId("col"),
        addedAt: now,
        card,
        conditionScore: analysis.conditionScore,
        verdict: analysis.verdict,
        photoUri: analysis.photoUri,
        manualPrice: null,
        priceHistory: card.marketPrice !== null ? [{ date: now, price: card.marketPrice }] : [],
        synced: false,
      };
      setCollection((prev) => [item, ...prev]);
      const updatedScan: ScanAnalysis = { ...analysis, savedToCollection: true };
      updateScan(updatedScan);
      const userId = session?.user?.id;
      if (userId) {
        (async () => {
          try {
            const { error } = await supabase.from("collection_items").upsert({
              id: item.id,
              user_id: userId,
              added_at: item.addedAt,
              game: card.game,
              card_id: card.id,
              card_name: card.name,
              set_name: card.setName ?? null,
              card_number: card.number ?? null,
              rarity: card.rarity ?? null,
              image_url: card.imageUrl ?? null,
              condition_score: item.conditionScore,
              verdict: item.verdict,
              market_price: card.marketPrice,
              manual_price: null,
              price_source: card.priceSource,
              price_history: item.priceHistory,
            });
            if (error) console.log("[collection] sync failed", error.message);
          } catch (e) {
            console.log("[collection] sync error", e);
          }
        })();
      }
      return true;
    },
    [session, updateScan],
  );

  const addManualCard = useCallback(
    (input: { name: string; setName?: string; price: number | null; game: GameId }) => {
      const now = new Date().toISOString();
      const card: MatchedCard = {
        id: makeId("manual"),
        game: input.game,
        name: input.name,
        setName: input.setName,
        marketPrice: input.price,
        priceSource: "manual",
      };
      const item: CollectionItem = {
        id: makeId("col"),
        addedAt: now,
        card,
        conditionScore: null,
        verdict: null,
        manualPrice: input.price,
        priceHistory: input.price !== null ? [{ date: now, price: input.price }] : [],
        synced: false,
      };
      setCollection((prev) => [item, ...prev]);
    },
    [],
  );

  const removeFromCollection = useCallback(
    (id: string) => {
      setCollection((prev) => prev.filter((i) => i.id !== id));
      const userId = session?.user?.id;
      if (userId) {
        supabase
          .from("collection_items")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.log("[collection] delete sync failed", error.message);
          });
      }
    },
    [session],
  );

  const setManualPrice = useCallback((id: string, price: number | null) => {
    const now = new Date().toISOString();
    setCollection((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const history =
          price !== null ? [...item.priceHistory, { date: now, price }].slice(-90) : item.priceHistory;
        return {
          ...item,
          manualPrice: price,
          card: { ...item.card, priceSource: price !== null ? "manual" : item.card.priceSource },
          priceHistory: history,
        };
      }),
    );
  }, []);

  // ---------- watchlist ----------
  const isWatched = useCallback(
    (cardId: string) => watchlist.some((w) => w.card.id === cardId),
    [watchlist],
  );

  const toggleWatch = useCallback(
    (card: MatchedCard) => {
      setWatchlist((prev) => {
        const existing = prev.find((w) => w.card.id === card.id);
        if (existing) return prev.filter((w) => w.card.id !== card.id);
        const item: WatchItem = { id: makeId("watch"), addedAt: new Date().toISOString(), card };
        return [item, ...prev];
      });
    },
    [],
  );

  // ---------- expert review ----------
  const submitForReview = useCallback(
    (analysis: ScanAnalysis, answers: ProbeAnswer[]): boolean => {
      if (credits <= 0) return false;
      const task: ReviewTask = {
        id: makeId("review"),
        createdAt: new Date().toISOString(),
        cardName: analysis.card?.name ?? analysis.nameGuess ?? "Unknown card",
        game: analysis.card?.game ?? null,
        photoUri: analysis.photoUri,
        status: "pending",
        probeAnswers: answers,
        verdict: analysis.verdict,
        conditionScore: analysis.conditionScore,
      };
      setReviewTasks((prev) => [task, ...prev]);
      setCredits((c) => Math.max(0, c - 1));
      const userId = session?.user?.id;
      if (userId) {
        (async () => {
          try {
            const imagePath = await uploadScanPhoto(userId, task.id, analysis.photoUri);
            const { error } = await supabase.from("review_queue").upsert({
              id: task.id,
              user_id: userId,
              created_at: task.createdAt,
              card_name: task.cardName,
              game: task.game,
              image_path: imagePath,
              status: task.status,
              probe_answers: task.probeAnswers,
              auto_verdict: task.verdict,
              auto_condition_score: task.conditionScore,
            });
            if (error) console.log("[review] sync failed", error.message);
          } catch (e) {
            console.log("[review] sync error", e);
          }
        })();
      }
      return true;
    },
    [credits, session, uploadScanPhoto],
  );

  // ---------- pricing ----------
  const portfolioValue = useMemo(() => {
    return collection.reduce((sum, item) => {
      const value = item.manualPrice ?? item.card.marketPrice ?? 0;
      return sum + value;
    }, 0);
  }, [collection]);

  useEffect(() => {
    if (!hydrated) return;
    const total = Math.round(portfolioValue * 100) / 100;
    setPortfolioHistory((prev) => {
      const last = prev.length > 0 ? prev[prev.length - 1] : null;
      if (last && Math.abs(last.total - total) < 0.01) return prev;
      return [...prev, { date: new Date().toISOString(), total }].slice(-120);
    });
  }, [portfolioValue, hydrated]);

  const refreshPrices = useCallback(async () => {
    if (refreshingPrices || collection.length === 0) return;
    setRefreshingPrices(true);
    try {
      const now = new Date().toISOString();
      const updated = await Promise.all(
        collection.map(async (item) => {
          if (item.card.priceSource === "manual" || item.card.game === "nba") return item;
          const price = await refreshCardPrice(item.card);
          if (price === null || price === item.card.marketPrice) return item;
          return {
            ...item,
            card: { ...item.card, marketPrice: price, priceSource: "api" as const },
            priceHistory: [...item.priceHistory, { date: now, price }].slice(-90),
          };
        }),
      );
      setCollection(updated);
    } catch (e) {
      console.log("[prices] refresh failed", e);
    } finally {
      setRefreshingPrices(false);
    }
  }, [collection, refreshingPrices]);

  // ---------- auth actions ----------
  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) return { ok: false, message: error.message };
        setAuthSheetVisible(false);
        return { ok: true, message: "Signed in" };
      } catch (e) {
        console.log("[auth] sign-in failed", e);
        return { ok: false, message: "Could not reach the sign-in service. Try again." };
      }
    },
    [],
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) return { ok: false, message: error.message };
        if (!data.session) {
          return {
            ok: true,
            message: "Verification email sent — check your inbox, then sign in.",
          };
        }
        setAuthSheetVisible(false);
        return { ok: true, message: "Account created" };
      } catch (e) {
        console.log("[auth] sign-up failed", e);
        return { ok: false, message: "Could not reach the sign-up service. Try again." };
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      // Standalone APK: verex://callback — Expo Go preview: exp:// dev URL.
      const redirectTo = makeRedirectUri({ native: GOOGLE_OAUTH_REDIRECT });
      console.log("[auth] google redirect uri:", redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        return {
          ok: false,
          message:
            "Google sign-in isn't configured for this build yet. Enable the Google provider in Supabase (with your SHA-1 fingerprints), or use email & password.",
        };
      }
      // Preflight the authorize URL so a misconfigured Supabase Google provider
      // shows a friendly in-app message instead of a raw JSON error page.
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const probe = await fetch(data.url, { signal: controller.signal });
        clearTimeout(timer);
        if (!probe.ok) {
          let detail = "";
          try {
            const body = (await probe.json()) as { msg?: string; error_description?: string };
            detail = body.msg ?? body.error_description ?? "";
          } catch (parseError) {
            console.log("[auth] google preflight parse", parseError);
          }
          console.log("[auth] google preflight failed:", probe.status, detail);
          return {
            ok: false,
            message: `Google sign-in isn't finished in Supabase (${detail || `HTTP ${probe.status}`}). In Supabase \u2192 Auth \u2192 Providers \u2192 Google, paste a Google Cloud \u201cWeb application\u201d OAuth Client ID & Secret whose redirect URI is ${SUPABASE_URL}/auth/v1/callback. Email & password works meanwhile.`,
          };
        }
      } catch (probeError) {
        console.log("[auth] google preflight skipped:", probeError);
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success" || !result.url) {
        return { ok: false, message: "Google sign-in was cancelled." };
      }
      const params = parseAuthParams(result.url);
      if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeError) return { ok: false, message: exchangeError.message };
        setAuthSheetVisible(false);
        return { ok: true, message: "Signed in with Google" };
      }
      if (params.access_token && params.refresh_token) {
        const { error: setError } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (setError) return { ok: false, message: setError.message };
        setAuthSheetVisible(false);
        return { ok: true, message: "Signed in with Google" };
      }
      return { ok: false, message: "Google sign-in did not return a session." };
    } catch (e) {
      console.log("[auth] google failed", e);
      return { ok: false, message: "Google sign-in failed. Use email & password instead." };
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log("[auth] sign-out failed", e);
    }
    migratedForUserRef.current = null;
    setSyncState("local");
  }, []);

  // ---------- misc ----------
  const completeOnboarding = useCallback(() => setOnboarded(true), []);

  const clearLocalData = useCallback(() => {
    setScans([]);
    setScanCount(0);
    setCollection([]);
    setWatchlist([]);
    setReviewTasks([]);
    setCredits(FREE_REVIEW_CREDITS);
    setPortfolioHistory([]);
    setPendingScan(null);
  }, []);

  return {
    hydrated,
    onboarded,
    completeOnboarding,
    session,
    syncState,
    scans,
    scanCount,
    registerScan,
    updateScan,
    labelScan,
    pendingScan,
    setPendingScan,
    collection,
    saveToCollection,
    addManualCard,
    removeFromCollection,
    setManualPrice,
    watchlist,
    isWatched,
    toggleWatch,
    reviewTasks,
    credits,
    submitForReview,
    portfolioValue,
    portfolioHistory,
    refreshPrices,
    refreshingPrices,
    authSheetVisible,
    setAuthSheetVisible,
    maybePromptAuth,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOutUser,
    autoCapture,
    setAutoCapture,
    hapticsEnabled,
    setHapticsEnabled,
    clearLocalData,
  };
});
