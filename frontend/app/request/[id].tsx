import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/shared/GlassCard';
import { Sparkles, CheckCircle2, Search, Brain, ShieldCheck, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface TraceStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'complete';
  icon: React.ReactNode;
}

export default function RequestStatusScreen() {
  const { id, query } = useLocalSearchParams();
  const router = useRouter();
  const [steps, setSteps] = useState<TraceStep[]>([
    { id: '1', label: 'Analyzing your request...', status: 'loading', icon: <Brain size={20} color={Colors.dark.accent} /> },
    { id: '2', label: 'Searching for local professionals...', status: 'pending', icon: <Search size={20} color={Colors.dark.tint} /> },
    { id: '3', label: 'Matching based on ratings & distance...', status: 'pending', icon: <ShieldCheck size={20} color="#10B981" /> },
    { id: '4', label: 'Finalizing provider selection...', status: 'pending', icon: <MapPin size={20} color="#F59E0B" /> },
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (currentStepIndex < steps.length) {
      const timer = setTimeout(() => {
        setSteps(prev => prev.map((step, idx) => {
          if (idx === currentStepIndex) return { ...step, status: 'complete' };
          if (idx === currentStepIndex + 1) return { ...step, status: 'loading' };
          return step;
        }));
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentStepIndex(prev => prev + 1);
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      // All steps complete - Show success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [currentStepIndex]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'AI Assistant', headerTransparent: true, headerTintColor: '#fff' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.sparkleContainer}>
            <Sparkles size={48} color={Colors.dark.accent} />
          </View>
          <ThemedText style={styles.title}>AI is working for you</ThemedText>
          <ThemedText style={styles.subtitle}>"{query}"</ThemedText>
        </View>

        <GlassCard style={styles.traceCard}>
          <ThemedText style={styles.traceHeader}>Processing Request</ThemedText>
          
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.iconContainer}>
                {step.status === 'complete' ? (
                  <CheckCircle2 size={24} color="#10B981" />
                ) : (
                  step.icon
                )}
              </View>
              
              <View style={styles.textContainer}>
                <ThemedText style={[
                  styles.stepLabel,
                  step.status === 'pending' && styles.pendingText,
                  step.status === 'complete' && styles.completeText
                ]}>
                  {step.label}
                </ThemedText>
                {step.status === 'loading' && (
                  <View style={styles.loadingBar}>
                    <Animated.View style={styles.loadingProgress} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </GlassCard>

        {currentStepIndex >= steps.length && (
          <TouchableOpacity 
            style={styles.resultsButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <ThemedText style={styles.buttonText}>View Best Match</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: 100,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  sparkleContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.dark.icon,
    fontFamily: Typography.fonts.medium,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  traceCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
  },
  traceHeader: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    marginBottom: Spacing.lg,
    color: Colors.dark.accent,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  stepLabel: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.medium,
  },
  pendingText: {
    opacity: 0.3,
  },
  completeText: {
    color: '#10B981',
  },
  loadingBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    width: '50%',
    backgroundColor: Colors.dark.accent,
    borderRadius: 2,
  },
  resultsButton: {
    backgroundColor: Colors.dark.tint,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  buttonText: {
    color: '#fff',
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.bold,
  },
});
