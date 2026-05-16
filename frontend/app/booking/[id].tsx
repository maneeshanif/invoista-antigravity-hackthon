import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/shared/GlassCard';
import { PremiumButton } from '@/components/shared/PremiumButton';
import { Calendar, Clock, MapPin, CreditCard, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const TIME_SLOTS = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'];

export default function BookingScreen() {
  const { id, name, price } = useLocalSearchParams();
  const router = useRouter();
  const [selectedTime, setSelectedTime] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirm = () => {
    if (!selectedTime) {
      alert('Please select a time slot');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <ThemedText style={{ fontSize: 40 }}>✅</ThemedText>
          </View>
          <ThemedText style={styles.successTitle}>Booking Confirmed!</ThemedText>
          <ThemedText style={styles.successSub}>Your request for {name} has been sent. The provider will arrive shortly.</ThemedText>
          <PremiumButton 
            title="Go to My Requests" 
            onPress={() => router.replace('/(tabs)')}
            style={styles.confirmButton}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Complete Booking', 
        headerTransparent: true, 
        headerTintColor: '#fff',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color="#FFF" size={24} />
          </TouchableOpacity>
        )
      }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.headerTitle}>Review & Confirm</ThemedText>
        
        {/* Professional Details Card */}
        <GlassCard style={styles.infoCard}>
          <ThemedText style={styles.sectionLabel}>PROVIDER</ThemedText>
          <ThemedText style={styles.providerName}>{name}</ThemedText>
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceLabel}>Rate:</ThemedText>
            <ThemedText style={styles.priceValue}>{price}</ThemedText>
          </View>
        </GlassCard>

        {/* Schedule Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color={Colors.dark.accent} />
            <ThemedText style={styles.sectionTitle}>Select Schedule</ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeSlots}>
            {TIME_SLOTS.map(time => (
              <TouchableOpacity 
                key={time} 
                style={[styles.timeChip, selectedTime === time && styles.activeTimeChip]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedTime(time);
                }}
              >
                <ThemedText style={[styles.timeText, selectedTime === time && styles.activeTimeText]}>{time}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={18} color={Colors.dark.accent} />
            <ThemedText style={styles.sectionTitle}>Service Location</ThemedText>
          </View>
          <GlassCard style={styles.locationCard}>
            <ThemedText style={styles.addressText}>DHA Phase 6, Karachi, Pakistan</ThemedText>
            <TouchableOpacity><ThemedText style={styles.changeText}>CHANGE</ThemedText></TouchableOpacity>
          </GlassCard>
        </View>

        {/* Payment Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={18} color={Colors.dark.accent} />
            <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
          </View>
          <View style={styles.paymentRow}>
            <ThemedText style={styles.paymentText}>Cash on Service</ThemedText>
            <CheckCircle size={18} color="#10B981" />
          </View>
        </View>

        <PremiumButton 
          title="Confirm Booking" 
          onPress={handleConfirm}
          style={styles.confirmButton}
        />
      </ScrollView>
    </ThemedView>
  );
}

// Dummy CheckCircle since it wasn't imported
const CheckCircle = ({ size, color }: any) => (
  <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
    <ThemedText style={{ color: '#000', fontSize: 10 }}>✓</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 100,
  },
  headerTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    marginBottom: Spacing.xl,
  },
  backButton: {
    marginLeft: Spacing.md,
    marginTop: 10,
  },
  infoCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: Radius.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  providerName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 8,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: Typography.sizes.sm,
  },
  priceValue: {
    color: '#FFF',
    fontFamily: Typography.fonts.bold,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  timeSlots: {
    gap: Spacing.sm,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginRight: Spacing.sm,
  },
  activeTimeChip: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  timeText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Typography.fonts.medium,
  },
  activeTimeText: {
    color: '#000',
    fontFamily: Typography.fonts.bold,
  },
  locationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  addressText: {
    color: '#FFF',
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  changeText: {
    color: Colors.dark.accent,
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.md,
  },
  paymentText: {
    color: '#FFF',
    fontFamily: Typography.fonts.medium,
  },
  confirmButton: {
    height: 56,
    marginTop: Spacing.xl,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    marginBottom: Spacing.sm,
  },
  successSub: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
});
