import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Clock, CheckCircle2, Truck } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { GlassCard } from '@/components/shared/GlassCard';
import { ThemedText } from '@/components/themed-text';

interface ActiveBookingCardProps {
  service: string;
  status: 'finding' | 'en-route' | 'started' | 'completed';
  providerName?: string;
  timeEstimate?: string;
}

export const ActiveBookingCard = ({ service, status, providerName, timeEstimate }: ActiveBookingCardProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'finding':
        return { label: 'Finding Best Pro...', icon: <Clock size={16} color={Colors.dark.warning} />, color: Colors.dark.warning };
      case 'en-route':
        return { label: 'Provider En-route', icon: <Truck size={16} color={Colors.dark.tint} />, color: Colors.dark.tint };
      case 'started':
        return { label: 'Job in Progress', icon: <Clock size={16} color={Colors.dark.accent} />, color: Colors.dark.accent };
      case 'completed':
        return { label: 'Job Completed', icon: <CheckCircle2 size={16} color={Colors.dark.success} />, color: Colors.dark.success };
      default:
        return { label: 'Status Unknown', icon: null, color: Colors.dark.icon };
    }
  };

  const config = getStatusConfig();

  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <View style={styles.serviceInfo}>
          <ThemedText style={styles.serviceName}>{service}</ThemedText>
          {providerName && <ThemedText style={styles.providerName}>by {providerName}</ThemedText>}
        </View>
        <View style={[styles.badge, { backgroundColor: `${config.color}20` }]}>
          {config.icon}
          <ThemedText style={[styles.badgeText, { color: config.color }]}>{config.label}</ThemedText>
        </View>
      </View>
      
      {timeEstimate && (
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>Estimated Arrival: </ThemedText>
          <ThemedText style={styles.timeValue}>{timeEstimate}</ThemedText>
        </View>
      )}

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { 
          backgroundColor: config.color,
          width: status === 'finding' ? '25%' : status === 'en-route' ? '50%' : status === 'started' ? '75%' : '100%'
        }]} />
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    marginRight: Spacing.md,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.bold,
    color: '#FFFFFF',
  },
  providerName: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Typography.fonts.medium,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.5)',
  },
  timeValue: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.bold,
    color: '#FFFFFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
