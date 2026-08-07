import { Eye, EyeOff, Lock, Mail, UserPlus, UserRound } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GoogleG from "@/components/GoogleG";
import { colors, fonts, radii } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import { tapHaptic } from "@/utils/haptics";

type Mode = "signin" | "signup";

/**
 * Soft-gate auth bottom sheet (dark + gold). Never blocks the app —
 * "Continue as Guest" is always available.
 */
export default function AuthSheet() {
  const {
    authSheetVisible,
    setAuthSheetVisible,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
  } = useApp();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [googleBusy, setGoogleBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const close = () => {
    setStatus(null);
    setAuthSheetVisible(false);
  };

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !/.+@.+\..+/.test(email.trim())) {
      setStatus({ kind: "error", text: "Enter a valid email address." });
      return;
    }
    if (password.length < 6) {
      setStatus({ kind: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setBusy(true);
    setStatus(null);
    const result =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);
    setBusy(false);
    if (!result.ok) {
      void tapHaptic("error");
      setStatus({ kind: "error", text: result.message });
    } else {
      void tapHaptic("success");
      if (result.message.includes("Verification")) {
        setStatus({ kind: "info", text: result.message });
        setMode("signin");
      }
    }
  };

  const google = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    setStatus(null);
    const result = await signInWithGoogle();
    setGoogleBusy(false);
    if (!result.ok) {
      setStatus({ kind: "error", text: result.message });
    } else {
      void tapHaptic("success");
    }
  };

  return (
    <Modal visible={authSheetVisible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdropWrap}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Dismiss sign in" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.grabber} />

            <View style={styles.toggleRow}>
              <Pressable
                testID="auth-tab-signin"
                onPress={() => {
                  setMode("signin");
                  setStatus(null);
                }}
                style={[styles.toggle, mode === "signin" ? styles.toggleActive : null]}
              >
                <UserRound size={15} color={mode === "signin" ? colors.charcoal : colors.slateOnDark} />
                <Text style={[styles.toggleText, mode === "signin" ? styles.toggleTextActive : null]}>
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                testID="auth-tab-signup"
                onPress={() => {
                  setMode("signup");
                  setStatus(null);
                }}
                style={[styles.toggle, mode === "signup" ? styles.toggleActive : null]}
              >
                <UserPlus size={15} color={mode === "signup" ? colors.charcoal : colors.slateOnDark} />
                <Text style={[styles.toggleText, mode === "signup" ? styles.toggleTextActive : null]}>
                  Create Account
                </Text>
              </Pressable>
            </View>

            <Text style={styles.headline}>
              {mode === "signin"
                ? "Sign in to sync & backup your collection"
                : "Create a free account to protect your vault"}
            </Text>

            <Pressable
              testID="auth-google"
              onPress={google}
              disabled={googleBusy}
              style={({ pressed }) => [styles.googleButton, { opacity: pressed || googleBusy ? 0.85 : 1 }]}
            >
              {googleBusy ? (
                <ActivityIndicator size="small" color={colors.charcoal} />
              ) : (
                <>
                  <GoogleG size={18} />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.inputRow}>
              <Mail size={17} color={colors.slateOnDark} />
              <TextInput
                testID="auth-email"
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.slateOnDark}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.inputRow}>
              <Lock size={17} color={colors.slateOnDark} />
              <TextInput
                testID="auth-password"
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.slateOnDark}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <Pressable hitSlop={8} onPress={() => setShowPassword((v) => !v)}>
                {showPassword ? (
                  <EyeOff size={17} color={colors.slateOnDark} />
                ) : (
                  <Eye size={17} color={colors.slateOnDark} />
                )}
              </Pressable>
            </View>

            {status ? (
              <Text
                style={[
                  styles.status,
                  { color: status.kind === "error" ? colors.error : colors.goldSoftOnDark },
                ]}
              >
                {status.text}
              </Text>
            ) : null}

            <Pressable
              testID="auth-submit"
              onPress={submit}
              disabled={busy}
              style={({ pressed }) => [styles.submit, { opacity: pressed || busy ? 0.85 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.charcoal} />
              ) : (
                <Text style={styles.submitText}>{mode === "signin" ? "Sign In" : "Create Account"}</Text>
              )}
            </Pressable>

            <Pressable testID="auth-guest" onPress={close} hitSlop={8} style={styles.guestButton}>
              <Text style={styles.guestText}>Continue as Guest</Text>
            </Pressable>

            <Text style={styles.legal}>
              Guest mode keeps everything on this device. Signing in backs up your collection and
              grading history. Pre-Grade Estimates only — not official certification.
            </Text>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: "#10151D",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 22,
    paddingTop: 10,
    gap: 12,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.charcoalLine,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.charcoalRaise,
    borderRadius: radii.pill,
    padding: 4,
    gap: 4,
  },
  toggle: {
    flex: 1,
    flexDirection: "row",
    gap: 7,
    height: 42,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: colors.goldOnDark,
  },
  toggleText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.slateOnDark,
  },
  toggleTextActive: {
    color: colors.charcoal,
  },
  headline: {
    fontFamily: fonts.displaySemi,
    fontSize: 21,
    lineHeight: 27,
    color: colors.textOnDark,
    textAlign: "center",
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    height: 52,
    borderRadius: radii.md,
  },
  googleText: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: colors.charcoal,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(212, 175, 55, 0.25)",
  },
  orText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slateOnDark,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.charcoalLine,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: colors.charcoalRaise,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textOnDark,
  },
  status: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
  },
  submit: {
    backgroundColor: colors.goldOnDark,
    height: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.charcoal,
  },
  guestButton: {
    alignSelf: "center",
    paddingVertical: 2,
  },
  guestText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.goldSoftOnDark,
  },
  legal: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.slateOnDark,
    textAlign: "center",
    paddingHorizontal: 6,
  },
});
