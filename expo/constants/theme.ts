import { Platform, TextStyle, ViewStyle } from "react-native";

/**
 * Verex design system — "Vault" theme.
 * Psychology: warm porcelain white = clarity & trust (lab), charcoal + gold = value,
 * authority and authenticity (vault / auction house). Gold is reserved for brand
 * moments and primary actions so it never loses its power.
 */
export const colors = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  surfaceAlt: "#FDFCF9",
  ink: "#17140E",
  inkSoft: "#5F594E",
  inkFaint: "#8B8577",
  hairline: "#E9E4D8",
  hairlineStrong: "#DDD6C6",

  gold: "#C9A13B",
  goldDeep: "#8A6D1A",
  goldPale: "#F5EDD8",
  goldFaint: "#FAF5E8",

  charcoal: "#0B0F14",
  charcoalRaise: "#141A23",
  charcoalLine: "#242C38",
  goldOnDark: "#D4AF37",
  goldSoftOnDark: "#E9CF83",
  textOnDark: "#F4F1E8",
  slateOnDark: "#96A0B0",

  success: "#12B76A",
  successDeep: "#0E7C4A",
  successPale: "#E8F7EF",
  error: "#F04438",
  errorDeep: "#B42318",
  errorPale: "#FDECEA",
  amber: "#F59E0B",
  amberDeep: "#92600A",
  amberPale: "#FCF1DC",

  overlay: "rgba(11, 15, 20, 0.55)",
} as const;

export const fonts = {
  display: "Fraunces_700Bold",
  displaySemi: "Fraunces_600SemiBold",
  displayBlack: "Fraunces_900Black",
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
} as const;

export const type = {
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    color: colors.ink,
  } as TextStyle,
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
  } as TextStyle,
  h3: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 23,
    color: colors.ink,
  } as TextStyle,
  body: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  } as TextStyle,
  caption: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
  } as TextStyle,
  micro: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.inkFaint,
  } as TextStyle,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const shadows = {
  card: Platform.select<ViewStyle>({
    android: { elevation: 2 },
    default: {
      shadowColor: "#16130C",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
  }) as ViewStyle,
  raised: Platform.select<ViewStyle>({
    android: { elevation: 6 },
    default: {
      shadowColor: "#16130C",
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
  }) as ViewStyle,
} as const;
