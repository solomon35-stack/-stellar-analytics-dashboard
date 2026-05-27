/**
 * useNotifications
 *
 * Bridges the Zustand app store notifications with react-hot-toast.
 * Calling `notify()` both adds a persistent notification to the store
 * (visible in the notification panel) and shows a transient toast.
 *
 * Usage:
 *   const { notify, notifications, unreadCount } = useNotifications();
 *   notify({ type: 'success', title: 'Saved', message: 'Your changes were saved.' });
 */
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAppStore, type Notification } from '@/store';

type NotifyInput = Omit<Notification, 'id' | 'timestamp' | 'read'>;

export function useNotifications() {
  const {
    notifications,
    addNotification,
    removeNotification,
    markNotificationRead,
    clearNotifications,
  } = useAppStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const notify = useCallback(
    (input: NotifyInput) => {
      // Persist in the store
      addNotification(input);

      // Show a transient toast
      const message = input.message
        ? `${input.title}: ${input.message}`
        : input.title;

      switch (input.type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'warning':
          toast(message, { icon: '⚠️' });
          break;
        case 'info':
        default:
          toast(message, { icon: 'ℹ️' });
          break;
      }
    },
    [addNotification]
  );

  return {
    notifications,
    unreadCount,
    notify,
    removeNotification,
    markNotificationRead,
    clearNotifications,
  };
}
