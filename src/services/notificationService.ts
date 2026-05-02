import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Detect Expo Go via both the legacy appOwnership API and the current
// executionEnvironment API (preferred in SDK 49+). Either being truthy is enough.
const IS_EXPO_GO =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

// Use a conditional require() instead of a static import so that the
// expo-notifications native module is NEVER loaded in Expo Go.
// A static `import` at the top of the file causes the native module to
// initialise and emit the "Android push notifications removed" console error
// regardless of any runtime guards. Conditional require() prevents this.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Notifications = IS_EXPO_GO
  ? null
  : (require("expo-notifications") as typeof import("expo-notifications"));

// Export so screens can conditionally hide notification-dependent UI in Expo Go.
export const isExpoGo = IS_EXPO_GO;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const STORAGE_KEY = "notifiedItemIds";

// In-memory cache, seeded from AsyncStorage on first load
let notifiedItemIds: Set<string> | null = null;

async function getNotifiedIds(): Promise<Set<string>> {
  if (notifiedItemIds !== null) return notifiedItemIds;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    notifiedItemIds = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    notifiedItemIds = new Set<string>();
  }
  return notifiedItemIds;
}

async function persistNotifiedIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // non-critical — notifications may repeat on next session if storage fails
  }
}

export async function requestNotificationPermission(): Promise<void> {
  if (!Notifications) return; // module not loaded in Expo Go
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("Notification permission not granted.");
  }
}

type ItemForNotification = {
  id: string;
  name: string;
  expiryDate: Date | null;
};

function getDaysRemaining(expiryDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function scheduleExpiryNotifications(
  items: ItemForNotification[]
): Promise<void> {
  if (!Notifications) return; // module not loaded in Expo Go

  const ids = await getNotifiedIds();

  for (const item of items) {
    if (!item.expiryDate) continue;

    const days = getDaysRemaining(item.expiryDate);

    if (days < 0) {
      const key = `${item.id}:expired`;
      if (ids.has(key)) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Food Expired",
          body: `${item.name} has expired.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
        },
      });
      ids.add(key);
    } else if (days <= 2) {
      const key = `${item.id}:soon`;
      if (ids.has(key)) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Expiring Soon",
          body: `Your item ${item.name} is expiring soon.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
        },
      });
      ids.add(key);
    }
  }

  await persistNotifiedIds(ids);
}

/** Schedules a demo notification 2 seconds from now. No-op in Expo Go. */
export async function scheduleTestNotification(): Promise<void> {
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "FreshLoop Alerts \u2705",
      body: "Expiry notifications are working correctly.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
    },
  });
}

