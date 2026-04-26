import * as Notifications from "expo-notifications";

// Module-level Set tracks which item IDs have already been notified this session
const notifiedItemIds = new Set<string>();

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
  for (const item of items) {
    if (!item.expiryDate || notifiedItemIds.has(item.id)) continue;

    const days = getDaysRemaining(item.expiryDate);

    if (days < 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Food Expired",
          body: `${item.name} has expired.`,
        },
        trigger: null, // immediate
      });
      notifiedItemIds.add(item.id);
    } else if (days <= 2) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Expiring Soon",
          body: `Your item ${item.name} is expiring soon.`,
        },
        trigger: null, // immediate
      });
      notifiedItemIds.add(item.id);
    }
  }
}
