import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Star, MapPin } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { GlassCard } from '@/components/shared/GlassCard';
import { ThemedText } from '@/components/themed-text';
import { PremiumButton } from '@/components/shared/PremiumButton';
import { useRouter } from 'expo-router';

interface ServiceCardProps {
  name: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  distance: string;
  image: string;
  onBook: () => void;
}

export const ServiceCard = ({ 
  name, 
  category, 
  rating, 
  reviews, 
  price, 
  distance, 
  image,
  onBook,
}: ServiceCardProps) => {
  const router = useRouter();

  const handleView = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/provider/[id]',
      params: { id: name, name, category, image, rating, reviews, price, distance }
    });
  };

  return (
    <GlassCard style={styles.container}>
      <TouchableOpacity onPress={handleView} activeOpacity={0.9}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{category}</ThemedText>
          </View>
        </View>
        
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.title} numberOfLines={1}>{name}</ThemedText>
            <View style={styles.ratingRow}>
              <Star size={14} color="#FFD700" fill="#FFD700" />
              <ThemedText style={styles.ratingText}>{rating} ({reviews})</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.location}>
              <MapPin size={12} color={Colors.dark.icon} />
              <ThemedText style={styles.infoText}>{distance}</ThemedText>
            </View>
            <ThemedText style={styles.price}>{price}</ThemedText>
          </View>

          <View style={styles.actions}>
            <PremiumButton 
              title="Book Now" 
              onPress={onBook} 
              variant="primary"
              style={styles.bookButton}
            />
          </View>
        </View>
      </TouchableOpacity>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    padding: 0,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.lg,
  },
  imageWrapper: {
    height: 180,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  badge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Typography.fonts.bold,
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: -0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    color: '#FFD700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.icon,
  },
  price: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.medium,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  actions: {
    marginTop: Spacing.xs,
  },
  bookButton: {
    height: 48,
    borderRadius: Radius.md,
  },
});
