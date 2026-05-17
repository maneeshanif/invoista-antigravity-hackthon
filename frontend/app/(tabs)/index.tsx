import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, Platform, Dimensions, Alert, Modal, ActivityIndicator } from 'react-native';
import { useUser, useAuth } from '@clerk/expo';
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
  User,
  LogOut
} from 'lucide-react-native';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AIInput } from '@/components/home/AIInput';
import { ServiceCard } from '@/components/home/ServiceCard';
import { ActiveBookingCard } from '@/components/home/ActiveBookingCard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useApi } from '@/lib/useApi';
import type { Provider } from '@/lib/api';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { id: '1', label: 'Priority', icon: <Zap size={20} color="#00F3FF" />, desc: 'Urgent assistance' },
  { id: '2', label: 'Verified', icon: <ShieldCheck size={20} color="#00F3FF" />, desc: 'Top professionals' },
  { id: '3', label: 'Schedule', icon: <Clock size={20} color="#00F3FF" />, desc: 'Book for later' },
  { id: '4', label: 'Services', icon: <LayoutGrid size={20} color="#00F3FF" />, desc: 'Browse all' },
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
  const { signOut } = useAuth();
  const router = useRouter();
  const { listProviders, createRequest } = useApi();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Fetch real providers whenever category changes
  useEffect(() => {
    let cancelled = false;
    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        const data = await listProviders(
          selectedCategory !== 'all' ? { category: selectedCategory } : {}
        );
        if (!cancelled) setProviders(data);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load providers:', err);
        }
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    };
    fetchProviders();
    return () => { cancelled = true; };
  }, [selectedCategory]);

  const handleSignOutPress = () => {
    setShowLogoutModal(true);
  };

  const confirmSignOut = async () => {
    try {
      setShowLogoutModal(false);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleAIRequest = async (text: string) => {
    if (submittingRequest) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSubmittingRequest(true);
    try {
      const { session_id } = await createRequest({ message: text, user_id: user?.id });
      router.push({
        pathname: '/request/[id]',
        params: { id: session_id, query: text }
      });
    } catch (err) {
      Alert.alert('Error', 'Could not start request. Is the backend running?');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Premium';

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
              <TouchableOpacity onPress={handleSignOutPress} style={styles.avatarContainer}>
                {user?.imageUrl ? (
                  <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}><User size={20} color="#FFF" /></View>
                )}
              </TouchableOpacity>
              <View style={styles.welcomeText}>
                <ThemedText style={styles.greeting}>PRIVATE CONCIERGE</ThemedText>
                <ThemedText style={styles.userName}>{displayName} Member</ThemedText>
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
            <AIInput onSend={handleAIRequest} disabled={submittingRequest} />
            {submittingRequest && (
              <View style={styles.requestingOverlay}>
                <ActivityIndicator size="small" color="#00F3FF" />
                <ThemedText style={styles.requestingText}>Starting AI session…</ThemedText>
              </View>
            )}
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
              {loadingProviders ? (
                <ActivityIndicator size="small" color="#00F3FF" />
              ) : (
                <ThemedText style={styles.subtitleCount}>{providers.length} results</ThemedText>
              )}
            </View>
            
            {loadingProviders ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00F3FF" />
                <ThemedText style={styles.loadingText}>Finding professionals…</ThemedText>
              </View>
            ) : providers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>No professionals found in this category.</ThemedText>
              </View>
            ) : (
              providers.map(provider => (
                <ServiceCard
                  key={provider.id}
                  id={provider.id}
                  name={provider.name}
                  category={provider.category}
                  rating={provider.rating}
                  reviews={provider.jobs_completed}
                  price={provider.price_range}
                  distance={provider.area}
                  onBook={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.push({
                      pathname: '/provider/[id]',
                      params: {
                        id: provider.id,
                        name: provider.name,
                        category: provider.category,
                        rating: String(provider.rating),
                        reviews: String(provider.jobs_completed),
                        price: provider.price_range,
                        distance: provider.area,
                      }
                    });
                  }}
                  onView={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                />
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Premium Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <LogOut size={24} color="#FF4B4B" />
            </View>
            <ThemedText style={styles.modalTitle}>Sign Out</ThemedText>
            <ThemedText style={styles.modalMessage}>Are you sure you want to sign out of your account?</ThemedText>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowLogoutModal(false)}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSignOutButton} 
                onPress={confirmSignOut}
              >
                <ThemedText style={styles.modalSignOutText}>Sign Out</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  requestingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  requestingText: {
    fontSize: 12,
    color: '#00F3FF',
    fontFamily: Typography.fonts.medium,
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
  subtitleCount: {
    fontSize: 12,
    color: Colors.dark.icon,
    fontFamily: Typography.fonts.medium,
  },
  horizontalScroll: {
    gap: Spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: Typography.sizes.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1A1D24',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  modalMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontFamily: Typography.fonts.medium,
  },
  modalSignOutButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#FF4B4B',
    alignItems: 'center',
  },
  modalSignOutText: {
    color: '#FFFFFF',
    fontFamily: Typography.fonts.bold,
  },
});
