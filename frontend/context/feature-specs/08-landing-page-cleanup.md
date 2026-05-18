# 08 — Landing Page Cleanup and Inline AI Logs

## Overview

The current home screen (`app/(tabs)/index.tsx`) contains several cluttered sections, including:
1. Executive Quick Actions grid
2. Category Chips for manual filtering
3. Available/Recommended Professionals list
4. Active Bookings horizontal scroll cards

While functional, this multi-section layout conflicts with an **AI-first, minimalist conversational paradigm**. 

This feature specification details how to clean up the landing page, transforming it into a single, cohesive, premium **Conversational Agent Interface**. The home page will showcase *only* the existing bottom navigation tabs and a premium chat interface. Upon user request, a real-time agent execution trace log and final booking outcomes will expand **inline directly below the chat input**, eliminating the need to redirect the user to a separate request page.

---

## 1. UX Design & Component Layout

### 1.1 Minimalist Header
- **Profile/Logout**: Keep the premium Clerk user avatar (acting as a trigger for logout) on the top-left.
- **Title**: A clean, centralized title "PRIVATE CONCIERGE" or modern brand logo.
- **Settings Button**: Keep the top-right Settings trigger to access configuration and theme controls.

### 1.2 Conversation/Chat Card (Hero)
- **Visuals**: A sleek, centered, glassmorphic conversational console.
- **Input**: Natural language query input box (`AIInput`) styled with premium glowing borders and responsive hover/focus highlights.
- **Interactive State**: If a session is active, the text box enters a read-only/disabled state with a premium inline indicator ("AI is coordinating service...").

### 1.3 Inline Dynamic Logs (Trace Panel)
- **Trigger**: Expanding dynamically below the chat interface only when `activeSessionId` is set.
- **Style**: Seamless transition animation using `layout` or smooth visibility fade-ins.
- **Functionality**:
  - Automatically polls `/session/[id]` and `/session/[id]/trace` from the home screen state.
  - Renders human-friendly agent names (e.g. *Discovery Specialist*, *Matching Specialist*) and tool descriptions in a sleek vertical stepper log.
  - Highlights final AI summaries and results as they resolve.

### 1.4 Post-Booking / Resolution Card
- **Layout**: If the inline trace status reaches `'completed'` and a booking is created, the final `Booking Card` (displaying the provider details, completion status, and "View Booking Receipt" action) is appended at the very bottom of the logs panel on the home page.

---

## 2. Technical Architecture & State Management

Instead of using `router.push('/request/[id]')` to transition pages, we will manage the polling, traces, and booking resolution directly within the home screen context.

### 2.1 State Setup in `app/(tabs)/index.tsx`
```tsx
const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
const [sessionStatus, setSessionStatus] = useState<Session['status'] | null>(null);
const [traces, setTraces] = useState<TraceLog[]>([]);
const [bookingData, setBookingData] = useState<{ provider: Provider, bookingId: string } | null>(null);
const [queryText, setQueryText] = useState<string>('');
const [error, setError] = useState<string | null>(null);
const [polling, setPolling] = useState(false);
```

### 2.2 Inline Polling Loop
When the user submits a query:
1. Trigger `createRequest` API and set the `activeSessionId` and `queryText`.
2. Activate a local `useEffect` polling hook:
```tsx
useEffect(() => {
  if (!activeSessionId) return;

  let cancelled = false;
  const poll = async () => {
    setPolling(true);
    while (!cancelled) {
      try {
        const [session, traceLogs] = await Promise.all([
          getSession(activeSessionId),
          getSessionTrace(activeSessionId),
        ]);

        if (!cancelled) {
          setSessionStatus(session.status);
          setTraces(traceLogs);
        }

        if (session.status === 'completed' || session.status === 'failed') {
          break;
        }
      } catch (err) {
        console.error('Inline polling error:', err);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setPolling(false);
  };

  poll();
  return () => { cancelled = true; };
}, [activeSessionId]);
```

### 2.3 Fetching Resolved Booking Inline
```tsx
useEffect(() => {
  if (sessionStatus === 'completed' && activeSessionId) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const fetchBooking = async () => {
      try {
        const { traces } = await exportSessionTrace(activeSessionId);
        const bookingTrace = traces.find((t: any) => t.tool_used === 'create_booking');
        if (bookingTrace?.output_payload) {
          const { booking_id, provider_id } = bookingTrace.output_payload;
          const provider = await getProvider(provider_id);
          setBookingData({ provider, bookingId: booking_id });
        }
      } catch (err) {
        console.error('Failed to load booking info:', err);
      }
    };
    fetchBooking();
  }
}, [sessionStatus, activeSessionId]);
```

---

## 3. UI Refactoring & Cleanup Details

### 3.1 Unused Code Deletion
All manual grids and listings will be completely omitted from the layout render:
- Remove imports of `ServiceCard`, `ActiveBookingCard`, and local arrays: `QUICK_ACTIONS`, `CATEGORIES`.
- Remove category change hook (`useEffect` fetching providers).
- Simplify the layout `ScrollView` to contain exactly:
  1. Executive Header (Concierge style).
  2. A conversational container (`AIInput` + interactive state).
  3. Dynamic inline container (`logs` + `booking details` + `active indicators` + `error states`).

### 3.2 Immersive Glassmorphic Styling
The logs pane should match the rest of the application's premium aesthetic:
- **Container**: Glassmorphic styling with a semi-transparent dark backplate (`rgba(255, 255, 255, 0.03)`).
- **Steppers**: Glowing connecting lines (using the dynamic neon accent color `#00F3FF`).
- **Cards**: Minimal padding and soft drop shadows to emphasize content.

---

## 4. Implementation Checklist

| Task | Priority | Status |
| :--- | :---: | :---: |
| Draft and document specification `08-landing-page-cleanup.md` | **P0** | ✅ |
| Remove legacy components (`ServiceCard`, `ActiveBookingCard`, Chips, Quick Actions) from `app/(tabs)/index.tsx` | **P0** | ❌ |
| Remove local providers & categories fetching logic from home screen | **P0** | ❌ |
| Refactor `AIInput` submission to trigger inline session state instead of routing to `/request/[id]` | **P0** | ❌ |
| Add local polling state (`activeSessionId`, `sessionStatus`, `traces`) to the home screen | **P0** | ❌ |
| Build beautiful, dynamic container below `AIInput` to render traces inline | **P0** | ❌ |
| Integrate dynamic booking results card and link to receipt screen `/booking/[id]` on successful completion | **P1** | ❌ |
| Optimize responsive styling and test layout fluidity across device sizes | **P1** | ❌ |
