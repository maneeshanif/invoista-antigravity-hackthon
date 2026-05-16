import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { 
  Star, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Briefcase, 
  MessageSquare,
  ChevronLeft,
  Share2,
  Heart
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/shared/GlassCard';
import { PremiumButton } from '@/components/shared/PremiumButton';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const MOCK_REVIEWS = [
  { id: '1', user: 'Ali Ahmed', rating: 5, comment: 'Very professional and arrived on time. Highly recommended for any smart home setup!', date: '2 days ago' },
  { id: '2', user: 'Sara Khan', rating: 4, comment: 'Great service, but a bit expensive. Quality was top notch though.', date: '1 week ago' },
];

export default function ProviderProfileScreen() {
  const { id, name, category, image, rating, reviews, price, distance } = useLocalSearchParams();
  const router = useRouter();
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleHire = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/booking/[id]',
      params: { id, name, price }
    });
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: false,
      }} />

      {/* Floating Header Actions */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.circleButton} onPress={() => router.back()}>
          <ChevronLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.circleButton}>
            <Share2 color="#FFF" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleButton}>
            <Heart color="#FFF" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView 
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: image as string || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800' }} 
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.verifiedRow}>
              <ShieldCheck size={14} color={Colors.dark.accent} />
              <ThemedText style={styles.verifiedText}>VERIFIED PARTNER</ThemedText>
            </View>
            <ThemedText style={styles.providerName}>{name}</ThemedText>
            <ThemedText style={styles.categoryText}>{category}</ThemedText>
          </View>
        </View>

        <View style={styles.content}>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{rating}</ThemedText>
              <View style={styles.starRow}>
                {[1,2,3,4,5].map(i => <Star key={i} size={10} color="#FFD700" fill={i <= Number(rating) ? "#FFD700" : "transparent"} />)}
              </View>
              <ThemedText style={styles.statLabel}>{reviews} Reviews</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>150+</ThemedText>
              <ThemedText style={styles.statLabel}>Jobs Done</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>5 yr</ThemedText>
              <ThemedText style={styles.statLabel}>Experience</ThemedText>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>About</ThemedText>
            <ThemedText style={styles.bioText}>
              Premium {category} specialist with a focus on luxury residential projects. 
              Known for precision, reliability, and executive-level service standards in the {distance} area.
            </ThemedText>
          </View>

          {/* Expertise */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Expertise</ThemedText>
            <View style={styles.tagCloud}>
              {['Smart Integration', 'Emergency Repair', 'Premium Parts', 'Consultation'].map(tag => (
                <View key={tag} style={styles.tag}>
                  <ThemedText style={styles.tagText}>{tag}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Recent Reviews</ThemedText>
              <TouchableOpacity><ThemedText style={styles.seeAll}>VIEW ALL</ThemedText></TouchableOpacity>
            </View>
            {MOCK_REVIEWS.map(review => (
              <GlassCard key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <ThemedText style={styles.reviewerName}>{review.user}</ThemedText>
                  <ThemedText style={styles.reviewDate}>{review.date}</ThemedText>
                </View>
                <View style={styles.smallStarRow}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={10} color="#FFD700" fill={i <= review.rating ? "#FFD700" : "transparent"} />)}
                </View>
                <ThemedText style={styles.reviewText}>{review.comment}</ThemedText>
              </GlassCard>
            ))}
          </View>

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Sticky Footer Action */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <ThemedText style={styles.priceLabel}>Price starting at</ThemedText>
          <ThemedText style={styles.priceValue}>{price}</ThemedText>
        </View>
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.chatButton} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <MessageSquare color={Colors.dark.accent} size={24} />
          </TouchableOpacity>
          <PremiumButton 
            title={`Hire ${name?.toString().split(' ')[0]}`} 
            onPress={handleHire}
            style={styles.hireButton}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroContainer: {
    height: 400,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    backgroundColor: 'transparent',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
    letterSpacing: 1.5,
  },
  providerName: {
    fontSize: 32,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    letterSpacing: -1,
  },
  categoryText: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  content: {
    backgroundColor: '#000',
    marginTop: -30,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    marginBottom: Spacing.md,
  },
  bioText: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 24,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.1)',
  },
  tagText: {
    fontSize: 12,
    color: Colors.dark.accent,
    fontFamily: Typography.fonts.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAll: {
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
    letterSpacing: 1,
  },
  reviewCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  reviewDate: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  smallStarRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  reviewText: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 2,
    justifyContent: 'flex-end',
  },
  chatButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hireButton: {
    flex: 1,
    height: 50,
  },
});
