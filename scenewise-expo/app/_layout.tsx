import "../global.css";
import { useEffect, useState, useCallback } from "react";
import { Stack } from "expo-router";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { LoadingScreen } from "@/components/LoadingScreen";
import { getDeviceId } from "@/lib/deviceId";

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 250 });

// Long enough that the branded screen registers, short enough that it never
// feels like a wait on a warm start.
const MIN_SPLASH_MS = 1200;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
  });

  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        // Resolving the device ID here keeps it off the critical path of the
        // first API call, which would otherwise await it mid-request.
        getDeviceId().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
      ]);
      if (!cancelled) setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A font that fails to load shouldn't strand the app on the splash forever —
  // fall through to system fonts instead.
  const ready = bootstrapped && (fontsLoaded || !!fontError);

  // Hand off from the native splash only once our own screen has painted, so
  // there's no gap between the two.
  const onLoadingScreenLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!ready) return <LoadingScreen onLayout={onLoadingScreenLayout} />;

  return (
    <View className="flex-1 pt-2 bg-background">
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#201c19" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="title/[id]" />
        <Stack.Screen name="movie/[id]" />
      </Stack>
    </View>
  );
}
