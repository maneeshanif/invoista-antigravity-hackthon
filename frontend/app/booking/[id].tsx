import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/shared/GlassCard';
import { PremiumButton } from '@/components/shared/PremiumButton';
import { Calendar, MapPin, CreditCard, ChevronLeft, CheckCircle2, AlertCircle, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApi } from '@/lib/useApi';
import type { Booking, Provider } from '@/lib/api';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function BookingScreen() {
  const { id: bookingId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getBooking, getProvider, cancelBooking } = useApi();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const b = await getBooking(bookingId);
        setBooking(b);
        const p = await getProvider(b.provider_id);
        setProvider(p);
      } catch (e: any) {
        console.error('Booking load error:', e);
        setError(e.message ?? 'Failed to load booking.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const updated = await cancelBooking(bookingId);
              setBooking(updated);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not cancel booking.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Booking', headerTransparent: true, headerTintColor: '#fff' }} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <ThemedText style={styles.loadingText}>Loading booking…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error || !booking) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Booking', headerTransparent: true, headerTintColor: '#fff' }} />
        <View style={styles.centerContent}>
          <AlertCircle size={48} color="#FF4B4B" />
          <ThemedText style={styles.errorTitle}>Could Not Load Booking</ThemedText>
          <ThemedText style={styles.errorSubtitle}>{error ?? 'Booking not found.'}</ThemedText>
          <TouchableOpacity style={styles.goHomeButton} onPress={() => router.replace('/(tabs)')}>
            <ThemedText style={styles.goHomeText}>Go Home</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const isConfirmed = booking.status === 'confirmed';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Booking Confirmation',
          headerTransparent: true,
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color="#FFF" size={24} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Hero */}
        <View style={styles.statusHero}>
          <View style={[styles.statusIcon, !isConfirmed && styles.statusIconCancelled]}>
            {isConfirmed
              ? <CheckCircle2 size={40} color="#10B981" />
              : <XCircle size={40} color="#FF4B4B" />
            }
          </View>
          <ThemedText style={styles.statusTitle}>
            {isConfirmed ? 'Booking Confirmed!' : 'Booking Cancelled'}
          </ThemedText>
          <View style={[styles.statusBadge, !isConfirmed && styles.statusBadgeCancelled]}>
            <ThemedText style={[styles.statusBadgeText, !isConfirmed && styles.statusBadgeTextCancelled]}>
              {booking.status.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        {/* Confirmation Code */}
        <GlassCard style={styles.codeCard}>
          <ThemedText style={styles.codeLabel}>CONFIRMATION CODE</ThemedText>
          <ThemedText style={styles.codeValue}>{booking.confirmation_code}</ThemedText>
        </GlassCard>

        {/* Provider Details */}
        {provider && (
          <GlassCard style={styles.infoCard}>
            <ThemedText style={styles.sectionLabel}>PROVIDER</ThemedText>
            <ThemedText style={styles.providerName}>{provider.name}</ThemedText>
            <ThemedText style={styles.providerCategory}>{provider.category}</ThemedText>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Price Range:</ThemedText>
              <ThemedText style={styles.priceValue}>{provider.price_range}</ThemedText>
            </View>
            <View style={styles.locationRow}>
              <MapPin size={14} color="rgba(255,255,255,0.4)" />
              <ThemedText style={styles.locationText}>{provider.area}</ThemedText>
            </View>
          </GlassCard>
        )}

        {/* Booking Details */}
        <GlassCard style={styles.infoCard}>
          <ThemedText style={styles.sectionLabel}>BOOKING DETAILS</ThemedText>

          <View style={styles.detailRow}>
            <Calendar size={16} color={Colors.dark.accent} />
            <View style={styles.detailContent}>
              <ThemedText style={styles.detailLabel}>Date Booked</ThemedText>
              <ThemedText style={styles.detailValue}>{formatDate(booking.booked_at)}</ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <CreditCard size={16} color={Colors.dark.accent} />
            <View style={styles.detailContent}>
              <ThemedText style={styles.detailLabel}>Payment</ThemedText>
              <ThemedText style={styles.detailValue}>Cash on Service</ThemedText>
            </View>
          </View>
        </GlassCard>

        {/* Actions */}
        <View style={styles.actions}>
          <PremiumButton
            title="Go to My Requests"
            onPress={() => router.replace('/(tabs)')}
            style={styles.homeBtn}
          />

          {isConfirmed && (
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
              onPress={handleCancelBooking}
              disabled={cancelling}
            >
              {cancelling
                ? <ActivityIndicator size="small" color="#FF4B4B" />
                : <ThemedText style={styles.cancelBtnText}>Cancel Booking</ThemedText>
              }
            </TouchableOpacity>
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
  },
  goHomeButton: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  goHomeText: {
    color: '#000',
    fontFamily: Typography.fonts.bold,
  },
  backButton: {
    marginLeft: Spacing.sm,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 100,
  },
  statusHero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusIconCancelled: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderColor: 'rgba(255, 75, 75, 0.2)',
  },
  statusTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBadgeCancelled: {
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    borderColor: 'rgba(255, 75, 75, 0.3)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fonts.bold,
    color: '#10B981',
    letterSpacing: 1,
  },
  statusBadgeTextCancelled: {
    color: '#FF4B4B',
  },
  codeCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderColor: 'rgba(0, 243, 255, 0.2)',
    borderWidth: 1,
  },
  codeLabel: {
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  codeValue: {
    fontSize: 28,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    letterSpacing: 4,
  },
  infoCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  providerName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  providerCategory: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: Typography.sizes.sm,
  },
  priceValue: {
    color: '#FFF',
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: Typography.sizes.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.medium,
    color: '#FFF',
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  homeBtn: {
    height: 56,
  },
  cancelBtn: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnDisabled: {
    opacity: 0.5,
  },
  cancelBtnText: {
    color: '#FF4B4B',
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.md,
  },
});
