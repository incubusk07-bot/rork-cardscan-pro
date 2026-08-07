import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { ImageIcon, Timer, TimerOff, Zap, ZapOff } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BrandHeader from "@/components/BrandHeader";
import GoldButton from "@/components/GoldButton";
import { colors, fonts, radii } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import { tapHaptic } from "@/utils/haptics";

const AUTO_CAPTURE_MS = 3000;

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { autoCapture, setAutoCapture } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [torch, setTorch] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [focused, setFocused] = useState<boolean>(false);
  const [capturing, setCapturing] = useState<boolean>(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;

  const frameWidth = Math.min(width - 72, 320);
  const frameHeight = frameWidth / 0.72;

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setStatusBarStyle("light");
      return () => {
        setFocused(false);
        setStatusBarStyle("dark");
      };
    }, []),
  );

  // Scanline sweep animation
  useEffect(() => {
    if (!focused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanlineAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanlineAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [focused, scanlineAnim]);

  const goToResult = useCallback(
    (photoUri: string) => {
      router.push({ pathname: "/scan-result", params: { photoUri } });
    },
    [router],
  );

  const capture = useCallback(async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    void tapHaptic("medium");
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        goToResult(photo.uri);
      }
    } catch (e) {
      console.log("[scan] capture failed", e);
    } finally {
      setCapturing(false);
      progressAnim.setValue(0);
    }
  }, [capturing, goToResult, progressAnim]);

  // Auto-capture countdown
  useEffect(() => {
    if (!focused || !cameraReady || !autoCapture || capturing || !permission?.granted) {
      progressAnim.setValue(0);
      return;
    }
    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: AUTO_CAPTURE_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) {
        void capture();
      }
    });
    return () => animation.stop();
  }, [focused, cameraReady, autoCapture, capturing, permission?.granted, capture, progressAnim]);

  const pickFromGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });
      const uri = result.assets?.[0]?.uri;
      if (!result.canceled && uri) {
        goToResult(uri);
      }
    } catch (e) {
      console.log("[scan] gallery failed", e);
    }
  }, [goToResult]);

  if (!permission) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <ActivityIndicator color={colors.goldOnDark} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <BrandHeader dark showMenu />
        <View style={styles.permissionWrap}>
          <Image
            source={require("@/assets/images/brand/mark.png")}
            style={styles.permissionMark}
            contentFit="contain"
          />
          <Text style={styles.permissionTitle}>The lab needs your camera</Text>
          <Text style={styles.permissionBody}>
            Verex inspects cards through the camera — authenticity signals and a condition
            pre-grade, all in one pass. Photos stay on this device unless you sign in.
          </Text>
          <GoldButton
            testID="scan-grant"
            label="Allow camera access"
            onPress={() => {
              void requestPermission();
            }}
            style={styles.permissionButton}
          />
          <Pressable onPress={pickFromGallery} hitSlop={8}>
            <Text style={styles.permissionAlt}>Or pre-grade from a gallery photo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const scanlineTravel = frameHeight - 24;

  return (
    <View style={styles.container}>
      <BrandHeader
        dark
        showMenu
        right={
          <Pressable
            testID="scan-auto-toggle"
            hitSlop={10}
            onPress={() => {
              void tapHaptic("select");
              setAutoCapture(!autoCapture);
            }}
            style={styles.headerButton}
          >
            {autoCapture ? (
              <Timer size={21} color={colors.goldOnDark} />
            ) : (
              <TimerOff size={21} color={colors.slateOnDark} />
            )}
          </Pressable>
        }
      />

      <View style={styles.cameraWrap}>
        {focused ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            onCameraReady={() => setCameraReady(true)}
          />
        ) : null}

        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.statusText}>
            {capturing
              ? "Hold steady…"
              : autoCapture
                ? "Align the card — auto-capture armed"
                : "Align the card within the frame"}
          </Text>

          <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Animated.View
              style={[
                styles.scanline,
                {
                  transform: [
                    {
                      translateY: scanlineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, scanlineTravel],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>

          {autoCapture ? (
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
          ) : (
            <View style={styles.progressSpacer} />
          )}

          <Text style={styles.tipText}>
            Even light · no glare · fill the frame
          </Text>
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom > 0 ? 8 : 14 }]}>
        <Pressable
          testID="scan-gallery"
          onPress={pickFromGallery}
          style={({ pressed }) => [styles.sideButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ImageIcon size={22} color={colors.textOnDark} />
          <Text style={styles.sideLabel}>Gallery</Text>
        </Pressable>

        <Pressable
          testID="scan-shutter"
          accessibilityLabel="Capture card"
          onPress={capture}
          disabled={capturing}
          style={({ pressed }) => [
            styles.shutterOuter,
            { transform: [{ scale: pressed ? 0.94 : 1 }], opacity: capturing ? 0.6 : 1 },
          ]}
        >
          <View style={styles.shutterInner}>
            {capturing ? <ActivityIndicator color={colors.charcoal} /> : null}
          </View>
        </Pressable>

        <Pressable
          testID="scan-torch"
          onPress={() => {
            void tapHaptic("select");
            setTorch((t) => !t);
          }}
          style={({ pressed }) => [styles.sideButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          {torch ? (
            <Zap size={22} color={colors.goldOnDark} />
          ) : (
            <ZapOff size={22} color={colors.textOnDark} />
          )}
          <Text style={styles.sideLabel}>Torch</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.charcoal,
  },
  centerAll: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    gap: 12,
  },
  permissionMark: {
    width: 92,
    height: 92,
    marginBottom: 8,
    borderRadius: 20,
  },
  permissionTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.textOnDark,
    textAlign: "center",
  },
  permissionBody: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.slateOnDark,
    textAlign: "center",
  },
  permissionButton: {
    alignSelf: "stretch",
    marginTop: 10,
  },
  permissionAlt: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.goldSoftOnDark,
    paddingVertical: 6,
  },
  cameraWrap: {
    flex: 1,
    margin: 16,
    marginTop: 8,
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: "#06080B",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: "rgba(6, 8, 11, 0.18)",
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.textOnDark,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 6,
  },
  frame: {
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: colors.goldOnDark,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 14,
  },
  scanline: {
    position: "absolute",
    top: 12,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: colors.goldOnDark,
    opacity: 0.75,
    borderRadius: 1,
    shadowColor: colors.goldOnDark,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  progressTrack: {
    width: 180,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(212, 175, 55, 0.22)",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.goldOnDark,
    borderRadius: 2,
  },
  progressSpacer: {
    height: 4,
  },
  tipText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.slateOnDark,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingTop: 6,
  },
  sideButton: {
    alignItems: "center",
    gap: 4,
    width: 72,
  },
  sideLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.slateOnDark,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3.5,
    borderColor: colors.goldOnDark,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.goldOnDark,
    alignItems: "center",
    justifyContent: "center",
  },
});
