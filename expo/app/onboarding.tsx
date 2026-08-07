import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Gauge, Layers, ScanLine, ShieldCheck } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import GoldButton from "@/components/GoldButton";
import { colors, fonts, radii } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";
import { tapHaptic } from "@/utils/haptics";

interface Slide {
  key: string;
  icon: "mark" | "shield" | "gauge" | "vault";
  title: string;
  body: string;
  caption?: string;
}

const SLIDES: Slide[] = [
  {
    key: "scan",
    icon: "mark",
    title: "Scan any card.",
    body: "Pokémon, Yu-Gi-Oh!, One Piece, MTG and NBA. Align the card, hold steady — auto-capture does the rest.",
  },
  {
    key: "authenticity",
    icon: "shield",
    title: "Authenticity signals.",
    body: "Reference database match, card-text cross-check and an AI surface screen flag the traits counterfeits get wrong.",
    caption: "Pre-Grade Estimates only — not official certification.",
  },
  {
    key: "condition",
    icon: "gauge",
    title: "Condition, pre-graded.",
    body: "Corners, edges, surface and centering — each scored 1–10 with an overall estimate before you buy, sell or grade.",
  },
  {
    key: "vault",
    icon: "vault",
    title: "Your vault & watchlist.",
    body: "Track portfolio value with live prices. Start as a guest — sign in later to back everything up.",
  },
];

function SlideArt({ icon }: { icon: Slide["icon"] }) {
  if (icon === "mark") {
    return (
      <View style={styles.artFrame}>
        <View style={[styles.artCorner, styles.artTL]} />
        <View style={[styles.artCorner, styles.artTR]} />
        <View style={[styles.artCorner, styles.artBL]} />
        <View style={[styles.artCorner, styles.artBR]} />
        <Image
          source={require("@/assets/images/brand/mark.png")}
          style={styles.artMark}
          contentFit="contain"
        />
      </View>
    );
  }
  const IconComponent = icon === "shield" ? ShieldCheck : icon === "gauge" ? Gauge : Layers;
  return (
    <View style={styles.artCircle}>
      <IconComponent size={64} color={colors.goldOnDark} strokeWidth={1.4} />
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { completeOnboarding } = useApp();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState<number>(0);

  const finish = () => {
    void tapHaptic("success");
    completeOnboarding();
    router.replace("/");
  };

  const next = () => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    void tapHaptic("select");
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Image
          source={require("@/assets/images/brand/wordmark.png")}
          style={styles.wordmark}
          contentFit="contain"
        />
        <Pressable testID="onboarding-skip" hitSlop={10} onPress={finish}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(newIndex);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <SlideArt icon={item.icon} />
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideBody}>{item.body}</Text>
            {item.caption ? <Text style={styles.slideCaption}>{item.caption}</Text> : null}
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index ? styles.dotActive : null]} />
          ))}
        </View>
        <GoldButton
          testID="onboarding-next"
          label={index >= SLIDES.length - 1 ? "Start scanning" : "Next"}
          onPress={next}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.charcoal,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  wordmark: {
    width: 108,
    height: 18,
  },
  skip: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.slateOnDark,
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 18,
  },
  artFrame: {
    width: 190,
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  artCorner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: colors.goldOnDark,
  },
  artTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  artTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  artBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  artBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  artMark: {
    width: 120,
    height: 120,
    borderRadius: 26,
  },
  artCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.charcoalRaise,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  slideTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textOnDark,
    textAlign: "center",
  },
  slideBody: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 23,
    color: colors.slateOnDark,
    textAlign: "center",
  },
  slideCaption: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: colors.goldSoftOnDark,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 22,
    gap: 18,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.charcoalLine,
  },
  dotActive: {
    backgroundColor: colors.goldOnDark,
    width: 22,
  },
});
