import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, Platform, Dimensions, Alert, Modal, ActivityIndicator, TextInput } from 'react-native';
import { useUser, useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { 
  Bell, 
  Settings, 
  User, 
  LogOut,
  Sparkles,
  CheckCircle2,
  Brain,
  Search,
  ShieldCheck,
  MapPin,
  AlertCircle,
  RefreshCw,
  Star,
  UserCheck,
  XCircle
} from 'lucide-react-native';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AIInput } from '@/components/home/AIInput';
import { GlassCard } from '@/components/shared/GlassCard';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useApi } from '@/lib/useApi';
import type { Session, TraceLog, Provider } from '@/lib/api';

const { width } = Dimensions.get('window');

// Icon mapping for agent names
function agentIcon(agentName: string, toolUsed: string | null) {
  const agent = agentName.toLowerCase();
  const tool = toolUsed?.toLowerCase() || '';
  
  if (agent.includes('intent')) return <Brain size={18} color={Colors.dark.accent} />;
  if (agent.includes('discover') || tool.includes('discovery') || tool.includes('find')) {
    return <Search size={18} color="#A78BFA" />;
  }
  if (agent.includes('rank') || agent.includes('match') || tool.includes('ranking') || tool.includes('match')) {
    return <ShieldCheck size={18} color="#10B981" />;
  }
  if (agent.includes('book') || tool.includes('booking')) {
    return <MapPin size={18} color="#F59E0B" />;
  }
  if (agent.includes('followup') || tool.includes('followup') || tool.includes('notification') || tool.includes('reminder')) {
    return <Bell size={18} color="#3B82F6" />;
  }
  return <Sparkles size={18} color={Colors.dark.accent} />;
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

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { createRequest, getSession, getSessionTrace, exportSessionTrace, getProvider, approveBooking, rejectBooking } = useApi();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Agent Session State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<Session['status'] | null>(null);
  const [hitlStatus, setHitlStatus] = useState<Session['hitl_status']>(null);
  const [providerSummary, setProviderSummary] = useState<Session['provider_summary']>(null);
  const [traces, setTraces] = useState<TraceLog[]>([]);
  const [bookingData, setBookingData] = useState<{ provider: Provider; bookingId: string } | null>(null);
  const [queryText, setQueryText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Polling hook for active session
  useEffect(() => {
    if (!activeSessionId) return;

    let cancelled = false;
    let activeElapsedMs = 0;
    let lastTickTime = Date.now();
    let isHitlPaused = false;
    const POLL_TIMEOUT_MS = 120_000;

    const poll = async () => {
      setPolling(true);
      setError(null);
      setTimedOut(false);
      
      while (!cancelled) {
        const now = Date.now();
        if (!isHitlPaused) {
          activeElapsedMs += now - lastTickTime;
        }
        lastTickTime = now;

        if (activeElapsedMs > POLL_TIMEOUT_MS) {
          if (!cancelled) setTimedOut(true);
          break;
        }

        try {
          const [session, traceLogs] = await Promise.all([
            getSession(activeSessionId),
            getSessionTrace(activeSessionId),
          ]);

          if (!cancelled) {
            setSessionStatus(session.status);
            setHitlStatus(session.hitl_status);
            setProviderSummary(session.provider_summary);
            setTraces(traceLogs);
          }

          // Pause the timeout clock while the user reviews the HITL approval card
          const isAwaitingDecision =
            session.status === 'pending_approval' ||
            session.hitl_status === 'pending_approval';
          isHitlPaused = isAwaitingDecision;

          if (session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled') {
            break;
          }
        } catch (err: any) {
          console.error('Inline polling error:', err);
          if (!cancelled) {
            if (err.message?.includes('404')) {
              setError('Session not found. It may have expired.');
              break;
            }
          }
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) {
        setPolling(false);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [activeSessionId]);

  // Hook to fetch provider / booking details when session completes successfully
  useEffect(() => {
    if (sessionStatus === 'completed' && activeSessionId) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const fetchBooking = async () => {
        try {
          const { traces: fullTraces } = await exportSessionTrace(activeSessionId) as any;
          const bookingTrace = fullTraces.find(
            (t: any) =>
              t.tool_used === 'create_booking' ||
              t.tool_used === 'run_booking' ||
              t.tool_used === 'create_booking_tool'
          );
          if (bookingTrace?.output_payload) {
            const { booking_id, provider_id } = bookingTrace.output_payload as any;
            const pId = provider_id || providerSummary?.provider_id;
            if (booking_id && pId) {
              const provider = await getProvider(pId);
              setBookingData({ provider, bookingId: booking_id });
            }
          }
        } catch (err) {
          console.error('Failed to load booking info:', err);
        }
      };
      
      fetchBooking();
    }
  }, [sessionStatus, activeSessionId]);

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
    if (submittingRequest || activeSessionId) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSubmittingRequest(true);
    setQueryText(text);
    setError(null);
    setTimedOut(false);
    setBookingData(null);
    setTraces([]);
    setSessionStatus('pending');
    setHitlStatus(null);
    setProviderSummary(null);
    setFeedback('');

    try {
      const { session_id } = await createRequest({ message: text, user_id: user?.id });
      setActiveSessionId(session_id);
    } catch (err) {
      console.error('Could not start request:', err);
      setError('Could not start request. Is the backend running?');
      setSessionStatus('failed');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleResetSession = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setActiveSessionId(null);
    setSessionStatus(null);
    setHitlStatus(null);
    setProviderSummary(null);
    setFeedback('');
    setTraces([]);
    setBookingData(null);
    setQueryText('');
    setError(null);
    setTimedOut(false);
  };

  const handleApprove = async () => {
    if (!activeSessionId) return;
    setDeciding(true);
    try {
      await approveBooking(activeSessionId);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setHitlStatus('approved');
      setSessionStatus('running');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve booking');
    } finally {
      setDeciding(false);
    }
  };

  const handleReject = async () => {
    if (!activeSessionId) return;
    setDeciding(true);
    try {
      await rejectBooking(activeSessionId, feedback.trim() || undefined);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      setHitlStatus('rejected');
      setSessionStatus('running');
      setFeedback('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reject booking');
    } finally {
      setDeciding(false);
    }
  };

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Premium';
  
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

  const isPendingApproval = hitlStatus === 'pending_approval' || sessionStatus === 'pending_approval';
  const isRunning = (sessionStatus === 'pending' || sessionStatus === 'running') && !isPendingApproval;
  const isFailed = sessionStatus === 'failed' || timedOut || !!error;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
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
              <TouchableOpacity style={styles.iconButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/modal'); }}>
                <Settings size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Search Bar - Floating Style */}
          <View style={styles.searchSection}>
            <AIInput onSend={handleAIRequest} disabled={submittingRequest || activeSessionId !== null} />
            {submittingRequest && (
              <View style={styles.requestingOverlay}>
                <ActivityIndicator size="small" color="#00F3FF" />
                <ThemedText style={styles.requestingText}>Starting AI session…</ThemedText>
              </View>
            )}
            {activeSessionId && !submittingRequest && (
              <View style={styles.requestingOverlay}>
                <ActivityIndicator size="small" color="#00F3FF" />
                <ThemedText style={styles.requestingText}>AI is coordinating service...</ThemedText>
              </View>
            )}
          </View>

          {/* Dynamic Inline Agent Logs Panel */}
          {activeSessionId && (
            <View style={styles.agentLogsSection}>
              {/* User Query Quote */}
              <GlassCard style={styles.queryQuoteCard}>
                <Sparkles size={16} color={Colors.dark.accent} />
                <ThemedText style={styles.queryQuoteText}>"{queryText}"</ThemedText>
              </GlassCard>

              {/* HITL Approval Card */}
              {isPendingApproval && providerSummary && (
                <GlassCard style={styles.approvalCard}>
                  <View style={styles.approvalHeader}>
                    <UserCheck size={22} color="#10B981" />
                    <ThemedText style={styles.approvalTitle}>Confirm Your Booking</ThemedText>
                  </View>

                  <View style={styles.providerInfoRow}>
                    <View style={styles.providerAvatar}>
                      <ThemedText style={styles.providerAvatarText}>
                        {(providerSummary.provider_name || 'P').charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.approvalProviderName}>
                        {providerSummary.provider_name || 'Selected Provider'}
                      </ThemedText>
                      <View style={styles.providerMeta}>
                        {providerSummary.provider_rating > 0 && (
                          <View style={styles.metaChip}>
                            <Star size={12} color="#F59E0B" />
                            <ThemedText style={styles.metaText}>{providerSummary.provider_rating}</ThemedText>
                          </View>
                        )}
                        {providerSummary.estimated_distance_km > 0 && (
                          <View style={styles.metaChip}>
                            <MapPin size={12} color="#A78BFA" />
                            <ThemedText style={styles.metaText}>{providerSummary.estimated_distance_km} km</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <ThemedText style={styles.approvalQuestion}>
                    Should we book this provider for you?
                  </ThemedText>

                  <TextInput
                    style={styles.feedbackInput}
                    placeholder="Or tell AI what else you need... (e.g. Find someone cheaper)"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={feedback}
                    onChangeText={setFeedback}
                    multiline
                  />

                  <View style={styles.approvalButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleReject} disabled={deciding}>
                      {deciding ? <ActivityIndicator size="small" color="#FF4B4B" /> : (
                        <ThemedText style={styles.cancelBtnText}>
                          {feedback.trim() ? 'Send to AI' : 'Cancel'}
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleApprove} disabled={deciding || feedback.trim().length > 0}>
                      {deciding ? <ActivityIndicator size="small" color="#000" /> : (
                        <ThemedText style={styles.confirmBtnText}>Confirm Booking</ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              )}

              {/* Cancelled State View */}
              {sessionStatus === 'cancelled' && (
                <GlassCard style={styles.cancelledCard}>
                  <XCircle size={24} color="#FF4B4B" style={{ marginBottom: Spacing.sm }} />
                  <ThemedText style={styles.cancelledTitle}>Booking Cancelled</ThemedText>
                  <ThemedText style={styles.cancelledText}>
                    The booking was cancelled at your request. You can start a new concierge request anytime.
                  </ThemedText>
                  <TouchableOpacity style={styles.resetButton} onPress={handleResetSession}>
                    <RefreshCw size={16} color="#000" />
                    <ThemedText style={styles.resetButtonText}>New Request</ThemedText>
                  </TouchableOpacity>
                </GlassCard>
              )}

              {/* Trace Stepper Card */}
              <GlassCard style={styles.traceCard}>
                <ThemedText style={styles.traceHeader}>
                  {traces.length > 0 ? 'Agent Progress Log' : 'Initializing Concierge agents...'}
                </ThemedText>

                {traces.length === 0 ? (
                  // Skeleton/Pending Steps
                  <>
                    {['Analyzing your request…', 'Searching for local professionals…', 'Matching based on ratings…', 'Finalizing selection…'].map((label, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View style={styles.stepBadgeColumn}>
                          <View style={styles.skeletonIcon} />
                          {idx < 3 && <View style={styles.stepperLinePending} />}
                        </View>
                        <View style={styles.textContainer}>
                          <ThemedText style={[styles.stepLabel, styles.pendingText]}>{label}</ThemedText>
                        </View>
                      </View>
                    ))}
                  </>
                ) : (
                  // Real-time Poll Steps
                  traces
                    .slice()
                    .sort((a, b) => a.step - b.step)
                    .map((trace, idx) => {
                      const isLast = idx === traces.length - 1;
                      return (
                        <View key={trace.id} style={styles.stepRow}>
                          <View style={styles.stepBadgeColumn}>
                            <View style={styles.stepBadgeContainer}>
                              {agentIcon(trace.agent_name, trace.tool_used)}
                            </View>
                            {!isLast && <View style={styles.stepperLine} />}
                          </View>

                          <View style={styles.textContainer}>
                            <View style={styles.stepHeaderRow}>
                              <ThemedText style={styles.stepLabel}>
                                {getFriendlyAgentNameForTrace(trace)}
                              </ThemedText>
                              <ThemedText style={styles.stepNumberText}>Step {trace.step}</ThemedText>
                            </View>

                            <ThemedText style={styles.toolText}>
                              🔧 {getFriendlyToolName(trace.tool_used)}
                            </ThemedText>

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
                      );
                    })
                )}

                {/* Loading Indicator for Next Step */}
                {isRunning && traces.length > 0 && (
                  <View style={styles.stepRow}>
                    <View style={styles.stepBadgeColumn}>
                      <View style={styles.stepBadgeContainerActive}>
                        <ActivityIndicator size="small" color={Colors.dark.accent} />
                      </View>
                    </View>
                    <View style={styles.textContainer}>
                      <ThemedText style={styles.stepLabelActive}>Running next agent…</ThemedText>
                      <View style={styles.loadingBar}>
                        <View style={styles.loadingProgress} />
                      </View>
                    </View>
                  </View>
                )}

                {/* Awaiting human approval step in timeline */}
                {isPendingApproval && (
                  <View style={styles.stepRow}>
                    <View style={styles.stepBadgeColumn}>
                      <View style={styles.stepBadgeContainerActive}>
                        <Brain size={16} color={Colors.dark.accent} />
                      </View>
                    </View>
                    <View style={styles.textContainer}>
                      <View style={styles.stepHeaderRow}>
                        <ThemedText style={styles.stepLabelActive}>Awaiting Approval</ThemedText>
                        <ThemedText style={styles.stepNumberText}>Step {traces.length + 1}</ThemedText>
                      </View>
                      <ThemedText style={styles.toolText}>🔧 run_booking (Human-in-the-Loop)</ThemedText>
                      <View style={styles.highlightSummary}>
                        <ThemedText style={styles.summaryTextHighlight}>
                          Concierge selected the perfect professional match. Please review the booking slot and confirm below.
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                )}
              </GlassCard>

              {/* Error State View */}
              {isFailed && (
                <GlassCard style={styles.errorCard}>
                  <AlertCircle size={24} color="#FF4B4B" />
                  <ThemedText style={styles.errorText}>
                    {getFailureReason()}
                  </ThemedText>
                  <TouchableOpacity style={styles.resetButton} onPress={handleResetSession}>
                    <RefreshCw size={16} color="#000" />
                    <ThemedText style={styles.resetButtonText}>Reset Console</ThemedText>
                  </TouchableOpacity>
                </GlassCard>
              )}

              {/* Resolution / Booking Card */}
              {sessionStatus === 'completed' && (
                <View style={styles.bookingResultContainer}>
                  {bookingData ? (
                    <GlassCard style={styles.providerCard}>
                      <CheckCircle2 size={32} color="#10B981" style={{ marginBottom: Spacing.sm }} />
                      <ThemedText style={styles.bookingSuccessTitle}>Booking Confirmed!</ThemedText>
                      
                      <ThemedText style={styles.providerName}>{bookingData.provider.name}</ThemedText>
                      <ThemedText style={styles.providerCategory}>{bookingData.provider.category}</ThemedText>
                      
                      <View style={styles.badgeRow}>
                        <View style={styles.ratingBadge}>
                          <ThemedText style={styles.ratingText}>★ {bookingData.provider.rating}</ThemedText>
                        </View>
                        <View style={styles.priceBadge}>
                          <ThemedText style={styles.priceText}>{bookingData.provider.price_range}</ThemedText>
                        </View>
                      </View>

                      <TouchableOpacity 
                        style={styles.viewBookingBtn}
                        onPress={() => router.push(`/booking/${bookingData.bookingId}`)}
                      >
                        <ThemedText style={styles.btnText}>View Booking Receipt</ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.resetConsoleLink}
                        onPress={handleResetSession}
                      >
                        <ThemedText style={styles.resetConsoleLinkText}>Start New Concierge Search</ThemedText>
                      </TouchableOpacity>
                    </GlassCard>
                  ) : (
                    <GlassCard style={styles.providerCard}>
                      <ActivityIndicator size="small" color={Colors.dark.accent} style={{ marginBottom: Spacing.sm }} />
                      <ThemedText style={styles.bookingSuccessTitle}>Finalizing Booking Details…</ThemedText>
                    </GlassCard>
                  )}
                </View>
              )}
            </View>
          )}

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
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: Spacing.md,
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
  
  // NEW TRACE PANEL STYLES
  agentLogsSection: {
    marginTop: Spacing.sm,
  },
  queryQuoteCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(0, 243, 255, 0.03)',
    borderColor: 'rgba(0, 243, 255, 0.1)',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  queryQuoteText: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
    fontFamily: Typography.fonts.medium,
    flex: 1,
  },
  traceCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: Spacing.md,
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
    gap: Spacing.md,
  },
  stepBadgeColumn: {
    width: 28,
    alignItems: 'center',
    position: 'relative',
  },
  stepBadgeContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.2)',
    zIndex: 2,
  },
  stepBadgeContainerActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    zIndex: 2,
  },
  stepperLine: {
    position: 'absolute',
    left: 13,
    top: 28,
    bottom: -32,
    width: 2,
    backgroundColor: '#00F3FF',
    opacity: 0.3,
    zIndex: 1,
  },
  stepperLinePending: {
    position: 'absolute',
    left: 13,
    top: 24,
    bottom: -36,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 1,
  },
  textContainer: {
    flex: 1,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.bold,
    color: '#FFFFFF',
  },
  stepLabelActive: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.medium,
    color: Colors.dark.accent,
  },
  stepNumberText: {
    fontSize: 10,
    color: Colors.dark.accent,
    fontFamily: Typography.fonts.bold,
    backgroundColor: 'rgba(0, 243, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  pendingText: {
    opacity: 0.3,
    fontFamily: Typography.fonts.medium,
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
    marginTop: 6,
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
    width: '100%',
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
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.accent,
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.1)',
  },
  summaryTextHighlight: {
    fontSize: 13,
    color: '#FFF',
    fontFamily: Typography.fonts.medium,
    lineHeight: 19,
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
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF4B4B',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  resetButtonText: {
    color: '#000',
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.sm,
  },
  
  // BOOKING RESOLUTION CARD STYLES
  bookingResultContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  providerCard: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
  },
  bookingSuccessTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#10B981',
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  ratingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontFamily: Typography.fonts.bold,
  },
  priceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  priceText: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: Typography.fonts.bold,
  },
  viewBookingBtn: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00F3FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#000000',
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.md,
  },
  resetConsoleLink: {
    marginTop: Spacing.lg,
    padding: Spacing.xs,
  },
  resetConsoleLinkText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textDecorationLine: 'underline',
    fontFamily: Typography.fonts.medium,
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

  // HITL Approval Card
  approvalCard: { 
    padding: Spacing.lg, 
    marginBottom: Spacing.lg, 
    borderRadius: Radius.xl, 
    borderColor: 'rgba(245, 158, 11, 0.3)', 
    borderWidth: 1, 
    backgroundColor: 'rgba(245, 158, 11, 0.05)' 
  },
  approvalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.sm, 
    marginBottom: Spacing.lg 
  },
  approvalTitle: { 
    fontSize: Typography.sizes.lg, 
    fontFamily: Typography.fonts.bold, 
    color: '#10B981' 
  },
  providerInfoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.md, 
    marginBottom: Spacing.lg 
  },
  providerAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: 'rgba(0, 243, 255, 0.15)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  providerAvatarText: { 
    fontSize: Typography.sizes.xl, 
    fontFamily: Typography.fonts.bold, 
    color: Colors.dark.accent 
  },
  approvalProviderName: { 
    fontSize: Typography.sizes.lg, 
    fontFamily: Typography.fonts.bold, 
    color: '#FFF' 
  },
  providerMeta: { 
    flexDirection: 'row', 
    gap: Spacing.sm, 
    marginTop: 4 
  },
  metaChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: Radius.sm, 
    paddingHorizontal: 8, 
    paddingVertical: 2 
  },
  metaText: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.7)', 
    fontFamily: Typography.fonts.medium 
  },
  approvalQuestion: { 
    fontSize: Typography.sizes.md, 
    color: 'rgba(255,255,255,0.7)', 
    fontFamily: Typography.fonts.medium, 
    textAlign: 'center', 
    marginBottom: Spacing.lg 
  },
  feedbackInput: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: Radius.md, 
    padding: Spacing.md, 
    color: '#FFF', 
    fontFamily: Typography.fonts.primary, 
    minHeight: 80, 
    textAlignVertical: 'top', 
    marginBottom: Spacing.lg, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  approvalButtons: { 
    flexDirection: 'row', 
    gap: Spacing.md 
  },
  cancelBtn: { 
    flex: 1, 
    paddingVertical: Spacing.sm + 4, 
    borderRadius: Radius.full, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 75, 75, 0.4)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cancelBtnText: { 
    color: '#FF4B4B', 
    fontFamily: Typography.fonts.bold, 
    fontSize: Typography.sizes.md 
  },
  confirmBtn: { 
    flex: 1.5, 
    paddingVertical: Spacing.sm + 4, 
    borderRadius: Radius.full, 
    backgroundColor: Colors.dark.accent, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  confirmBtnText: { 
    color: '#000', 
    fontFamily: Typography.fonts.bold, 
    fontSize: Typography.sizes.md 
  },

  // Cancelled state
  cancelledCard: { 
    padding: Spacing.lg, 
    marginBottom: Spacing.lg, 
    alignItems: 'center', 
    gap: Spacing.sm, 
    borderRadius: Radius.xl, 
    borderColor: 'rgba(255, 75, 75, 0.2)', 
    borderWidth: 1 
  },
  cancelledTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    color: '#FF4B4B',
  },
  cancelledText: { 
    color: 'rgba(255,255,255,0.7)', 
    textAlign: 'center', 
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.sm
  },
});
