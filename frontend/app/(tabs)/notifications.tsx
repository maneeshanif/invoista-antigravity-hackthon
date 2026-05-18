import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNotificationStore } from '@/store/useNotificationStore';
import { api } from '@/lib/api';
import { useAuth } from '@clerk/expo';
import { Colors, Typography } from '@/constants/theme';
import { Bell, CheckCircle2, MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const { notifications, markAsRead } = useNotificationStore();
  const { getToken } = useAuth();
  const router = useRouter();

  const handleRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      const token = await getToken();
      if (!token) return;
      await api.readNotification(id, token);
      markAsRead(id);
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const handleAction = (n: any) => {
    // If it's a booking notification, maybe go to booking details
    if (n.booking_id) {
      router.push(`/booking/${n.booking_id}`);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isRead = item.status === 'read';
    const isFollowup = item.type === 'followup';

    return (
      <TouchableOpacity 
        style={[styles.notificationCard, !isRead && styles.unreadCard]}
        onPress={() => {
          handleRead(item.id, isRead);
          handleAction(item);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          {isFollowup ? (
            <MessageSquare size={24} color={Colors.dark.tint} />
          ) : (
            <Bell size={24} color={Colors.dark.tint} />
          )}
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.typeText}>{isFollowup ? 'Follow-up Request' : 'Booking Update'}</Text>
            {!isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.messageText}>{item.message}</Text>
          <Text style={styles.dateText}>
            {new Date(item.scheduled_at).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckCircle2 size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: 60,
  },
  header: {
    fontFamily: Typography.fonts.bold,
    fontSize: 28,
    color: Colors.dark.text,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  unreadCard: {
    borderColor: 'rgba(0, 243, 255, 0.3)',
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeText: {
    fontFamily: Typography.fonts.medium,
    fontSize: 14,
    color: '#00F3FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00F3FF',
  },
  messageText: {
    fontFamily: Typography.fonts.regular,
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  dateText: {
    fontFamily: Typography.fonts.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Typography.fonts.medium,
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 16,
  },
});
