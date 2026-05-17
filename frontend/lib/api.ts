// frontend/lib/api.ts
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

// ─── Types (mirrors backend/app/db/schemas.py) ────────────────────────────────

export interface RequestCreate {
  message: string;
  user_id?: string;
}

export interface RequestResponse {
  session_id: string;
  status: 'started';
}

export interface Session {
  id: string;
  user_id: string;
  raw_input: string;
  detected_language: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
}

export interface Provider {
  id: string;
  name: string;
  category: string;
  area: string;
  lat: number;
  lng: number;
  rating: number;
  jobs_completed: number;
  price_range: string;
  is_active: boolean;
}

export interface ProviderSlot {
  id: string;
  provider_id: string;
  slot_date: string; // ISO date "YYYY-MM-DD"
  slot_time: string; // e.g. "09:00"
  is_booked: boolean;
}

export interface BookingCreate {
  provider_id: string;
  slot_id: string;
}

export interface Booking {
  id: string;
  provider_id: string;
  user_id: string;
  slot_id: string;
  status: 'confirmed' | 'cancelled';
  confirmation_code: string;
  booked_at: string;
}

export interface TraceLog {
  id: string;
  session_id: string;
  step: number;
  agent_name: string;
  tool_used: string | null;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  output_summary: string | null;
  duration_ms: number | null;
}

export interface User {
  id: string;
  clerk_user_id: string;
  name: string;
  phone: string;
  role: string;
  preferred_language: string;
  area: string;
  lat: number;
  lng: number;
}

export interface FollowupTrigger {
  booking_id: string;
}

// ─── API Client Factory ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Public API Functions (token injected by hook) ────────────────────────────

export const api = {
  // Health
  health: (token?: string | null) =>
    request<{ status: string; version: string }>('/health', {}, token),

  // Requests / Sessions
  createRequest: (body: RequestCreate, token?: string | null) =>
    request<RequestResponse>('/requests/', { method: 'POST', body: JSON.stringify(body) }, token),

  getSession: (sessionId: string, token?: string | null) =>
    request<Session>(`/requests/${sessionId}`, {}, token),

  getSessionTrace: (sessionId: string, token?: string | null) =>
    request<TraceLog[]>(`/requests/${sessionId}/trace`, {}, token),

  exportSessionTrace: (sessionId: string, token?: string | null) =>
    request<{ session_id: string; traces: TraceLog[] }>(`/requests/${sessionId}/trace/export`, {}, token),

  // Providers
  listProviders: (params: { category?: string; area?: string } = {}, token?: string | null) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<Provider[]>(`/providers/${qs ? '?' + qs : ''}`, {}, token);
  },

  getProvider: (id: string, token?: string | null) =>
    request<Provider>(`/providers/${id}`, {}, token),

  // Bookings
  createBooking: (body: BookingCreate, token?: string | null) =>
    request<Booking>('/bookings/', { method: 'POST', body: JSON.stringify(body) }, token),

  getBooking: (id: string, token?: string | null) =>
    request<Booking>(`/bookings/${id}`, {}, token),

  cancelBooking: (id: string, token?: string | null) =>
    request<Booking>(`/bookings/${id}/cancel`, { method: 'POST' }, token),

  // Me
  getMyProfile: (token?: string | null) =>
    request<User>('/me/', {}, token),

  // Followups
  triggerFollowup: (body: FollowupTrigger, token?: string | null) =>
    request<{ status: string; notification: unknown }>('/followups/trigger', { method: 'POST', body: JSON.stringify(body) }, token),

  // Admin
  adminListTraces: (token?: string | null) =>
    request<TraceLog[]>('/admin/traces', {}, token),

  adminListSessions: (token?: string | null) =>
    request<Session[]>('/admin/sessions', {}, token),

  adminListBookings: (token?: string | null) =>
    request<Booking[]>('/admin/bookings', {}, token),

  adminListProviders: (token?: string | null) =>
    request<Provider[]>('/admin/providers', {}, token),
};
