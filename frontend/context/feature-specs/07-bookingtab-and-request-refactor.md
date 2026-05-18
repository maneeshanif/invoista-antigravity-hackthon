# 07 — Booking Tab and Request Refactor

## Overview

The current Agent Trace UI in the Request page (`app/request/[id].tsx`) is too technical. It surfaces raw backend terminology (like "Orchestrator") and lacks human-friendly descriptions of what tools the sub-agents are actually using or what final decisions they made. Furthermore, once a booking is made, there is no integrated view to see the final booking details directly below the trace log.

This spec details how to refactor the Request page to make agent traces human-friendly, and to introduce an integrated Booking Results section at the bottom of the page instead of abruptly navigating away.

---

## 1. Human-Friendly Agent Traces

### 1.1 Translating Agent Names & Tools

We need to map the raw database `agent_name` and `tool_used` into user-friendly copy.

**Agent Names:**
| Raw Agent Name | Human-Friendly Name |
|---|---|
| `Orchestrator` | Main AI Coordinator |
| `DiscoveryAgent` | Discovery Specialist |
| `RankingAgent` | Matching Specialist |
| `BookingAgent` | Booking Coordinator |

**Tool Actions:**
Instead of showing `🔧 create_booking` or `🔧 call_agent`, we should parse the payload or use a mapper:
- `call_agent`: "Consulting with sub-specialist..."
- `find_providers`: "Searching local database for available professionals..."
- `create_booking`: "Securing an appointment slot..."
- *None (Final Output)*: "Finalizing response..."

### 1.2 Refactoring `TraceLog` UI

Update the trace log rendering loop in `app/request/[id].tsx`:

```tsx
// Example Mapping Function
const getFriendlyAgentName = (rawName: string) => {
  const map: Record<string, string> = {
    Orchestrator: 'Main AI Coordinator',
    DiscoveryAgent: 'Discovery Specialist',
    RankingAgent: 'Matching Specialist',
    BookingAgent: 'Booking Coordinator',
  };
  return map[rawName] || rawName;
};

// Example Tool Mapping
const getFriendlyToolName = (toolName: string | null) => {
  if (!toolName) return 'Formulating response...';
  if (toolName.includes('call_agent')) return 'Consulting specialist agent';
  if (toolName.includes('find_providers')) return 'Scanning local database';
  if (toolName.includes('create_booking')) return 'Confirming appointment slot';
  return `Using tool: ${toolName}`;
};
```

Make the `output_summary` more prominent, as it usually contains the agent's actual "thought" or selected response. If the trace represents the final response, highlight it nicely.

---

## 2. Integrated Booking Results Section

Currently, when `session.status === 'completed'`, the app replaces the route and jumps to `/provider/[sessionId]`. To provide a better UX, we should keep the user on the Request screen so they can review the traces, and render a **Booking Tab/Section** at the bottom of the trace list.

### 2.1 UI State Changes

**Remove the automatic redirect:**
```diff
-  useEffect(() => {
-    if (sessionStatus === 'completed') {
-      router.replace({ pathname: '/provider/[sessionId]', params: { sessionId } });
-    }
-  }, [sessionStatus]);
```

**Fetch the export trace when completed:**
```tsx
const [bookingData, setBookingData] = useState<{ provider: Provider, bookingId: string } | null>(null);

useEffect(() => {
  if (sessionStatus === 'completed') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Fetch the booking details
    const fetchBooking = async () => {
      try {
        const { traces } = await exportSessionTrace(sessionId);
        const bookingTrace = traces.find(t => t.tool_used === 'create_booking');
        if (bookingTrace?.output_payload) {
           const { booking_id, provider_id } = bookingTrace.output_payload as any;
           const provider = await getProvider(provider_id);
           setBookingData({ provider, bookingId: booking_id });
        }
      } catch (err) {
        console.error("Failed to load booking info:", err);
      }
    };
    fetchBooking();
  }
}, [sessionStatus]);
```

### 2.2 Rendering the Booking Card

At the bottom of the `app/request/[id].tsx` ScrollView, add the conditional rendering for the booked item:

```tsx
{sessionStatus === 'completed' && bookingData && (
  <View style={styles.bookingResultContainer}>
    <ThemedText style={styles.traceHeader}>Successfully Booked!</ThemedText>
    <GlassCard style={styles.providerCard}>
      <ThemedText style={styles.providerName}>{bookingData.provider.name}</ThemedText>
      <ThemedText style={styles.providerCategory}>{bookingData.provider.category}</ThemedText>
      
      <TouchableOpacity 
         style={styles.viewBookingBtn}
         onPress={() => router.push(`/booking/${bookingData.bookingId}`)}
      >
        <ThemedText style={styles.btnText}>View Booking Receipt</ThemedText>
      </TouchableOpacity>
    </GlassCard>
  </View>
)}
```

---

## 3. Nav Bar Settings & Theme Toggle

To improve accessibility and customization, we need to add a Settings modal accessible from the app's navigation bar, allowing users to toggle between Light Mode and Dark Mode.

### 3.1 Settings Icon in Header

In the root layout (`app/(tabs)/_layout.tsx` or `app/_layout.tsx`), add a settings icon to the header right:

```tsx
<Stack.Screen 
  name="(tabs)" 
  options={{
    headerRight: () => (
      <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
        <Settings size={24} color={Colors.dark.icon} style={{ marginRight: 15 }} />
      </TouchableOpacity>
    )
  }} 
/>
```

### 3.2 Theme Context & Provider

Create a `ThemeProvider` (if one doesn't exist) in `frontend/context/ThemeContext.tsx` to hold the `theme` state (`'light' | 'dark'`) and persist it using `AsyncStorage`.

Update the `Colors` object in `constants/theme.ts` so components can consume light or dark values dynamically based on the current theme context.

### 3.3 Settings Modal

When the user taps the Settings icon, present a bottom sheet or standard modal:
- Title: "Settings"
- Row 1: "Theme" with a toggle or segment control (`Light` / `Dark` / `System`).
- (Optional) Row 2: "Sign Out" from Clerk.

---

## 4. Implementation Checklist

| Task | Priority | Status |
|---|---|---|
| Remove automatic redirect to `/provider/[sessionId]` in `app/request/[id].tsx` | **P0** | ❌ |
| Create `getFriendlyAgentName` and `getFriendlyToolName` mappers | **P0** | ❌ |
| Update the trace list rendering to use human-friendly names | **P0** | ❌ |
| Highlight the final AI response/summary prominently | **P1** | ❌ |
| Add state for `bookingData` (Provider + Booking ID) on completion | **P0** | ❌ |
| Render the Booking Success Card at the bottom of the trace view | **P0** | ❌ |
| Link the Booking Success Card to `app/booking/[id].tsx` | **P1** | ❌ |
| Create `ThemeContext` to manage 'light' vs 'dark' state | **P1** | ❌ |
| Add Settings Icon to Nav Bar & Settings Modal UI | **P1** | ❌ |
