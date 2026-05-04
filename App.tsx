import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import {
  requestNotificationPermission,
  ensureDefaultAndroidChannel,
  subscribeToNotificationEvents,
  notifyIfOpenedFromNotification,
} from './services/notificationService';

export default function App() {
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await requestNotificationPermission();
      await ensureDefaultAndroidChannel();

      await notifyIfOpenedFromNotification((response) => {
        if (__DEV__) {
          console.log(
            '[FreshLoop] App opened from notification tap',
            response.notification.request.content
          );
        }
      });

      if (cancelled) return;

      unsubRef.current = subscribeToNotificationEvents({
        onForegroundNotification: (notification) => {
          if (__DEV__) {
            console.log(
              '[FreshLoop] Foreground notification',
              notification.request.content
            );
          }
        },
        onNotificationResponse: (response) => {
          if (__DEV__) {
            console.log(
              '[FreshLoop] Notification response (tap/action)',
              response.notification.request.content
            );
          }
        },
      });
    })();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, []);

  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1C3A2E" />
      <RootNavigator />
    </AuthProvider>
  );
}