// frontend/lib/useApi.ts
import { useMemo } from 'react';
import { useAuth, useUser } from '@clerk/expo';
import { api } from './api';

/**
 * Returns all API methods pre-bound with the current Clerk JWT token.
 * Usage: const { createRequest, getSession } = useApi();
 */
export function useApi() {
  const { getToken } = useAuth();
  const { user } = useUser();

  return useMemo(() => {
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    api.setEmailHeader(email);

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
      // HITL Booking Approval
      approveBooking: (sessionId: string) => withToken((t) => api.approveBooking(sessionId, t)),
      rejectBooking: (sessionId: string, reason?: string) => withToken((t) => api.rejectBooking(sessionId, reason, t)),
      listProviders: (params?: Parameters<typeof api.listProviders>[0]) =>
        withToken((t) => api.listProviders(params, t)),
      getProvider: (id: string) => withToken((t) => api.getProvider(id, t)),
      createBooking: (body: Parameters<typeof api.createBooking>[0]) =>
        withToken((t) => api.createBooking(body, t)),
      getBooking: (id: string) => withToken((t) => api.getBooking(id, t)),
      cancelBooking: (id: string) => withToken((t) => api.cancelBooking(id, t)),
      bulkCancelBookings: (ids: string[]) => withToken((t) => api.bulkCancelBookings(ids, t)),
      getMyProfile: () => withToken((t) => api.getMyProfile(t)),
      getMyBookings: () => withToken((t) => api.getMyBookings(t)),
      getMyNotifications: () => withToken((t) => api.getMyNotifications(t)),
      readNotification: (id: string) => withToken((t) => api.readNotification(id, t)),
      deleteNotification: (id: string) => withToken((t) => api.deleteNotification(id, t)),
      bulkDeleteNotifications: (ids: string[]) => withToken((t) => api.bulkDeleteNotifications(ids, t)),
      triggerFollowup: (body: Parameters<typeof api.triggerFollowup>[0]) =>
        withToken((t) => api.triggerFollowup(body, t)),
      adminListTraces: () => withToken((t) => api.adminListTraces(t)),
      adminListSessions: () => withToken((t) => api.adminListSessions(t)),
      adminListBookings: () => withToken((t) => api.adminListBookings(t)),
      adminListProviders: () => withToken((t) => api.adminListProviders(t)),
    };
  }, [getToken]);
}
