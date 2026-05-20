import React, { useEffect } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing, SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { PhoneOff, Mic, MicOff, Info, Search, Calendar, Mail, Sparkles, Check, X } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import Toast from 'react-native-toast-message';

export interface ActiveToolCall {
  id: string;
  name: string;
  status: 'loading' | 'success' | 'error';
  timestamp: number;
}

interface VoiceCallModalProps {
  visible: boolean;
  callState: 'idle' | 'connecting' | 'connected' | 'ended' | 'error';
  isMuted: boolean;
  toggleMute: () => void;
  endCall: () => void;
  errorMessage: string | null;
  activeTools: ActiveToolCall[];
}

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Cap visualizer size so it looks beautiful on all platforms and doesn't push components offscreen
const VISUALIZER_SIZE = Math.min(width * 0.6, isWeb ? 180 : 240);

const TOOL_MAPPINGS: Record<string, { icon: React.ReactNode; loadingText: string; successText: string }> = {
  find_providers: {
    icon: <Search size={12} color="#00F3FF" />,
    loadingText: 'Scanning for available providers near you...',
    successText: 'Discovered matching service professionals!',
  },
  create_booking: {
    icon: <Calendar size={12} color="#A78BFA" />,
    loadingText: 'Securing your booking details...',
    successText: 'Successfully confirmed appointment slot!',
  },
  send_email: {
    icon: <Mail size={12} color="#3B82F6" />,
    loadingText: 'Dispatching confirmation emails...',
    successText: 'Sent confirmation emails to you and provider!',
  },
  default: {
    icon: <Sparkles size={12} color="#10B981" />,
    loadingText: 'Processing requested action...',
    successText: 'Successfully completed action!',
  }
};

function getToolDetails(rawName: string) {
  const normalized = rawName.toLowerCase().replace('_tool', '');
  if (normalized.includes('find_provider') || normalized.includes('findprovider') || normalized.includes('discover')) {
    return TOOL_MAPPINGS.find_providers;
  }
  if (normalized.includes('create_booking') || normalized.includes('createbooking') || normalized.includes('book')) {
    return TOOL_MAPPINGS.create_booking;
  }
  if (normalized.includes('email') || normalized.includes('mail') || normalized.includes('notify')) {
    return TOOL_MAPPINGS.send_email;
  }
  return TOOL_MAPPINGS.default;
}

export function VoiceCallModal({
  visible,
  callState,
  isMuted,
  toggleMute,
  endCall,
  errorMessage,
  activeTools,
}: VoiceCallModalProps) {
  // Shared values for the luxury voice breathing waves
  const wave1 = useSharedValue(1);
  const wave2 = useSharedValue(1);
  const wave3 = useSharedValue(1);

  useEffect(() => {
    if (callState === 'connected' || callState === 'connecting') {
      // Loop wave animations with offset timings for breathing organic effects
      wave1.value = withRepeat(
        withTiming(2.0, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      wave2.value = withRepeat(
        withDelay(600, withTiming(1.7, { duration: 2200, easing: Easing.out(Easing.ease) })),
        -1,
        false
      );
      wave3.value = withRepeat(
        withDelay(1200, withTiming(1.4, { duration: 2500, easing: Easing.out(Easing.ease) })),
        -1,
        false
      );
    } else {
      wave1.value = withTiming(1);
      wave2.value = withTiming(1);
      wave3.value = withTiming(1);
    }
  }, [callState]);

  const animatedWave1 = useAnimatedStyle(() => ({
    transform: [{ scale: wave1.value }],
    opacity: withTiming(callState === 'connected' ? 0.35 - (wave1.value - 1) * 0.25 : 0.15),
  }));

  const animatedWave2 = useAnimatedStyle(() => ({
    transform: [{ scale: wave2.value }],
    opacity: withTiming(callState === 'connected' ? 0.25 - (wave2.value - 1) * 0.2 : 0.1),
  }));

  const animatedWave3 = useAnimatedStyle(() => ({
    transform: [{ scale: wave3.value }],
    opacity: withTiming(callState === 'connected' ? 0.15 - (wave3.value - 1) * 0.15 : 0.05),
  }));

  const getStatusText = () => {
    switch (callState) {
      case 'connecting':
        return 'Connecting to Concierge...';
      case 'connected':
        return 'Connected & Listening';
      case 'ended':
        return 'Call Finished';
      case 'error':
        return 'Connection Failed';
      default:
        return 'Initializing...';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={90} tint="dark" style={styles.container}>
        <View style={styles.innerContent}>
          {/* Header Identity */}
          <View style={styles.header}>
            <ThemedText style={styles.brandTitle}>PRIVATE CONCIERGE</ThemedText>
            <ThemedText style={styles.statusSubText}>{getStatusText()}</ThemedText>
          </View>

          {/* Central Pulsing Calling Node */}
          <View style={styles.visualizerContainer}>
            {/* Pulsing Breathing Background Waves */}
            {(callState === 'connecting' || callState === 'connected') && (
              <>
                <Animated.View style={[styles.pulseWave, styles.gradientWave1, animatedWave1]} />
                <Animated.View style={[styles.pulseWave, styles.gradientWave2, animatedWave2]} />
                <Animated.View style={[styles.pulseWave, styles.gradientWave3, animatedWave3]} />
              </>
            )}

            {/* Glowing Core Sphere */}
            <View style={[styles.coreSphere, callState === 'error' && styles.errorSphere]}>
              <Mic size={32} color={callState === 'error' ? '#FF4B4B' : '#00F3FF'} />
            </View>
          </View>

          {/* Real-time VAPI MCP Tool Execution Traces Panel */}
          {callState === 'connected' && activeTools.length > 0 && (
            <Animated.View 
              entering={SlideInDown.springify()} 
              exiting={SlideOutUp.springify()}
            >
              <BlurView intensity={30} tint="dark" style={styles.tracePanelBlur}>
                <View style={styles.traceHeaderRow}>
                  <Sparkles size={14} color="#00F3FF" />
                  <ThemedText style={styles.tracePanelTitle}>AGENT THOUGHT PROCESS</ThemedText>
                </View>
                {activeTools.slice(-3).map((tool) => {
                  const details = getToolDetails(tool.name);
                  const isSuccess = tool.status === 'success';
                  const isError = tool.status === 'error';
                  const isLoading = tool.status === 'loading';

                  return (
                    <View key={tool.id} style={styles.toolTraceRow}>
                      <View style={[
                        styles.toolIconContainer, 
                        isSuccess && styles.toolIconSuccess,
                        isError && styles.toolIconError
                      ]}>
                        {isSuccess ? (
                          <Check size={10} color="#10B981" />
                        ) : isError ? (
                          <X size={10} color="#FF4B4B" />
                        ) : (
                          details.icon
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.toolText}>
                          {isSuccess ? details.successText : details.loadingText}
                        </ThemedText>
                      </View>
                      {isLoading && (
                        <ActivityIndicator size="small" color="#00F3FF" style={{ marginLeft: Spacing.sm }} />
                      )}
                    </View>
                  );
                })}
              </BlurView>
            </Animated.View>
          )}

          {/* Error Message Details */}
          {callState === 'error' && errorMessage && (
            <View style={styles.errorDetailsCard}>
              <Info size={16} color="#FF4B4B" />
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            </View>
          )}

          {/* Interactive Calling Panel Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.controlsRow}>
              {/* Mute Control */}
              <TouchableOpacity 
                style={[styles.controlBtn, isMuted && styles.controlBtnActive]} 
                onPress={toggleMute}
                disabled={callState === 'ended' || callState === 'error'}
              >
                {isMuted ? (
                  <MicOff size={22} color="#FFFFFF" />
                ) : (
                  <Mic size={22} color="rgba(255,255,255,0.7)" />
                )}
              </TouchableOpacity>

              {/* Solid Terminate Call Control */}
              <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
                <PhoneOff size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Global Toast component mounted inside Vapi Modal to render on topmost layer */}
        <Toast />
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 80,
    paddingHorizontal: Spacing.xl,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00F3FF',
    letterSpacing: 3,
  },
  statusSubText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: Spacing.xs,
  },
  visualizerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: VISUALIZER_SIZE,
    height: VISUALIZER_SIZE,
    marginVertical: Spacing.md,
  },
  pulseWave: {
    position: 'absolute',
    width: VISUALIZER_SIZE * 0.8,
    height: VISUALIZER_SIZE * 0.8,
    borderRadius: (VISUALIZER_SIZE * 0.8) / 2,
    borderWidth: 1,
  },
  gradientWave1: {
    borderColor: '#00F3FF',
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
  },
  gradientWave2: {
    borderColor: '#A78BFA',
    backgroundColor: 'rgba(167, 139, 250, 0.03)',
  },
  gradientWave3: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.02)',
  },
  coreSphere: {
    width: VISUALIZER_SIZE * 0.8,
    height: VISUALIZER_SIZE * 0.8,
    borderRadius: (VISUALIZER_SIZE * 0.8) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F3FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  errorSphere: {
    borderColor: 'rgba(255, 75, 75, 0.3)',
    shadowColor: '#FF4B4B',
  },
  tracePanel: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginVertical: Spacing.md,
  },
  tracePanelBlur: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  traceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tracePanelTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00F3FF',
    letterSpacing: 1.5,
  },
  toolTraceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  toolIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  toolIconSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  toolIconError: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderColor: 'rgba(255, 75, 75, 0.25)',
  },
  toolText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  errorDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255, 75, 75, 0.05)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.15)',
    maxWidth: '90%',
  },
  errorText: {
    fontSize: 13,
    color: '#FF4B4B',
    fontWeight: '500',
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255, 75, 75, 0.2)',
    borderColor: 'rgba(255, 75, 75, 0.4)',
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF4B4B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 20,
  },
});
