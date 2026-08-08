import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/constants/config";

WebBrowser.maybeCompleteAuthSession();

/**
 * Single Supabase client for the whole app.
 * Google sign-in lives in providers/AppProvider.tsx (signInWithGoogle) —
 * it uses GOOGLE_OAUTH_REDIRECT ("verex://callback") on standalone builds
 * and the exp:// dev URL in Expo Go / Rork preview.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
