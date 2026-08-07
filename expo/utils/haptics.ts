import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type HapticKind = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "select";

/** Fire a haptic safely (no-op on web, never throws). */
export async function tapHaptic(kind: HapticKind = "light"): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    switch (kind) {
      case "light":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case "select":
        await Haptics.selectionAsync();
        break;
    }
  } catch (e) {
    console.log("[haptics] failed", e);
  }
}
