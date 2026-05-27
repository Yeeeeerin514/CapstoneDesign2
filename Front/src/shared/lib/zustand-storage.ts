import { Platform } from "react-native";
import type { StateStorage } from "zustand/middleware";
import { createJSONStorage } from "zustand/middleware";

/**
 * 플랫폼별 영속 저장소.
 * - Web: localStorage (브라우저 새로고침에도 유지)
 * - Native: AsyncStorage (앱 재실행에도 유지)
 */
function makeStorage(): StateStorage {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    }
    return {
      getItem: (name) => window.localStorage.getItem(name),
      setItem: (name, value) => window.localStorage.setItem(name, value),
      removeItem: (name) => window.localStorage.removeItem(name),
    };
  }
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default;
  return {
    getItem: async (name) => (await AsyncStorage.getItem(name)) ?? null,
    setItem: async (name, value) => {
      await AsyncStorage.setItem(name, value);
    },
    removeItem: async (name) => {
      await AsyncStorage.removeItem(name);
    },
  };
}

export const persistStorage = createJSONStorage(makeStorage);
