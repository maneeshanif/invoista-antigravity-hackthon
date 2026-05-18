import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/shared/GlassCard';
import { Sparkles, CheckCircle2, Brain, Search, ShieldCheck, MapPin, AlertCircle, RefreshCw, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApi } from '@/lib/useApi';
import type { Session, TraceLog, Provider } from '@/lib/api';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

// Icon mapping for agent names
function agentIcon(agentName: string, toolUsed: string | null) {
  const agent = agentName.toLowerCase();
  const tool = toolUsed?.toLowerCase() || '';
  
  if (agent.includes('intent')) return <Brain size={20} color={Colors.dark.accent} />;
  if (agent.includes('discover') || tool.includes('discovery') || tool.includes('find')) {
    return <Search size={20} color="#A78BFA" />;
  }
  if (agent.includes('rank') || agent.includes('match') || tool.includes('ranking') || tool.includes('match')) {
    return <ShieldCheck size={20} color="#10B981" />;
  }
  if (agent.includes('book') || tool.includes('booking')) {
    return <MapPin size={20} color="#F59E0B" />;
  }
  if (agent.includes('followup') || tool.includes('followup') || tool.includes('notification') || tool.includes('reminder')) {
    return <Bell size={20} color="#3B82F6" />;
  }
  return <Sparkles size={20} color={Colors.dark.accent} />;
}

const getFriendlyAgentName = (rawName: string) => {
  const map: Record<string, string> = {
    Orchestrator: 'Main AI Coordinator',
    DiscoveryAgent: 'Discovery Specialist',
    RankingAgent: 'Matching Specialist',
    BookingAgent: 'Booking Coordinator',
  };
  return map[rawName] || rawName;
};

const getFriendlyAgentNameForTrace = (trace: TraceLog) => {
  const tool = trace.tool_used?.toLowerCase() || '';
  if (tool.includes('discovery') || tool.includes('find_providers')) {
    return 'Discovery Specialist';
  }
  if (tool.includes('ranking') || tool.includes('rank_providers')) {
    return 'Matching Specialist';
  }
  if (tool.includes('booking') || tool.includes('create_booking')) {
    return 'Booking Coordinator';
  }
  if (tool.includes('followup') || tool.includes('schedule_followup')) {
    return 'Notification Coordinator';
  }
  return getFriendlyAgentName(trace.agent_name);
};

const getFriendlyToolName = (toolName: string | null) => {
  if (!toolName) return 'Finalizing response...';
  const name = toolName.toLowerCase();
  
  if (name.includes('run_discovery') || name.includes('find_providers')) {
    return 'Searching for qualified professionals in your area...';
  }
  if (name.includes('run_ranking') || name.includes('rank_providers')) {
    return 'Evaluating and matching the best professionals for you...';
  }
  if (name.includes('run_booking') || name.includes('create_booking')) {
    return 'Securing your booking slot...';
  }
  if (name.includes('run_followup') || name.includes('schedule_followup')) {
    return 'Setting up follow-up reminders and quality check...';
  }
  if (name.includes('call_agent')) {
    return 'Consulting with sub-specialist...';
  }
  if (name.includes('llm_call')) {
    return 'Formulating final advice and booking details...';
  }
  
  return `Coordinating step: ${toolName}`;
};

export default function RequestStatusScreen() {
  const { id: sessionId, query } = useLocalSearchParams<{ id: string; query: string }>();
  const router = useRouter();
  const { getSession, getSessionTrace, exportSessionTrace, getProvider } = useApi();

  const [sessionStatus, setSessionStatus] = useState<Session['status']>('pending');
  const [traces, setTraces] = useState<TraceLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    const poll = async () => {
      while (!cancelled) {
        // Timeout guard
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          if (!cancelled) setTimedOut(true);
          break;
        }

        try {
          const [session, traceLogs] = await Promise.all([
            getSession(sessionId),
            getSessionTrace(sessionId),
          ]);

          if (!cancelled) {
            setSessionStatus(session.status);
            setTraces(traceLogs);
          }

          if (session.status === 'completed' || session.status === 'failed') {
            break;
          }
        } catch (e: any) {
          console.error('Polling error:', e);
          if (!cancelled) {
            if (e.message?.includes('404')) {
              setError('Session not found. It may have expired.');
              break;
            }
            // Network error — keep polling but mark degraded
          }
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  const [bookingData, setBookingData] = useState<{ provider: Provider, bookingId: string } | null>(null);

  // Fetch the booking details when completed
  useEffect(() => {
    if (sessionStatus === 'completed') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const fetchBooking = async () => {
        try {
          const { traces } = await exportSessionTrace(sessionId) as any;
          const bookingTrace = traces.find((t: any) => t.tool_used === 'create_booking');
          if (bookingTrace?.output_payload) {
             const { booking_id, provider_id } = bookingTrace.output_payload as any;
             const provider = await getProvider(provider_id);
             setBookingData({ provider, bookingId: booking_id });
          }
        } catch (err) {
          console.error("Failed to load booking info:", err);
        }
      };
      fetchBooking();
    }
  }, [sessionStatus]);

  const getFailureReason = () => {
    if (error) return error;
    if (timedOut) return 'The AI took too long. Please try again.';
    
    // Look for the final runner agent trace for Orchestrator
    const finalOrchTrace = traces.find(t => t.agent_name === 'Runner' && t.tool_used?.toLowerCase() === 'agent_orchestrator');
    if (finalOrchTrace?.output_summary) {
      return finalOrchTrace.output_summary;
    }
    return 'The AI could not process your request. Please try a different service or area.';
  };

  const isRunning = sessionStatus === 'pending' || sessionStatus === 'running';
  const isFailed = sessionStatus === 'failed' || timedOut || !!error;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'AI Assistant', headerTransparent: true, headerTintColor: '#fff' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.sparkleContainer, isFailed && styles.sparkleError]}>
            {isFailed
              ? <AlertCircle size={48} color="#FF4B4B" />
              : <Sparkles size={48} color={Colors.dark.accent} />
            }
          </View>
          <ThemedText style={styles.title}>
            {isFailed ? 'Request Failed' : 'AI is working for you'}
          </ThemedText>
          <ThemedText style={styles.subtitle}>"{query}"</ThemedText>
          {isRunning && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={Colors.dark.accent} />
              <ThemedText style={styles.statusText}>
                {sessionStatus === 'pending' ? 'Initializing agents…' : 'Processing with AI…'}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Error / Timeout State */}
        {isFailed && (
          <GlassCard style={styles.errorCard}>
            <AlertCircle size={20} color="#FF4B4B" />
            <ThemedText style={styles.errorText}>
              {getFailureReason()}
            </ThemedText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <RefreshCw size={16} color="#000" />
              <ThemedText style={styles.retryText}>Try Again</ThemedText>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Trace Steps */}
        <GlassCard style={styles.traceCard}>
          <ThemedText style={styles.traceHeader}>
            {traces.length > 0 ? 'Agent Steps' : 'Processing Request'}
          </ThemedText>

          {traces.length === 0 ? (
            // Skeleton/waiting state
            <>
              {['Analyzing your request…', 'Searching for local professionals…', 'Matching based on ratings…', 'Finalizing selection…'].map((label, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.iconContainer}>
                    <View style={styles.skeletonIcon} />
                  </View>
                  <View style={styles.textContainer}>
                    <ThemedText style={[styles.stepLabel, styles.pendingText]}>{label}</ThemedText>
                  </View>
                </View>
              ))}
            </>
          ) : (
            traces
              .slice()
              .sort((a, b) => a.step - b.step)
              .map((trace) => (
                <View key={trace.id} style={styles.stepRow}>
                  {/* Step badge */}
                  <View style={styles.stepBadge}>
                    <ThemedText style={styles.stepBadgeText}>{trace.step}</ThemedText>
                  </View>

                  <View style={styles.iconContainer}>
                    {agentIcon(trace.agent_name, trace.tool_used)}
                  </View>

                  <View style={styles.textContainer}>
                    <ThemedText style={[styles.stepLabel, styles.completeText]}>
                      {getFriendlyAgentNameForTrace(trace)}
                    </ThemedText>
                    <ThemedText style={styles.toolText}>🔧 {getFriendlyToolName(trace.tool_used)}</ThemedText>
                    {trace.output_summary && (
                      <View style={!trace.tool_used ? styles.highlightSummary : undefined}>
                        <ThemedText style={!trace.tool_used ? styles.summaryTextHighlight : styles.summaryText}>
                          {trace.output_summary}
                        </ThemedText>
                      </View>
                    )}
                    {trace.duration_ms != null && (
                      <View style={styles.durationChip}>
                        <ThemedText style={styles.durationText}>{trace.duration_ms}ms</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              ))
          )}

          {/* In-progress indicator */}
          {isRunning && traces.length > 0 && (
            <View style={styles.stepRow}>
              <View style={styles.iconContainer}>
                <ActivityIndicator size="small" color={Colors.dark.accent} />
              </View>
              <View style={styles.textContainer}>
                <ThemedText style={styles.stepLabel}>Running next agent…</ThemedText>
                <View style={styles.loadingBar}>
                  <View style={styles.loadingProgress} />
                </View>
              </View>
            </View>
          )}
        </GlassCard>

        {sessionStatus === 'completed' && bookingData && (
          <View style={styles.bookingResultContainer}>
            <ThemedText style={styles.traceHeader}>Successfully Booked!</ThemedText>
            <GlassCard style={styles.providerCard}>
              <ThemedText style={styles.providerName}>{bookingData.provider.name}</ThemedText>
              <ThemedText style={styles.providerCategory}>{bookingData.provider.category}</ThemedText>
              
              <TouchableOpacity 
                 style={styles.viewBookingBtn}
                 onPress={() => router.push(`/booking/${bookingData.bookingId}`)}
              >
                <ThemedText style={styles.btnText}>View Booking Receipt</ThemedText>
              </TouchableOpacity>
            </GlassCard>
          </View>
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
    paddingBottom: 40,
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
  sparkleError: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.accent,
    fontFamily: Typography.fonts.medium,
  },
  errorCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    borderColor: 'rgba(255, 75, 75, 0.2)',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF4B4B',
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF4B4B',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  retryText: {
    color: '#000',
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.sm,
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
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 243, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 10,
    color: Colors.dark.accent,
    fontFamily: Typography.fonts.bold,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  textContainer: {
    flex: 1,
  },
  stepLabel: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.medium,
    color: '#FFFFFF',
  },
  pendingText: {
    opacity: 0.3,
  },
  completeText: {
    color: '#10B981',
    fontFamily: Typography.fonts.bold,
  },
  toolText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    fontFamily: Typography.fonts.medium,
  },
  summaryText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    lineHeight: 18,
  },
  durationChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 243, 255, 0.08)',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  durationText: {
    fontSize: 10,
    color: Colors.dark.accent,
    fontFamily: Typography.fonts.bold,
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
    width: '60%',
    backgroundColor: Colors.dark.accent,
    borderRadius: 2,
  },
  highlightSummary: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.accent,
  },
  summaryTextHighlight: {
    fontSize: 14,
    color: '#FFF',
    fontFamily: Typography.fonts.medium,
    lineHeight: 20,
  },
  bookingResultContainer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  providerCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  providerName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FFF',
    marginBottom: 4,
  },
  providerCategory: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.medium,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: Spacing.lg,
  },
  viewBookingBtn: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#000',
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.md,
  },
});
