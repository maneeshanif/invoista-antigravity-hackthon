# 05 — Wiring Backend with Frontend

## Overview

The backend is a **FastAPI** server (`app/main.py`) mounted at `/api/v1/*`.
The frontend is a **React Native Expo** app using Expo Router.
Auth is handled by **Clerk** (JWT tokens from `@clerk/expo`).

The agent workflow is **asynchronous** — `POST /requests` returns a `session_id` immediately
and the workflow runs in a background task. The frontend must poll
`GET /requests/{session_id}` until `status === "completed"` or `"failed"`.

---

## 1. Base Configuration

### 1.1 Environment Variable

Add to `frontend/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

> For device testing use your machine's LAN IP, e.g. `http://192.168.x.x:8000/api/v1`.
> In production point to the Cloud Run URL.

### 1.2 Create `frontend/lib/api.ts`

This is the **single source of truth** for all API calls.
It must attach the Clerk JWT token to every request.

```ts
// frontend/lib/api.ts
import { useAuth } from '@clerk/expo';

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
  slot_date: string;   // ISO date "YYYY-MM-DD"
  slot_time: string;   // e.g. "09:00"
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

// ─── Public API Functions (token injected by hook below) ──────────────────────

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
```

### 1.3 Create `frontend/lib/useApi.ts` — Hook with auto-injected auth token

```ts
// frontend/lib/useApi.ts
import { useAuth } from '@clerk/expo';
import { api } from './api';

/**
 * Returns all API methods pre-bound with the current Clerk JWT token.
 * Usage: const { createRequest, getSession } = useApi();
 */
export function useApi() {
  const { getToken } = useAuth();

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
  };
}
```

> **Note on auth**: The backend's `me.py` and `bookings.py` currently use a
> hardcoded `user_id = "11111111-1111-1111-1111-111111111111"`. The Clerk JWT
> is sent but not yet verified server-side. For the hackathon demo this is fine
> — the token is still forwarded so the pattern is wired up correctly.

---

## 2. Screen-by-Screen API Wiring

### 2.1 Home Screen (`app/(tabs)/index.tsx`)

**Current State:** Uses `MOCK_PROVIDERS` static array. Active bookings are hardcoded.

**What to wire up:**

| UI Element | API Call | Notes |
|---|---|---|
| "Available Professionals" list | `GET /providers?category=&area=` | Replace `MOCK_PROVIDERS` with real data |
| "Active Concierge" section | `GET /bookings` (admin list) or user-filtered | Fetch bookings where `status === 'confirmed'` |
| Category chip filter | Re-fetch `GET /providers?category={selected}` | Pass selected category as query param |

**Implementation pattern:**

```tsx
// Inside HomeScreen
const { listProviders } = useApi();
const [providers, setProviders] = useState<Provider[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetch = async () => {
    const data = await listProviders(
      selectedCategory !== 'all' ? { category: selectedCategory } : {}
    );
    setProviders(data);
    setLoading(false);
  };
  fetch();
}, [selectedCategory]);
```

---

### 2.2 AI Input → Request Submission (`handleAIRequest` in `index.tsx`)

**Current State:** Navigates to `/request/[id]` with a local fake `id` (`'req_' + Date.now()`).

**What to change:**

```tsx
// BEFORE (mock)
const handleAIRequest = (text: string) => {
  router.push({ pathname: '/request/[id]', params: { id: 'req_' + Date.now(), query: text } });
};

// AFTER (wired)
const { createRequest } = useApi();

const handleAIRequest = async (text: string) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  try {
    const { session_id } = await createRequest({ message: text });
    router.push({
      pathname: '/request/[id]',
      params: { id: session_id, query: text }
    });
  } catch (err) {
    Alert.alert('Error', 'Could not start request. Is the backend running?');
  }
};
```

The `session_id` returned by `POST /requests` is now the real UUID passed as `id` param.

---

### 2.3 Agent Thinking Screen (`app/request/[id].tsx`)

**Current State:** Runs a fake 4-step timer animation with hardcoded 2.5s delays per step.
Navigates back to `/(tabs)` when done — **no real backend connection at all**.

**What to build:** Replace the timer with a **polling loop** against `GET /requests/{session_id}`.
Additionally fetch `GET /requests/{session_id}/trace` to show real agent steps.

**Implementation:**

```tsx
// app/request/[id].tsx — rewrite useEffect
const { getSession, getSessionTrace } = useApi();
const { id: sessionId, query } = useLocalSearchParams<{ id: string; query: string }>();

const [sessionStatus, setSessionStatus] = useState<Session['status']>('pending');
const [traces, setTraces] = useState<TraceLog[]>([]);

useEffect(() => {
  let cancelled = false;

  const poll = async () => {
    while (!cancelled) {
      try {
        const session = await getSession(sessionId);
        const traceLogs = await getSessionTrace(sessionId);

        if (!cancelled) {
          setSessionStatus(session.status);
          setTraces(traceLogs);
        }

        if (session.status === 'completed' || session.status === 'failed') {
          break;
        }
      } catch (e) {
        console.error('polling error', e);
      }
      // Wait 2 seconds before next poll
      await new Promise((r) => setTimeout(r, 2000));
    }
  };

  poll();
  return () => { cancelled = true; };
}, [sessionId]);

// When completed → navigate to provider selection
useEffect(() => {
  if (sessionStatus === 'completed') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({ pathname: '/provider/[sessionId]', params: { sessionId } });
  }
}, [sessionStatus]);
```

**Trace Steps Display:**

Map `traces` array to the step cards — use `trace.agent_name` as the card label,
`trace.tool_used` as the subtitle, and `trace.duration_ms` for timing display.

---

### 2.4 Provider Selection Screen (`app/provider/[sessionId].tsx`) — **MISSING SCREEN**

**Does not exist yet. Must be created.**

**Route:** `app/provider/[sessionId].tsx`

**Data to fetch:**

```
GET /requests/{sessionId}/trace/export
```

Parse `traces` to find the booking agent output (`agent_name === "BookingAgent"` or
look for `tool_used === "create_booking"`) which contains the `booking_id`, `provider_id`,
and `slot_id` in `output_payload`.

Also `GET /providers/{provider_id}` for full provider details.

**Screen Layout:**

```
- Recommended Provider Card
  - name, rating, category, area, price_range
  - "Why Recommended" section (from ranking trace output_summary)
  - "Book Now" button → navigates to /booking/[bookingId]
- Alternative Providers (other ranked results from trace)
```

**Key data flow:**

```tsx
// app/provider/[sessionId].tsx
const { sessionId } = useLocalSearchParams();
const { exportSessionTrace, getProvider } = useApi();

const [topProvider, setTopProvider] = useState<Provider | null>(null);
const [bookingId, setBookingId] = useState<string | null>(null);

useEffect(() => {
  const load = async () => {
    const { traces } = await exportSessionTrace(sessionId);
    // Find booking trace
    const bookingTrace = traces.find(t => t.tool_used === 'create_booking');
    if (bookingTrace?.output_payload) {
      const { booking_id, provider_id } = bookingTrace.output_payload as any;
      setBookingId(booking_id);
      const provider = await getProvider(provider_id);
      setTopProvider(provider);
    }
  };
  load();
}, [sessionId]);
```

---

### 2.5 Booking Screen (`app/booking/[id].tsx`)

**Current State:** Fully mocked — `handleConfirm` just sets `isSuccess = true` locally.
Time slots are hardcoded strings.

**What to change:**

The booking is already **created by the agent** via `create_booking` MCP tool.
The booking screen's job is to **display the confirmed booking receipt**, not to create a new one.

**Revised flow:**

```
Provider Selection Screen → passes bookingId → Booking Screen
```

```tsx
// app/booking/[id].tsx
const { id: bookingId } = useLocalSearchParams();
const { getBooking } = useApi();
const [booking, setBooking] = useState<Booking | null>(null);
const [provider, setProvider] = useState<Provider | null>(null);

useEffect(() => {
  const load = async () => {
    const b = await getBooking(bookingId);
    setBooking(b);
    const p = await getProvider(b.provider_id);
    setProvider(p);
  };
  load();
}, [bookingId]);

// Display:
// - provider.name, provider.category
// - booking.confirmation_code
// - booking.booked_at formatted
// - booking.status badge
// - "Cancel Booking" → POST /bookings/{id}/cancel
```

---

### 2.6 Admin Dashboard Screens — **MISSING SCREENS**

The architecture specifies these routes — none exist in the current file structure.

#### `app/admin/_layout.tsx` + `app/admin/dashboard.tsx`

```
GET /admin/sessions    → sessions count + list
GET /admin/bookings    → bookings count + list
GET /admin/providers   → providers count
GET /admin/traces      → all trace logs
```

Display stat cards (Total Sessions, Completed, Failed, Total Bookings)
and a sessions table linking to trace detail.

#### `app/admin/traces/[sessionId].tsx`

```
GET /requests/{sessionId}/trace  → ordered trace logs (step 0..N)
```

Render each `TraceLog` as a timeline card:
- `step` number badge
- `agent_name` + `tool_used`
- Collapsible `input_payload` / `output_payload` JSON viewer
- `duration_ms` chip
- `output_summary` text

---

## 3. Full Endpoint → Screen Mapping Table

| Backend Endpoint | Method | Used By Screen | Hook Call |
|---|---|---|---|
| `/health` | GET | (startup check) | `health()` |
| `/requests/` | POST | Home → AI Input | `createRequest()` |
| `/requests/{sessionId}` | GET | Thinking Screen (poll) | `getSession()` |
| `/requests/{sessionId}/trace` | GET | Thinking Screen | `getSessionTrace()` |
| `/requests/{sessionId}/trace/export` | GET | Provider Selection | `exportSessionTrace()` |
| `/providers/` | GET | Home Screen list | `listProviders()` |
| `/providers/{id}` | GET | Provider Selection, Booking | `getProvider()` |
| `/bookings/` | POST | (manual booking — not primary) | `createBooking()` |
| `/bookings/{id}` | GET | Booking Confirmation | `getBooking()` |
| `/bookings/{id}/cancel` | POST | Booking Screen | `cancelBooking()` |
| `/me/` | GET | Profile / Header | `getMyProfile()` |
| `/followups/trigger` | POST | Admin / Demo | `triggerFollowup()` |
| `/admin/traces` | GET | Admin Dashboard | `adminListTraces()` |
| `/admin/sessions` | GET | Admin Dashboard | `adminListSessions()` |
| `/admin/bookings` | GET | Admin Dashboard | `adminListBookings()` |
| `/admin/providers` | GET | Admin Dashboard | `adminListProviders()` |

---

## 4. Async Workflow: State Machine

The primary user journey hinges on this sequence:

```
[Home] user types request
  │
  ▼
POST /requests → { session_id, status: "started" }
  │
  ▼
Navigate to /request/[session_id] (Thinking Screen)
  │
  ▼  ← POLL every 2s
GET /requests/{session_id} → { status: "pending"|"running"|"completed"|"failed" }
GET /requests/{session_id}/trace → [ TraceLog, ... ]  ← render live steps
  │
  ├─ status === "failed"  → Show error card + retry button
  │
  └─ status === "completed"
        │
        ▼
GET /requests/{session_id}/trace/export
  → parse booking from trace output_payload
        │
        ▼
Navigate to /provider/[session_id] (Provider Selection)
        │
        ▼ user taps "View Booking"
Navigate to /booking/[booking_id] (Booking Confirmation)
        │
        ▼
GET /bookings/{booking_id}
Display receipt: confirmation_code, provider, slot, status
```

---

## 5. Missing Files Checklist

| File | Status | Priority |
|---|---|---|
| `frontend/lib/api.ts` | ❌ Not created | **P0** |
| `frontend/lib/useApi.ts` | ❌ Not created | **P0** |
| `frontend/app/provider/[sessionId].tsx` | ❌ Not created | **P0** |
| `frontend/app/(tabs)/index.tsx` — real provider data | ⚠️ Uses mock data | **P1** |
| `frontend/app/request/[id].tsx` — real polling | ⚠️ Uses fake timer | **P0** |
| `frontend/app/booking/[id].tsx` — real booking data | ⚠️ Mock confirm | **P1** |
| `frontend/app/admin/_layout.tsx` | ❌ Not created | **P2** |
| `frontend/app/admin/dashboard.tsx` | ❌ Not created | **P2** |
| `frontend/app/admin/traces/[sessionId].tsx` | ❌ Not created | **P2** |
| `frontend/.env` — `EXPO_PUBLIC_API_BASE_URL` | ❌ Not set | **P0** |

---

## 6. Backend CORS & Auth Notes

### CORS
`app/main.py` already has:
```python
allow_origins=["*"]
```
No changes needed for development.

### Auth (Hackathon Mode)
- Clerk JWT is sent from frontend via `Authorization: Bearer <token>`
- Backend does **not** yet verify the token (hardcoded `user_id`)
- The `POST /requests` endpoint accepts an optional `user_id` field in the body
- **Quick fix**: Pass `user.id` (Clerk user ID) from `useUser()` in `createRequest`:

```tsx
const { user } = useUser();
await createRequest({ message: text, user_id: user?.id });
```

The backend will use this as `user_id` in session creation (passed to `create_session`).

---

## 7. Error Handling Strategy

All screens should handle:

| Error | Display |
|---|---|
| Network failure | "Backend unreachable" banner + retry button |
| `404` session not found | "Session expired" with home navigation |
| Polling `status === "failed"` | "AI couldn't process request" + retry |
| Agent timeout (never completes) | Stop polling after 120s, show failure |

Recommended: create `frontend/lib/errors.ts` with a typed `ApiError` class and
a `handleApiError(err)` utility that maps status codes to user-friendly messages.

---

## 8. Implementation Order

1. **Create `lib/api.ts` + `lib/useApi.ts`** — foundation for everything
2. **Add `EXPO_PUBLIC_API_BASE_URL` to `.env`** — without this nothing works
3. **Wire `handleAIRequest` in `index.tsx`** — real `POST /requests`
4. **Rewrite `app/request/[id].tsx`** — real polling + live trace steps
5. **Create `app/provider/[sessionId].tsx`** — parse trace → show top provider
6. **Rewrite `app/booking/[id].tsx`** — fetch real booking receipt
7. **Wire `listProviders` in Home Screen** — replace mock data
8. **Create Admin screens** — dashboard + trace detail