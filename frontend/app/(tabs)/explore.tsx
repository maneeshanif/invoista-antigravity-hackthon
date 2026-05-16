import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, LayoutGrid, Award, Star, Compass, ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/shared/GlassCard';
import { ServiceCard } from '@/components/home/ServiceCard';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const TRENDING_PROS = [
  {
    id: 't1',
    name: 'Smart Security Inc.',
    category: 'Security',
    rating: 4.98,
    reviews: 850,
    price: 'Rs. 3,500/hr',
    distance: '0.5 km',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?q=80&w=400',
  },
];

const CATEGORIES = [
  { id: 'Architecture', label: 'Design' },
  { id: 'Plumbing', label: 'Plumbing' },
  { id: 'Electric', label: 'Electric' },
  { id: 'HVAC', label: 'HVAC' },
  { id: 'Automation', label: 'Automation' },
  { id: 'Security', label: 'Security' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCategoryPress = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate back to Home with category filter (future enhancement)
    // For now, let's navigate to home
    router.replace('/(tabs)');
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/request/[id]',
        params: { id: 'search_' + Date.now(), query: searchQuery }
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Discovery</ThemedText>
            <View style={styles.searchContainer}>
              <Search size={18} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Search for a service or pro..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>
          </View>

          {/* Featured Collections */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Elite Collections</ThemedText>
              <Award size={18} color={Colors.dark.accent} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionsScroll}>
              {[
                { title: 'Elite Architects', count: '12 Pros' },
                { title: 'Smart Home Experts', count: '24 Pros' }
              ].map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  activeOpacity={0.9}
                  onPress={() => handleCategoryPress('Automation')}
                >
                  <GlassCard style={styles.collectionCard}>
                    <ThemedText style={styles.collectionTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.collectionCount}>{item.count}</ThemedText>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* All Categories Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Browse Categories</ThemedText>
              <LayoutGrid size={18} color={Colors.dark.accent} />
            </View>
            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={styles.gridItem}
                  onPress={() => handleCategoryPress(cat.id)}
                >
                  <GlassCard style={styles.gridCard}>
                    <ThemedText style={styles.gridLabel}>{cat.label}</ThemedText>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Trending Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Trending Professionals</ThemedText>
              <Star size={18} color={Colors.dark.accent} />
            </View>
            {TRENDING_PROS.map(pro => (
              <ServiceCard 
                key={pro.id} 
                {...pro} 
                onBook={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.push({
                    pathname: '/booking/[id]',
                    params: { id: pro.id, name: pro.name, price: pro.price }
                  });
                }}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
    paddingTop: 10,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#FFF',
    fontFamily: Typography.fonts.primary,
    fontSize: Typography.sizes.sm,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  collectionsScroll: {
    gap: Spacing.md,
  },
  collectionCard: {
    width: 200,
    height: 120,
    justifyContent: 'flex-end',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  collectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
  collectionCount: {
    fontSize: 10,
    color: Colors.dark.accent,
    fontFamily: Typography.fonts.bold,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gridItem: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
  },
  gridCard: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  gridLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
  },
});
