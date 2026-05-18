import { create } from 'zustand';
import { Booking, Notification } from '../lib/api';

interface NotificationState {
  notifications: Notification[];
  bookings: Booking[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  setBookings: (bookings: Booking[]) => void;
  markAsRead: (id: string) => void;
  clearStore: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  bookings: [],
  unreadCount: 0,
  
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => n.status !== 'read').length;
    set({ notifications, unreadCount });
  },
  
  setBookings: (bookings) => set({ bookings }),
  
  markAsRead: (id) => set((state) => {
    const updatedNotifications = state.notifications.map(n => 
      n.id === id ? { ...n, status: 'read' } : n
    );
    const unreadCount = updatedNotifications.filter(n => n.status !== 'read').length;
    return { notifications: updatedNotifications, unreadCount };
  }),
  
  clearStore: () => set({ notifications: [], bookings: [], unreadCount: 0 }),
}));
