import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotifications, savePushToken } from '../services/notifications';

export function useNotifications(): void {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) savePushToken(token);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // handled silently
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.transactionId) {
        router.push(`/transaction/${data.transactionId}`);
      } else if (data?.screen === 'budgets') {
        router.push('/budgets');
      }
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);
}
