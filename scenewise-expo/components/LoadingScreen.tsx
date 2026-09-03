import { useEffect } from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "@/lib/theme";

// Shown while the app boots. Deliberately mirrors the native splash config in
// app.json — same background, same mark, same size — so the handoff from the
// native splash to the first React frame has nothing to see.
export function LoadingScreen({ onLayout }: { onLayout?: () => void }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + pulse.value * 0.28,
    transform: [{ scale: 0.96 + pulse.value * 0.04 }],
  }));

  return (
    <View
      onLayout={onLayout}
      className="flex-1 items-center justify-center bg-background"
    >
      <Animated.View style={markStyle}>
        <Image
          source={require("../assets/logo.png")}
          style={{ width: 112, height: 112 }}
          resizeMode="contain"
        />
      </Animated.View>

      <Text className="mt-5 font-display text-2xl text-primary">Scenewise</Text>
      <Text className="mt-1.5 text-xs text-muted-foreground">
        Know before you press play
      </Text>

      <View className="mt-8">
        <ActivityIndicator color={colors.primary} />
      </View>
    </View>
  );
}
