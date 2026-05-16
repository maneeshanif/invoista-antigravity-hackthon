import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, Platform, Dimensions } from 'react-native';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { 
  Bell, 
  Search, 
  Settings, 
  Zap, 
  ShieldCheck, 
  Clock, 
  LayoutGrid,
  ChevronRight,
  User
} from 'lucide-react-native';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AIInput } from '@/components/home/AIInput';
import { ServiceCard } from '@/components/home/ServiceCard';
import { ActiveBookingCard } from '@/components/home/ActiveBookingCard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { id: '1', label: 'Priority', icon: <Zap size={20} color="#00F3FF" />, desc: 'Urgent assistance' },
  { id: '2', label: 'Verified', icon: <ShieldCheck size={20} color="#00F3FF" />, desc: 'Top professionals' },
  { id: '3', label: 'Schedule', icon: <Clock size={20} color="#00F3FF" />, desc: 'Book for later' },
  { id: '4', label: 'Services', icon: <LayoutGrid size={20} color="#00F3FF" />, desc: 'Browse all' },
];

const MOCK_PROVIDERS = [
  {
    id: '1',
    name: 'Elite Solutions Group',
    category: 'Architecture',
    rating: 4.95,
    reviews: 420,
    price: 'Rs. 5,000/hr',
    distance: '0.8 km',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800',
  },
  {
    id: '2',
    name: 'Luxe Smart Systems',
    category: 'Automation',
    rating: 4.88,
    reviews: 156,
    price: 'Rs. 12,000/hr',
    distance: '2.1 km',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800',
  },
  {
    id: '3',
    name: 'Pro Plumbing Services',
    category: 'Plumbing',
    rating: 4.75,
    reviews: 98,
    price: 'Rs. 1,500/hr',
    distance: '1.5 km',
    image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=500',
  },
  {
    id: '4',
    name: 'Volt Masters',
    category: 'Electric',
    rating: 4.90,
    reviews: 215,
    price: 'Rs. 2,000/hr',
    distance: '3.2 km',
    image: 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=500',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'Plumbing', label: 'Plumbing' },
  { id: 'Electric', label: 'Electric' },
  { id: 'Architecture', label: 'Architecture' },
  { id: 'Automation', label: 'Automation' },
];

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredProviders = selectedCategory === 'all' 
    ? MOCK_PROVIDERS 
    : MOCK_PROVIDERS.filter(p => p.category === selectedCategory);

  const handleAIRequest = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/request/[id]',
      params: { id: 'req_' + Date.now(), query: text }
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          stickyHeaderIndices={[1]}
        >
          {/* Executive Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {user?.imageUrl ? (
                  <Image source={user.imageUrl} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}><User size={20} color="#FFF" /></View>
                )}
              </View>
              <View style={styles.welcomeText}>
                <ThemedText style={styles.greeting}>PRIVATE CONCIERGE</ThemedText>
                <ThemedText style={styles.userName}>{user?.firstName || 'Guest'} Member</ThemedText>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Bell size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Settings size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Search Bar - Floating Style */}
          <View style={styles.searchSection}>
            <AIInput onSend={handleAIRequest} />
          </View>

          {/* Active Bookings - Executive Horizontal Scroll */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Active Concierge</ThemedText>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              <ActiveBookingCard 
                service="Kitchen Pipe Leak"
                status="en-route"
                providerName="John Smith"
                timeEstimate="12 mins"
              />
              <ActiveBookingCard 
                service="AC Maintenance"
                status="finding"
                timeEstimate="Calculating..."
              />
            </ScrollView>
          </View>

          {/* Category Chips - Professional Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.categoryChip, selectedCategory === cat.id && styles.activeCategoryChip]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.id);
                }}
              >
                <ThemedText style={[styles.categoryLabel, selectedCategory === cat.id && styles.activeCategoryLabel]}>
                  {cat.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick Executive Actions */}
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity 
                key={action.id} 
                style={styles.actionCard}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              >
                <View style={styles.actionIcon}>{action.icon}</View>
                <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
                <ThemedText style={styles.actionDesc}>{action.desc}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Featured Professionals */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Available Professionals</ThemedText>
              <ThemedText style={styles.subtitleCount}>{filteredProviders.length} results</ThemedText>
            </View>
            
            {filteredProviders.map(provider => (
              <ServiceCard
                key={provider.id}
                {...provider}
                onBook={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.push({
                    pathname: '/booking/[id]',
                    params: { id: provider.id, name: provider.name, price: provider.price }
                  });
                }}
                onView={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    marginLeft: Spacing.sm,
  },
  greeting: {
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    color: Colors.dark.accent,
    letterSpacing: 2,
    opacity: 0.8,
  },
  userName: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.bold,
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchSection: {
    marginBottom: Spacing.xl,
    backgroundColor: '#000000',
    paddingVertical: Spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionCard: {
    width: (width - Spacing.md * 3) / 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bold,
    color: '#FFFFFF',
  },
  actionDesc: {
    fontSize: 10,
    color: Colors.dark.icon,
    marginTop: 2,
  },
  categoriesContainer: {
    marginBottom: Spacing.lg,
  },
  categoriesContent: {
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeCategoryChip: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: Typography.fonts.bold,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeCategoryLabel: {
    color: '#000000',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAll: {
    fontSize: 10,
    color: Colors.dark.accent,
    fontFamily: Typography.fonts.bold,
    letterSpacing: 1,
  },
});
