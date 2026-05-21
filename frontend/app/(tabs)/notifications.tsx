import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useApi } from '@/lib/useApi';
import { Colors, Typography } from '@/constants/theme';
import { Bell, CheckCircle2, MessageSquare, Trash2, XCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const { notifications, markAsRead, setNotifications } = useNotificationStore();
  const { getMyNotifications, readNotification, deleteNotification, bulkDeleteNotifications } = useApi();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchLatest = useCallback(async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (e) {
      console.error('Failed to fetch notifications on demand:', e);
    }
  }, [getMyNotifications, setNotifications]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLatest();
    setRefreshing(false);
  };

  const handleRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await readNotification(id);
      markAsRead(id);
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Notification',
      'Remove this notification?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await deleteNotification(id);
              setNotifications(notifications.filter(n => n.id !== id));
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not delete notification.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear All Notifications',
      `Remove all ${notifications.length} notification${notifications.length > 1 ? 's' : ''}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setBulkDeleting(true);
            try {
              const ids = notifications.map(n => n.id);
              await bulkDeleteNotifications(ids);
              setNotifications([]);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not clear notifications.');
            } finally {
              setBulkDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleAction = (n: any) => {
    if (n.booking_id) {
      router.push(`/booking/${n.booking_id}`);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isRead = item.status === 'read';
    const isFollowup = item.type === 'followup';
    const isDeleting = deletingId === item.id;

    return (
      <View style={[styles.notificationCard, !isRead && styles.unreadCard]}>
        <TouchableOpacity
          style={styles.notificationCardInner}
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
            <View style={styles.cardHeaderRow}>
              <Text style={styles.typeText}>{isFollowup ? 'Follow-up Request' : 'Booking Update'}</Text>
              {!isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.messageText}>{item.message}</Text>
            <Text style={styles.dateText}>
              {new Date(item.scheduled_at).toLocaleString()}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id)}
          disabled={isDeleting}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isDeleting
            ? <ActivityIndicator size="small" color="#FF4B4B" />
            : <Trash2 size={16} color="#FF4B4B" />
          }
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity
            style={[styles.clearAllBtn, bulkDeleting && styles.clearAllBtnDisabled]}
            onPress={handleBulkDelete}
            disabled={bulkDeleting}
            activeOpacity={0.7}
          >
            {bulkDeleting
              ? <ActivityIndicator size="small" color="#FF4B4B" />
              : <XCircle size={14} color="#FF4B4B" />
            }
            <Text style={styles.clearAllText}>
              {bulkDeleting ? 'Clearing…' : 'Clear All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00F3FF"
            colors={["#00F3FF"]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: 60,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  header: {
    fontFamily: Typography.fonts.bold,
    fontSize: 28,
    color: Colors.dark.text,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderColor: 'rgba(255, 75, 75, 0.3)',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearAllBtnDisabled: {
    opacity: 0.5,
  },
  clearAllText: {
    fontFamily: Typography.fonts.medium,
    fontSize: 13,
    color: '#FF4B4B',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  notificationCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingRight: 4,
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
  cardHeaderRow: {
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
    fontFamily: Typography.fonts.primary,
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  dateText: {
    fontFamily: Typography.fonts.primary,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  deleteBtn: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
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

