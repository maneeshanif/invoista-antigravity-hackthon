import { useState, useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Vapi from '@vapi-ai/react-native';
import * as Haptics from 'expo-haptics';
import type { VapiCallHook, ActiveToolCall } from './useVapi';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@clerk/clerk-expo';
import { useCallback } from 'react';
const VAPI_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPI_API_KEY || 'your-public-key';
const VAPI_ASSISTANT_ID = process.env.EXPO_PUBLIC_VAPI_ASSISTANT_ID || 'your-assistant-id';

// Module-level Vapi singleton instance to prevent multiple client creations on native
let vapiInstance: Vapi | null = null;

function getVapiInstance(): Vapi {
  if (!vapiInstance) {
    console.log('[useVapi Native] Initializing global Vapi instance with key:', VAPI_PUBLIC_KEY);
    vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
  }
  return vapiInstance;
}

export default function useVapi(): VapiCallHook {
  const { getToken } = useAuth(); // Hook must be called at top level
  const retryLimit = 3;
  const retryDelayMs = 2000;
  const [retryCount, setRetryCount] = useState(0);
  const lastCallParams = useRef<{ userId?: string; sessionId?: string }>({});

  const [isCalling, setIsCalling] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'connected' | 'ended' | 'error' | 'reconnecting'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTools, setActiveTools] = useState<ActiveToolCall[]>([]);
  
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    const vapi = getVapiInstance();
    vapiRef.current = vapi;

    const onCallStart = () => {
      console.log('[useVapi Native] Call started successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCallState('connected');
    };

    const onDisconnect = () => {
       console.warn('[useVapi Native] Unexpected disconnect');
       setCallState('reconnecting');
       if (retryCount < retryLimit) {
         setTimeout(() => {
           setRetryCount((c) => c + 1);
           const { userId, sessionId } = lastCallParams.current;
           startCall(userId, sessionId);
         }, retryDelayMs);
       } else {
         setErrorMessage('Connection lost. Please try again later.');
         setCallState('error');
       }
     };

    const onCallEnd = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setCallState('ended');
      setIsCalling(false);
      setTimeout(() => setCallState('idle'), 1500);
    };

    const onError = (err: any) => {
      console.error('Vapi active error:', err);
      setErrorMessage(err.message || 'An error occurred during the call');
      setCallState('error');
      setIsCalling(false);
    };

    const onMessage = (message: any) => {
      console.log('[useVapi Native] Message event:', message);
      if (!message || !message.type) return;

      if (message.type === 'tool-calls' || message.type === 'function-call') {
        const calls = message.toolCalls || (message.functionCall ? [message.functionCall] : []);
        setActiveTools((prev) => {
          const next = [...prev];
          calls.forEach((call: any) => {
            const existsIdx = next.findIndex((t) => t.id === call.id);
            const toolCall: ActiveToolCall = {
              id: call.id || String(Date.now()),
              name: call.function?.name || call.name || '',
              status: 'loading' as const,
              timestamp: Date.now(),
            };
            if (existsIdx >= 0) {
              next[existsIdx] = toolCall;
            } else {
              next.push(toolCall);
            }
          });
          return next;
        });
      } else if (message.type === 'tool-call-result' || message.type === 'function-call-result') {
        const results = message.toolCallResults || (message.result ? [message] : []);
        setActiveTools((prev) => {
          return prev.map((tool) => {
            const matchingResult = results.find((r: any) => r.toolCallId === tool.id || r.id === tool.id || r.toolCallId === tool.name);
            if (matchingResult) {
              const isError = !!matchingResult.error;
              setTimeout(() => {
                setActiveTools((current) => current.filter((t) => t.id !== tool.id));
              }, 3000);
              return {
                ...tool,
                status: isError ? ('error' as const) : ('success' as const),
              };
            }
            return tool;
          });
        });
      }
    };

    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('error', onError);
    vapi.on('message', onMessage);
    vapi.on('disconnect', onDisconnect);

    return () => {
      vapi.off('call-start', onCallStart);
      vapi.off('call-end', onCallEnd);
      vapi.off('error', onError);
      vapi.off('message', onMessage);
      vapi.off('disconnect', onDisconnect);
      
      try {
        vapi.stop();
      } catch (e) {
        // Safe clean up
      }
    };
  }, []);

  const startCall = useCallback(async (userId?: string, sessionId?: string) => {
    const vapi = vapiRef.current || getVapiInstance();
    vapiRef.current = vapi;

    // Guard against concurrent starts
    if (isCalling) return;

    // Reset retry count on fresh start
    setRetryCount(0);

    // Generate a session ID if not provided or placeholder
    const generatedSessionId = sessionId && !sessionId.includes('{{') ? sessionId : uuidv4();
    lastCallParams.current = { userId, sessionId: generatedSessionId };

    // Fetch Clerk JWT token (hook already called at top level)
    let token: string | undefined;
    try {
      token = await getToken({ template: 'vapi' });
    } catch (e) {
      // ignore if not available
    }

    setErrorMessage(null);
    setCallState('connecting');
    setIsCalling(true);
    setActiveTools([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Android permission omitted for brevity (same as before)
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Private Concierge needs microphone access to connect you with the voice agent.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[useVapi Native] Microphone permission denied');
          setErrorMessage('Microphone permission is required to start a call.');
          setCallState('error');
          setIsCalling(false);
          return;
        }
      } catch (err: any) {
        console.error('Error requesting mic permission:', err);
      }
    }

    console.log('[useVapi Native] Starting call to Assistant ID:', VAPI_ASSISTANT_ID, 'with userId:', userId, 'sessionId:', generatedSessionId);
    try {
      const overrides: any = { variableValues: {} };
      if (userId) overrides.variableValues.user_id = userId;
      overrides.variableValues.session_id = generatedSessionId;
      if (token) overrides.variableValues.token = token;
      await vapi.start(VAPI_ASSISTANT_ID, overrides);
    } catch (err: any) {
      console.error('Failed to initiate Vapi call:', err);
      setErrorMessage(err.message || 'Failed to start call');
      setCallState('error');
      setIsCalling(false);
    }
    // Duplicate startCall block removed
  }, [getToken]);
  const endCall = useCallback(() => {
    const vapi = vapiRef.current || getVapiInstance();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    vapi.stop();
    setCallState('ended');
    setIsCalling(false);
  }, []);

  const toggleMute = useCallback(() => {
    const vapi = vapiRef.current || getVapiInstance();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextMuted = !isMuted;
    vapi.setMuted(nextMuted);
    setIsMuted(nextMuted);
  }, [isMuted]);

  return {
    isCalling,
    callState,
    startCall,
    endCall,
    isMuted,
    toggleMute,
    errorMessage,
    activeTools,
    retryCount,
  };
}

