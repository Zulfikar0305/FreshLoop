import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
  Notification,
  NotificationResponse,
  Subscription,
} from 'expo-notifications';

const IS_EXPO_GO =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

function loadNotificationsModule(): typeof import('expo-notifications') | null {
  if (IS_EXPO_GO) return null;
  try {
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

const Notifications = loadNotificationsModule();

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

const STORAGE_KEY = 'notifiedItemIds';

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

/** Android 8+ channel for local notifications (no-op on iOS / Expo Go / web). */
export async function ensureDefaultAndroidChannel(): Promise<void> {
  const N = loadNotificationsModule();
  if (!N || Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync('default', {
    name: 'FreshLoop',
    importance: N.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2D6A4F',
  });
}

export async function requestNotificationPermission(): Promise<void> {
  const N = loadNotificationsModule();
  if (!N) return;
  const { status } = await N.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Notification permission not granted.');
  }
}

type ItemForNotification = {
  id: string;
  name: string;
  expiryDate: Date | null;
  status?: string;
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
  const N = loadNotificationsModule();
  if (!N) return;

  const ids = await getNotifiedIds();

  for (const item of items) {
    if (item.status === 'used' || item.status === 'wasted') continue;
    if (!item.expiryDate) continue;

    const days = getDaysRemaining(item.expiryDate);

    if (days < 0) {
      const key = `${item.id}:expired`;
      if (ids.has(key)) continue;
      await N.scheduleNotificationAsync({
        content: {
          title: 'Food Expired',
          body: `${item.name} has expired.`,
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
        },
      });
      ids.add(key);
    } else if (days <= 2) {
      const key = `${item.id}:soon`;
      if (ids.has(key)) continue;
      await N.scheduleNotificationAsync({
        content: {
          title: 'Expiring Soon',
          body: `Your item ${item.name} is expiring soon.`,
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
        },
      });
      ids.add(key);
    }
  }

  await persistNotifiedIds(ids);
}

/** Schedules a demo notification a few seconds from now. No-op in Expo Go. */
export async function scheduleTestNotification(): Promise<void> {
  const N = loadNotificationsModule();
  if (!N) return;
  await N.scheduleNotificationAsync({
    content: {
      title: 'FreshLoop Alerts ✅',
      body: 'Expiry notifications are working correctly.',
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
    },
  });
}

export type NotificationEventHandlers = {
  /** Fires while app is in foreground (banner controlled by setNotificationHandler). */
  onForegroundNotification?: (notification: Notification) => void;
  /** User tapped a notification or pressed an action (foreground + background). */
  onNotificationResponse?: (response: NotificationResponse) => void;
};

/**
 * Registers foreground receive + response listeners. Call once from App mount.
 * Returns cleanup that removes subscriptions.
 */
export function subscribeToNotificationEvents(
  handlers: NotificationEventHandlers
): () => void {
  const N = loadNotificationsModule();
  if (!N) return () => {};

  const subs: Subscription[] = [];
  if (handlers.onForegroundNotification) {
    subs.push(
      N.addNotificationReceivedListener(handlers.onForegroundNotification)
    );
  }
  if (handlers.onNotificationResponse) {
    subs.push(
      N.addNotificationResponseReceivedListener(handlers.onNotificationResponse)
    );
  }

  return () => {
    subs.forEach((s) => s.remove());
  };
}

/**
 * If the app was opened by tapping a notification, invokes callback once.
 * Safe to call on every cold start.
 */
export async function notifyIfOpenedFromNotification(
  onResponse: (response: NotificationResponse) => void
): Promise<void> {
  const N = loadNotificationsModule();
  if (!N) return;
  const last = await N.getLastNotificationResponseAsync();
  if (last?.notification) {
    onResponse(last);
  }
}
