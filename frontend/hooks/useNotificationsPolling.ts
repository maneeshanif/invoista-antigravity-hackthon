import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useNotificationStore } from '../store/useNotificationStore';
import { api } from '../lib/api';
import Toast from 'react-native-toast-message';

export const useNotificationsPolling = (intervalMs: number = 10000) => {
  const { getToken, isSignedIn } = useAuth();
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchNotifications = async () => {
      if (!isSignedIn || !isMounted) return;
      try {
        const token = await getToken();
        if (!token) return;

        const [newNotifications, newBookings] = await Promise.all([
          api.getMyNotifications(token),
          api.getMyBookings(token),
        ]);

        if (!isMounted) return;

        const store = useNotificationStore.getState();
        const prevNotifications = store.notifications;

        // Check for new notifications to trigger a toast
        const previousIds = new Set(prevNotifications.map(n => n.id));
        const newlyAdded = newNotifications.filter(n => !previousIds.has(n.id) && n.status !== 'read');
        console.log('[useNotificationsPolling] Newly added notifications:', newlyAdded.map(n => n.type));
        if (newlyAdded.length > 0 && hasLoadedRef.current) {
          const getToastTitle = (type: string) => {
            switch(type) {
              case 'provider_departed': return 'Provider En Route 🚗';
              case 'provider_arrived': return 'Provider Arrived 📍';
              case 'reminder': return 'Service Reminder ⏰';
              case 'completion_check': return 'Service Completed? ✅';
              case 'followup': return 'Follow-up Request 📋';
              default: return 'New Notification 🔔';
            }
          };

          newlyAdded.forEach(n => {
            Toast.show({
              type: 'info',
              text1: getToastTitle(n.type),
              text2: n.message,
              position: 'top',
            });
          });
        }

        hasLoadedRef.current = true;
        store.setNotifications(newNotifications);
        store.setBookings(newBookings);
      } catch (error) {
        console.error('Failed to fetch notifications/bookings:', error);
      }
    };

    if (!isSignedIn) {
      const store = useNotificationStore.getState();
      if (store.notifications.length > 0 || store.bookings.length > 0) {
        store.clearStore();
      }
      hasLoadedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Initial fetch
    fetchNotifications();

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchNotifications, intervalMs);
    };

    const stopPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    startPolling();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        fetchNotifications();
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        stopPolling();
      }
      appState.current = nextAppState;
    });

    return () => {
      isMounted = false;
      stopPolling();
      subscription.remove();
    };
  }, [isSignedIn, intervalMs]);
};
