import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/shared/GlassCard';
import { PremiumButton } from '@/components/shared/PremiumButton';
import {
  Star,
  MapPin,
  ShieldCheck,
  Briefcase,
  DollarSign,
  Sparkles,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApi } from '@/lib/useApi';
import type { Provider, TraceLog } from '@/lib/api';

export default function ProviderSelectionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { exportSessionTrace, getProvider } = useApi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topProvider, setTopProvider] = useState<Provider | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string | null>(null);
  const [allTraces, setAllTraces] = useState<TraceLog[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { traces } = await exportSessionTrace(sessionId);
        setAllTraces(traces);

        // Find the booking agent trace that contains booking output
        const bookingTrace = traces.find(
          (t) =>
            t.tool_used === 'create_booking' ||
            t.agent_name?.toLowerCase().includes('booking')
        );

        if (bookingTrace?.output_payload) {
          const payload = bookingTrace.output_payload as Record<string, unknown>;
          const bId = (payload.booking_id ?? payload.id) as string | undefined;
          const pId = payload.provider_id as string | undefined;

          if (bId) setBookingId(bId);

          if (pId) {
            const provider = await getProvider(pId);
            setTopProvider(provider);
          }
        }

        // Try to extract recommendation reason from ranking trace
        const rankingTrace = traces.find(
          (t) =>
            t.agent_name?.toLowerCase().includes('rank') ||
            t.tool_used?.includes('rank') ||
            t.agent_name?.toLowerCase().includes('match')
        );
        if (rankingTrace?.output_summary) {
          setRecommendationReason(rankingTrace.output_summary);
        }
      } catch (e: any) {
        console.error('Provider selection load error:', e);
        setError(e.message ?? 'Failed to load provider data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  const handleViewBooking = () => {
    if (!bookingId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/booking/[id]',
      params: { id: bookingId },
    });
  };

  const handleBack = () => router.replace('/(tabs)');

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Best Match',
            headerTransparent: true,
            headerTintColor: '#fff',
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} style={styles.headerBack}>
                <ChevronLeft color="#FFF" size={24} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <ThemedText style={styles.loadingText}>Loading your match…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error || !topProvider) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Best Match',
            headerTransparent: true,
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.centerContent}>
          <AlertCircle size={48} color="#FF4B4B" />
          <ThemedText style={styles.errorTitle}>Could Not Load Provider</ThemedText>
          <ThemedText style={styles.errorSubtitle}>
            {error ?? 'No provider was found in the agent trace.'}
          </ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
            <ThemedText style={styles.retryText}>Go Home</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Best Match',
          headerTransparent: true,
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerBack}>
              <ChevronLeft color="#FFF" size={24} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.heroSection}>
          <View style={styles.sparkleRing}>
            <Sparkles size={32} color={Colors.dark.accent} />
          </View>
          <ThemedText style={styles.heroTitle}>AI Recommended</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Our agent selected the best match for your request
          </ThemedText>
        </View>

        {/* Top Provider Card */}
        <GlassCard style={styles.providerCard}>
          {/* Verified Badge */}
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={12} color={Colors.dark.accent} />
            <ThemedText style={styles.verifiedText}>VERIFIED PARTNER</ThemedText>
          </View>

          <ThemedText style={styles.providerName}>{topProvider.name}</ThemedText>
          <ThemedText style={styles.providerCategory}>{topProvider.category}</ThemedText>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <ThemedText style={styles.statValue}>{topProvider.rating.toFixed(1)}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Rating</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Briefcase size={14} color={Colors.dark.accent} />
                <ThemedText style={styles.statValue}>{topProvider.jobs_completed}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Jobs Done</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <DollarSign size={14} color="#10B981" />
                <ThemedText style={styles.statValue} numberOfLines={1} style={[styles.statValue, { fontSize: 11 }]}>
                  {topProvider.price_range}
                </ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Price</ThemedText>
            </View>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <MapPin size={14} color="rgba(255,255,255,0.4)" />
            <ThemedText style={styles.locationText}>{topProvider.area}</ThemedText>
          </View>
        </GlassCard>

        {/* Why Recommended */}
        {recommendationReason && (
          <GlassCard style={styles.reasonCard}>
            <ThemedText style={styles.reasonTitle}>✨ Why Recommended</ThemedText>
            <ThemedText style={styles.reasonText}>{recommendationReason}</ThemedText>
          </GlassCard>
        )}

        {/* Agent Pipeline Summary */}
        {allTraces.length > 0 && (
          <View style={styles.pipelineSection}>
            <ThemedText style={styles.pipelineTitle}>Agent Pipeline</ThemedText>
            {allTraces
              .slice()
              .sort((a, b) => a.step - b.step)
              .map((trace) => (
                <View key={trace.id} style={styles.pipelineStep}>
                  <View style={styles.pipelineDot} />
                  <View style={styles.pipelineContent}>
                    <ThemedText style={styles.pipelineAgent}>{trace.agent_name}</ThemedText>
                    {trace.tool_used && (
                      <ThemedText style={styles.pipelineTool}>{trace.tool_used}</ThemedText>
                    )}
                  </View>
                  {trace.duration_ms != null && (
                    <ThemedText style={styles.pipelineDuration}>{trace.duration_ms}ms</ThemedText>
                  )}
                </View>
              ))}
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaContainer}>
          {bookingId ? (
            <PremiumButton
              title="View Confirmed Booking"
              onPress={handleViewBooking}
              style={styles.ctaButton}
            />
          ) : (
            <GlassCard style={styles.noBookingCard}>
              <ThemedText style={styles.noBookingText}>
                The agent has identified a provider but booking wasn't completed automatically.
                Return home to try again.
              </ThemedText>
              <TouchableOpacity style={styles.homeButton} onPress={handleBack}>
                <ThemedText style={styles.homeButtonText}>Go Home</ThemedText>
              </TouchableOpacity>
            </GlassCard>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </ThemedView>
  );
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
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: Typography.sizes.md,
  },
  errorTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  errorSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
  },
  retryButton: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  retryText: {
    color: '#000',
    fontFamily: Typography.fonts.bold,
  },
  headerBack: {
    marginLeft: Spacing.sm,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 100,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  sparkleRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.2)',
  },
  heroTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  providerCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
    letterSpacing: 1.5,
  },
  providerName: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  providerCategory: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.4)',
  },
  reasonCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    borderColor: 'rgba(0, 243, 255, 0.1)',
    borderWidth: 1,
  },
  reasonTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
    marginBottom: Spacing.sm,
  },
  reasonText: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },
  pipelineSection: {
    marginBottom: Spacing.lg,
  },
  pipelineTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.bold,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  pipelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  pipelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  pipelineContent: {
    flex: 1,
  },
  pipelineAgent: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  pipelineTool: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  pipelineDuration: {
    fontSize: 10,
    color: Colors.dark.accent,
    fontFamily: Typography.fonts.bold,
  },
  ctaContainer: {
    marginTop: Spacing.md,
  },
  ctaButton: {
    height: 56,
  },
  noBookingCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  noBookingText: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
  },
  homeButton: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  homeButtonText: {
    color: '#000',
    fontFamily: Typography.fonts.bold,
  },
});
