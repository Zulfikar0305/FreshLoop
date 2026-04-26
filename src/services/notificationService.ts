import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const ids = await getNotifiedIds();

  for (const item of items) {
    if (!item.expiryDate || ids.has(item.id)) continue;

    const days = getDaysRemaining(item.expiryDate);

    if (days < 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Food Expired",
          body: `${item.name} has expired.`,
        },
        trigger: null,
      });
      ids.add(item.id);
    } else if (days <= 2) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Expiring Soon",
          body: `Your item ${item.name} is expiring soon.`,
        },
        trigger: null,
      });
      ids.add(item.id);
    }
  }

  await persistNotifiedIds(ids);
}

