import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { WifiOff, RefreshCw, Server } from "lucide-react-native";
import { colors } from "@/lib/theme";

export type BannerVariant = "error" | "waking";

// Two distinct states, deliberately styled apart:
//
//  - "waking": the backend is asleep (free hosting suspends idle services)
//    and is booting. This is expected and temporary, so it reads as
//    progress — muted gold, a spinner, no retry button to press.
//  - "error": something actually failed. Red, with a retry.
//
// Both sit above content that stays usable, so the app degrades rather than
// emptying out.
export function ErrorBanner({
  message,
  onRetry,
  retrying,
  variant = "error",
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  variant?: BannerVariant;
}) {
  const waking = variant === "waking";

  return (
    <View
      accessibilityRole="alert"
      className="mx-5 mt-4 flex-row items-center gap-3 rounded-2xl border px-4 py-3"
      style={{
        backgroundColor: waking ? "rgba(217,185,106,0.10)" : "rgba(208,87,74,0.12)",
        borderColor: waking ? "rgba(217,185,106,0.3)" : "rgba(208,87,74,0.35)",
      }}
    >
      {waking ? (
        <Server size={16} color={colors.primary} />
      ) : (
        <WifiOff size={16} color={colors.destructive} />
      )}

      <View className="min-w-0 flex-1">
        <Text className="text-xs font-sans-semibold text-foreground">{message}</Text>
        <Text className="mt-0.5 text-[11px] text-muted-foreground">
          {waking
            ? "Free hosting sleeps when idle — this takes up to a minute."
            : "Showing sample titles until the connection is back."}
        </Text>
      </View>

      {waking ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : onRetry ? (
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Retry loading"
          className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5 active:opacity-70"
          style={{ opacity: retrying ? 0.5 : 1 }}
        >
          <RefreshCw size={12} color={colors.foreground} />
          <Text className="text-[11px] font-sans-medium text-foreground">
            {retrying ? "…" : "Retry"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
