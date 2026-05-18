// frontend/lib/useApi.ts
import { useMemo } from 'react';
import { useAuth } from '@clerk/expo';
import { api } from './api';

/**
 * Returns all API methods pre-bound with the current Clerk JWT token.
 * Usage: const { createRequest, getSession } = useApi();
 */
export function useApi() {
  const { getToken } = useAuth();

  return useMemo(() => {
    const withToken = async <T>(fn: (token: string | null) => Promise<T>): Promise<T> => {
      const token = await getToken();
      return fn(token);
    };

    return {
      health: () => withToken((t) => api.health(t)),
      createRequest: (body: Parameters<typeof api.createRequest>[0]) =>
        withToken((t) => api.createRequest(body, t)),
      getSession: (sessionId: string) => withToken((t) => api.getSession(sessionId, t)),
      getSessionTrace: (sessionId: string) => withToken((t) => api.getSessionTrace(sessionId, t)),
      exportSessionTrace: (sessionId: string) => withToken((t) => api.exportSessionTrace(sessionId, t)),
      listProviders: (params?: Parameters<typeof api.listProviders>[0]) =>
        withToken((t) => api.listProviders(params, t)),
      getProvider: (id: string) => withToken((t) => api.getProvider(id, t)),
      createBooking: (body: Parameters<typeof api.createBooking>[0]) =>
        withToken((t) => api.createBooking(body, t)),
      getBooking: (id: string) => withToken((t) => api.getBooking(id, t)),
      cancelBooking: (id: string) => withToken((t) => api.cancelBooking(id, t)),
      getMyProfile: () => withToken((t) => api.getMyProfile(t)),
      triggerFollowup: (body: Parameters<typeof api.triggerFollowup>[0]) =>
        withToken((t) => api.triggerFollowup(body, t)),
      adminListTraces: () => withToken((t) => api.adminListTraces(t)),
      adminListSessions: () => withToken((t) => api.adminListSessions(t)),
      adminListBookings: () => withToken((t) => api.adminListBookings(t)),
      adminListProviders: () => withToken((t) => api.adminListProviders(t)),
      getMyBookings: () => withToken((t) => api.getMyBookings(t)),
    };
  }, [getToken]);
}
