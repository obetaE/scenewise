import { View, Text, Pressable } from "react-native";
import { WifiOff, RefreshCw } from "lucide-react-native";
import { colors } from "@/lib/theme";

// Shown when live data couldn't be fetched and the screen has fallen back to
// its built-in sample titles. Deliberately non-blocking: the content stays
// usable underneath, so a network blip degrades rather than empties the app.
export function ErrorBanner({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <View
      accessibilityRole="alert"
      className="mx-5 mt-4 flex-row items-center gap-3 rounded-2xl border px-4 py-3"
      style={{
        backgroundColor: "rgba(208,87,74,0.12)",
        borderColor: "rgba(208,87,74,0.35)",
      }}
    >
      <WifiOff size={16} color={colors.destructive} />
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-sans-semibold text-foreground">{message}</Text>
        <Text className="mt-0.5 text-[11px] text-muted-foreground">
          Showing sample titles until the connection is back.
        </Text>
      </View>
      {onRetry ? (
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
