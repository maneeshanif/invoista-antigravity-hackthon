import { Platform } from 'react-native';

export interface ActiveToolCall {
  id: string;
  name: string;
  status: 'loading' | 'success' | 'error';
  timestamp: number;
}

export interface VapiCallHook {
  isCalling: boolean;
  callState: 'idle' | 'connecting' | 'connected' | 'ended' | 'error';
  startCall: (userId?: string, sessionId?: string) => Promise<void>;
  endCall: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  errorMessage: string | null;
  activeTools: ActiveToolCall[];
}

// Dynamically dispatch the implementation based on platform
const useVapi: () => VapiCallHook = Platform.select({
  native: () => require('./useVapi.native').default(),
  default: () => require('./useVapi.web').default(),
});

export default useVapi;

