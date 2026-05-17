import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/shared/GlassCard';
import { BarChart2, CheckCircle2, XCircle, BookOpen, Users, ChevronRight, AlertCircle } from 'lucide-react-native';
import { useApi } from '@/lib/useApi';
import type { Session, Booking, Provider, TraceLog } from '@/lib/api';

interface Stats {
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  totalBookings: number;
  totalProviders: number;
  totalTraces: number;
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <GlassCard style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </GlassCard>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { adminListSessions, adminListBookings, adminListProviders, adminListTraces } = useApi();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [sessionsData, bookingsData, providersData, tracesData] = await Promise.all([
        adminListSessions(),
        adminListBookings(),
        adminListProviders(),
        adminListTraces(),
      ]);

      setSessions(sessionsData);
      setBookings(bookingsData);
      setStats({
        totalSessions: sessionsData.length,
        completedSessions: sessionsData.filter((s) => s.status === 'completed').length,
        failedSessions: sessionsData.filter((s) => s.status === 'failed').length,
        totalBookings: bookingsData.length,
        totalProviders: providersData.length,
        totalTraces: tracesData.length,
      });
    } catch (e: any) {
      console.error('Admin dashboard error:', e);
      setError(e.message ?? 'Failed to load admin data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <ThemedText style={styles.loadingText}>Loading dashboard…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00F3FF" />}
      >
        {error && (
          <GlassCard style={styles.errorBanner}>
            <AlertCircle size={16} color="#FF4B4B" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </GlassCard>
        )}

        {/* Stats Grid */}
        {stats && (
          <>
            <ThemedText style={styles.sectionTitle}>Overview</ThemedText>
            <View style={styles.statsGrid}>
              <StatCard
                label="Total Sessions"
                value={stats.totalSessions}
                icon={<BarChart2 size={20} color="#A78BFA" />}
                color="#A78BFA"
              />
              <StatCard
                label="Completed"
                value={stats.completedSessions}
                icon={<CheckCircle2 size={20} color="#10B981" />}
                color="#10B981"
              />
              <StatCard
                label="Failed"
                value={stats.failedSessions}
                icon={<XCircle size={20} color="#FF4B4B" />}
                color="#FF4B4B"
              />
              <StatCard
                label="Bookings"
                value={stats.totalBookings}
                icon={<BookOpen size={20} color="#F59E0B" />}
                color="#F59E0B"
              />
              <StatCard
                label="Providers"
                value={stats.totalProviders}
                icon={<Users size={20} color={Colors.dark.accent} />}
                color={Colors.dark.accent}
              />
              <StatCard
                label="Trace Logs"
                value={stats.totalTraces}
                icon={<BarChart2 size={20} color="#EC4899" />}
                color="#EC4899"
              />
            </View>
          </>
        )}

        {/* Recent Sessions */}
        <ThemedText style={styles.sectionTitle}>Recent Sessions</ThemedText>
        {sessions.length === 0 ? (
          <ThemedText style={styles.emptyText}>No sessions yet.</ThemedText>
        ) : (
          sessions.slice(0, 20).map((session) => (
            <TouchableOpacity
              key={session.id}
              onPress={() =>
                router.push({
                  pathname: '/admin/traces/[sessionId]',
                  params: { sessionId: session.id },
                })
              }
            >
              <GlassCard style={styles.sessionRow}>
                <View style={styles.sessionInfo}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(session.status) }]} />
                  <View style={styles.sessionText}>
                    <ThemedText style={styles.sessionInput} numberOfLines={1}>
                      {session.raw_input}
                    </ThemedText>
                    <ThemedText style={styles.sessionMeta}>
                      {session.status.toUpperCase()} · {new Date(session.started_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                </View>
                <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
              </GlassCard>
            </TouchableOpacity>
          ))
        )}

        {/* Recent Bookings */}
        <ThemedText style={styles.sectionTitle}>Recent Bookings</ThemedText>
        {bookings.length === 0 ? (
          <ThemedText style={styles.emptyText}>No bookings yet.</ThemedText>
        ) : (
          bookings.slice(0, 10).map((booking) => (
            <GlassCard key={booking.id} style={styles.bookingRow}>
              <View style={[styles.statusDot, { backgroundColor: booking.status === 'confirmed' ? '#10B981' : '#FF4B4B' }]} />
              <View style={styles.bookingInfo}>
                <ThemedText style={styles.bookingCode}>{booking.confirmation_code}</ThemedText>
                <ThemedText style={styles.bookingMeta}>
                  {booking.status.toUpperCase()} · {new Date(booking.booked_at).toLocaleDateString()}
                </ThemedText>
              </View>
            </GlassCard>
          ))
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </ThemedView>
  );
}

function statusColor(status: Session['status']): string {
  switch (status) {
    case 'completed': return '#10B981';
    case 'failed': return '#FF4B4B';
    case 'running': return '#F59E0B';
    default: return 'rgba(255,255,255,0.3)';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderColor: 'rgba(255,75,75,0.3)',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF4B4B',
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    width: '31%',
    padding: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.lg,
    gap: 4,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  sessionText: {
    flex: 1,
  },
  sessionInput: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.medium,
    color: '#FFF',
  },
  sessionMeta: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingCode: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    letterSpacing: 2,
  },
  bookingMeta: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
  },
});
