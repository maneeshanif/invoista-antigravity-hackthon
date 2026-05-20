import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import type { VapiCallHook, ActiveToolCall } from './useVapi';
import { useAuth } from '@clerk/expo';

const VAPI_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPI_API_KEY || 'your-public-key';
const VAPI_ASSISTANT_ID = process.env.EXPO_PUBLIC_VAPI_ASSISTANT_ID || 'your-assistant-id';

// Module-level Vapi singleton instance to prevent multiple client creations,
// which causes duplicate Daily/KrispSDK frame instances and call-ejection issues on web.
let vapiInstance: Vapi | null = null;

function getVapiInstance(): Vapi | null {
  if (typeof window === 'undefined') return null;
  if (!vapiInstance) {
    console.log('[useVapi Web] Initializing global Vapi instance with key:', VAPI_PUBLIC_KEY);
    vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
  }
  return vapiInstance;
}

export default function useVapi(): VapiCallHook {
  const { getToken } = useAuth();
  const [isCalling, setIsCalling] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'connected' | 'ended' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTools, setActiveTools] = useState<ActiveToolCall[]>([]);

  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    const vapi = getVapiInstance();
    if (!vapi) return;

    vapiRef.current = vapi;

    const onCallStart = () => {
      console.log('[useVapi Web] Call started successfully');
      setCallState('connected');
    };

    const onCallEnd = () => {
      console.log('[useVapi Web] Call ended');
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
      console.log('[useVapi Web] Message event:', message);
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

    return () => {
      vapi.off('call-start', onCallStart);
      vapi.off('call-end', onCallEnd);
      vapi.off('error', onError);
      vapi.off('message', onMessage);

      try {
        vapi.stop();
      } catch (e) {
        // Safe clean up
      }
    };
  }, []);

  const startCall = async (userId?: string, sessionId?: string) => {
    const vapi = vapiRef.current || getVapiInstance();
    if (!vapi) return;
    vapiRef.current = vapi;

    setErrorMessage(null);
    setCallState('connecting');
    setIsCalling(true);
    setActiveTools([]);

    // Web-specific: Request permission with voice-optimized WebRTC constraints
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        console.log('[useVapi Web] Requesting microphone access with constraints...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });

        // Wake up browser AudioContext if suspended
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const tempCtx = new AudioContextClass();
          if (tempCtx.state === 'suspended') {
            await tempCtx.resume();
            console.log('[useVapi Web] Browser AudioContext woke up successfully');
          }
          await tempCtx.close();
        }

        // Immediately release the tracks so Vapi can bind to the device cleanly
        stream.getTracks().forEach((track) => track.stop());
        console.log('[useVapi Web] Microphone access and audio context ready.');
      } catch (err: any) {
        console.error('[useVapi Web] Microphone access denied or failed:', err);
        setErrorMessage('Microphone access is required to talk to the AI Concierge.');
        setCallState('error');
        setIsCalling(false);
        return;
      }
    }

    // Fetch Clerk JWT token
    let token: string | undefined;
    try {
      token = await getToken({ template: 'vapi' });
    } catch (e) {
      // ignore if not available
    }

    console.log('[useVapi Web] Starting call to Assistant ID:', VAPI_ASSISTANT_ID, 'with userId:', userId, 'sessionId:', sessionId, 'hasToken:', !!token);
    try {
      const overrides: any = { variableValues: {} };
      if (userId) overrides.variableValues.user_id = userId;
      if (sessionId) overrides.variableValues.session_id = sessionId;
      if (token) overrides.variableValues.token = token;
      await vapi.start(VAPI_ASSISTANT_ID, overrides);
    } catch (err: any) {
      console.error('Failed to initiate Vapi call:', err);
      setErrorMessage(err.message || 'Failed to start call');
      setCallState('error');
      setIsCalling(false);
    }
  };

  const endCall = () => {
    const vapi = vapiRef.current || getVapiInstance();
    if (!vapi) return;
    vapi.stop();
  };

  const toggleMute = () => {
    const vapi = vapiRef.current || getVapiInstance();
    if (!vapi) return;
    const nextMuted = !isMuted;
    vapi.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  return {
    isCalling,
    callState,
    startCall,
    endCall,
    isMuted,
    toggleMute,
    errorMessage,
    activeTools,
  };
}
