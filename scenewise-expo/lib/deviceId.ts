import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const STORAGE_KEY = "scenewise:deviceId";

let cachedId: string | null = null;

// There's no login in this app. Instead, every device gets one random ID
// the first time it opens the app, stored locally, and reused for every
// request after that. It's what lets "your profile", "your reviews", and
// "your likes" work without an account — see the backend's
// middleware/device.middleware.ts for the other half of this.
export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;

  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    cachedId = stored;
    return stored;
  }

  const fresh = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_KEY, fresh);
  cachedId = fresh;
  return fresh;
}
