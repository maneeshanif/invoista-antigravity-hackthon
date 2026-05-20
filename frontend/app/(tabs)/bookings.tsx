// frontend/app/(tabs)/bookings.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApi } from '@/lib/useApi';
import { GlassCard } from '@/components/shared/GlassCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Calendar, ChevronRight, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

// Types (mirroring backend)
interface Booking {
  id: string;
  provider_id: string;
  user_id: string;
  slot_id: string;
  status: 'confirmed' | 'cancelled';
  confirmation_code: string;
  booked_at: string; // ISO string
  slot_date?: string;
  slot_time?: string;
}

interface Provider {
  id: string;
  name: string;
  category: string;
  // other fields omitted for brevity
}

// Helper components -----------------------------------------------------------
const StatusBadge: React.FC<{ status: Booking['status'] }> = ({ status }) => {
  const isConfirmed = status === 'confirmed';
  return (
    <View
      style={{
        backgroundColor: isConfirmed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 75, 75, 0.1)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: Radius.sm,
      }}
    >
      <ThemedText
        style={{
          color: isConfirmed ? '#10B981' : '#FF4B4B',
          fontFamily: Typography.fonts.medium,
          fontSize: Typography.sizes.sm,
        }}
      >
        {isConfirmed ? 'CONFIRMED' : 'CANCELLED'}
      </ThemedText>
    </View>
  );
};

const FilterChip: React.FC<{ label: string; selected: boolean; onPress: () => void }> = ({ label, selected, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <View
      style={{
        backgroundColor: selected ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255,255,255,0.05)',
        borderColor: selected ? '#00F3FF' : 'transparent',
        borderWidth: selected ? 1 : 0,
        borderRadius: Radius.full,
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        marginRight: Spacing.xs,
        shadowColor: selected ? '#00F3FF' : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: selected ? 0.8 : 0,
        shadowRadius: 4,
      }}
    >
      <ThemedText
        style={{
          color: selected ? '#00F3FF' : Colors.dark.text,
          fontFamily: Typography.fonts.medium,
          fontSize: Typography.sizes.sm,
        }}
      >
        {label}
      </ThemedText>
    </View>
  </TouchableOpacity>
);

// Main screen ---------------------------------------------------------------
export default function BookingsScreen() {
  const router = useRouter();
  const { getMyBookings, getProvider } = useApi();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const list = await getMyBookings();
      const sorted = list.sort((a, b) => new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime());
      setBookings(sorted);

      const uniqueIds = Array.from(new Set(sorted.map(b => b.provider_id)));
      const profiles = await Promise.all(uniqueIds.map(id => getProvider(id).catch(() => null)));
      const map: Record<string, Provider> = {};
      profiles.forEach(p => {
        if (p) map[p.id] = p;
      });
      setProviders(map);
    } catch (e) {
      console.error('Failed to load bookings', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const onRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRefreshing(true);
    await loadData(false);
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const renderItem = ({ item }: { item: Booking }) => {
    const provider = providers[item.provider_id];

    // Helper to format date cleanly
    const getServiceDateStr = () => {
      if (item.slot_date) {
        try {
          const d = new Date(item.slot_date);
          return d.toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' });
        } catch {
          return item.slot_date;
        }
      }
      return new Date(item.booked_at).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/booking/${item.id}`)}
      >
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.providerName}>{provider?.name ?? 'Unknown Provider'}</ThemedText>
            <StatusBadge status={item.status} />
          </View>
          <ThemedText style={styles.providerCategory}>{provider?.category ?? ''}</ThemedText>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.xs }}>
            <View style={styles.row}>
              <Calendar size={14} color={Colors.dark.tint} />
              <ThemedText style={styles.datetime}> {getServiceDateStr()} </ThemedText>
            </View>
            {item.slot_time && (
              <View style={styles.row}>
                <Clock size={14} color={Colors.dark.tint} />
                <ThemedText style={styles.datetime}> {item.slot_time} </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.row}>
            <ThemedText style={styles.confirmCode}>Code: {item.confirmation_code}</ThemedText>
          </View>
          <ChevronRight size={20} color={Colors.dark.tint} style={styles.chevron} />
        </GlassCard>
      </TouchableOpacity>
    );
  };

  // Empty state ------------------------------------------------------------
  if (!loading && bookings.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <Calendar size={64} color='rgba(255,255,255,0.2)' />
        <ThemedText style={styles.emptyTitle}>No bookings yet</ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Your Private Concierge hasn't scheduled any services. Ask the AI on the Home screen to book your first provider.
        </ThemedText>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/'); // Home tab is index
          }}
        >
          <ThemedText style={styles.requestButtonText}>Request a Service</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>MY BOOKINGS</ThemedText>
        <ThemedText style={styles.activeCount}>
          {bookings.filter(b => b.status === 'confirmed').length} Active Bookings
        </ThemedText>
      </View>
      {/* Filter chips */}
      <View style={styles.filterBar}>
        <FilterChip label='All' selected={filter === 'all'} onPress={() => { setFilter('all'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
        <FilterChip label='Active' selected={filter === 'confirmed'} onPress={() => { setFilter('confirmed'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
        <FilterChip label='Past' selected={filter === 'cancelled'} onPress={() => { setFilter('cancelled'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
      </View>
      {/* List */}
      {loading ? (
        <ActivityIndicator size='large' color='#00F3FF' style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor='#00F3FF' />}
        />
      )}
    </ThemedView>
  );
}

// Styles --------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.xxl,
    color: Colors.dark.text,
    letterSpacing: 1.5,
  },
  activeCount: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.tint,
    marginTop: 4,
  },
  filterBar: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  providerName: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.lg,
    color: '#FFF',
  },
  providerCategory: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs / 2,
  },
  datetime: {
    fontFamily: Typography.fonts.primary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.text,
    marginLeft: Spacing.xs,
  },
  confirmCode: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.tint,
    backgroundColor: 'rgba(0,243,255,0.1)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  chevron: {
    position: 'absolute',
    right: Spacing.sm,
    top: '50%',
    marginTop: -10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.dark.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontFamily: Typography.fonts.primary,
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  requestButton: {
    backgroundColor: '#00F3FF',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  requestButtonText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.sm,
    color: '#000',
  },
});
