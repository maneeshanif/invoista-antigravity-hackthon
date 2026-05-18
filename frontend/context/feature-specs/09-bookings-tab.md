# 09 — Bookings History Tab

## Overview

As the AI-first concierge system completes bookings on behalf of users, the application requires a centralized, premium, and easily accessible **Bookings History Tab**. Currently, the bottom navigation bar features three tabs: **Home**, **Explore**, and **Alerts (Notifications)**. 

This technical specification details the integration of a **4th navigation tab (Bookings)**. This screen will fetch and list all confirmed and cancelled bookings made by the currently authenticated user in a stunning glassmorphic UI, allowing users to tap cards to view full details/receipts, toggle filters by status, pull-to-refresh their schedules, and cancel active bookings directly.

---

## 1. UX Design & Premium Glassmorphic Layout

The new Bookings screen (`app/(tabs)/bookings.tsx`) should match the project's luxurious, high-contrast dark aesthetic, utilizing soft shadows, frosted-glass cards, and neon accent colors.

### 1.1 Header Section
- **Title**: A clean, modern header reading `MY APPOINTMENTS` or `MY BOOKINGS` styled in high-tracking uppercase (`letterSpacing: 1.5`).
- **Subheader**: A dynamic counter indicating active/upcoming appointments (e.g., `3 Active Bookings`).

### 1.2 Status Quick-Filters
A horizontal chip filter bar allowing users to narrow down their booking history:
- **All**: Displays all historical bookings.
- **Active**: Filtered to bookings with status `'confirmed'`.
- **Past / Cancelled**: Filtered to bookings with status `'cancelled'` or those whose scheduled times are in the past.
- **Aesthetic**: Selected chips glow with a premium cyan border (`#00F3FF`) and an active drop shadow, while unselected chips blend semi-transparently with the background.

### 1.3 Booking Cards (Themed List)
Each booking will render inside a custom `<GlassCard>` with the following details:
- **Provider Info**: Provider Name (large, bold `#FFF`) and their specialty/category (muted `rgba(255,255,255,0.5)`).
- **Date & Time**: Calendar icon accompanied by a beautifully formatted date and local time.
- **Confirmation Code**: Rendered in a high-tech monospaced font with a soft cyan background.
- **Status Badge**:
  - `CONFIRMED`: A glowing pill badge with translucent green background (`rgba(16, 185, 129, 0.1)`) and emerald text (`#10B981`).
  - `CANCELLED`: A subtle pill badge with translucent crimson background (`rgba(255, 75, 75, 0.1)`) and red text (`#FF4B4B`).
- **Interactive Triggers**: 
  - Entire card acts as a touchable trigger navigating directly to the details receipt screen (`/booking/[id]`).
  - Subtle chevron icon on the right edge indicates navigability.

### 1.4 Immersive Empty State
If the user has no bookings:
- Render a highly aesthetic minimalist vector icon (e.g. a stylized calendar or dashboard outline).
- Display descriptive copy: *"Your Private Concierge has not scheduled any services yet. Ask the AI on the Home screen to book your first provider."*
- Render a prominent **"Request a Service"** call-to-action button which utilizes `Haptics` and switches the tab navigation back to the Home/Agent interface (`index` tab).

---

## 2. Navigation & Route Wiring

We will add a new tab screen configuration to the Expo Router navigation layout.

### 2.1 Updating `app/(tabs)/_layout.tsx`

Import the `Calendar` icon from `lucide-react-native` and add the `bookings` tab between the `explore` and `notifications` screens to make it a natural centerpiece of the bottom bar.

```tsx
import { Home, Compass, Calendar, Bell } from 'lucide-react-native';

// Inside TabLayout component's <Tabs>:
<Tabs.Screen
  name="bookings"
  options={{
    title: 'BOOKINGS',
    tabBarIcon: ({ color, focused }) => (
      <View style={focused ? styles.activeIcon : null}>
        <Calendar size={22} color={color} />
      </View>
    ),
  }}
/>
```

---

## 3. Technical Architecture & State Management

The new screen will consume the backend API endpoints. Since the user's booking object returned from `GET /me/bookings` contains a reference `provider_id` but not the nested provider model details, we must implement an efficient parallel loading mechanism.

### 3.1 Expose user bookings in `frontend/lib/useApi.ts`

Update `useApi.ts` to expose `getMyBookings`:

```typescript
export function useApi() {
  const { getToken } = useAuth();
  const withToken = async <T>(fn: (token: string | null) => Promise<T>): Promise<T> => {
    const token = await getToken();
    return fn(token);
  };

  return {
    // ... other endpoints ...
    getBooking: (id: string) => withToken((t) => api.getBooking(id, t)),
    cancelBooking: (id: string) => withToken((t) => api.cancelBooking(id, t)),
    getMyProfile: () => withToken((t) => api.getMyProfile(t)),
    getMyBookings: () => withToken((t) => api.getMyBookings(t)), // <-- EXPOSED NOW
    // ...
  };
}
```

### 3.2 Dynamic Aggregation & Mapping State

Inside `app/(tabs)/bookings.tsx`, state will hold:
1. `bookings`: Array of raw `Booking` models fetched from `/me/bookings`.
2. `providers`: Map of `provider_id` to `Provider` details.
3. `loading`: Boolean state indicating active loading.
4. `refreshing`: For Pull-to-Refresh trigger state.
5. `filter`: String state (`'all' | 'confirmed' | 'cancelled'`) for local list filtering.

#### Optimized Fetching Sequence:
```typescript
const { getMyBookings, getProvider } = useApi();
const [bookings, setBookings] = useState<Booking[]>([]);
const [providers, setProviders] = useState<Record<string, Provider>>({});
const [loading, setLoading] = useState(true);

const loadBookingsData = async () => {
  try {
    // 1. Fetch user bookings
    const list = await getMyBookings();
    
    // Sort bookings by date descending (newest first)
    const sortedBookings = list.sort(
      (a, b) => new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime()
    );
    setBookings(sortedBookings);

    // 2. Extract unique provider IDs to prevent duplicate calls
    const uniqueIds = Array.from(new Set(sortedBookings.map(b => b.provider_id)));

    // 3. Fetch provider profiles in parallel
    const providerProfiles = await Promise.all(
      uniqueIds.map(id => getProvider(id).catch(() => null))
    );

    // 4. Map profiles into a key-value record for quick O(1) lookups
    const providerMap: Record<string, Provider> = {};
    providerProfiles.forEach(p => {
      if (p) providerMap[p.id] = p;
    });

    setProviders(providerMap);
  } catch (err) {
    console.error('Failed to load bookings list:', err);
  } finally {
    setLoading(false);
  }
};
```

---

## 4. Implementation Checklist

| Task | Priority | Target File | Status |
| :--- | :---: | :--- | :---: |

| Import `Calendar` and configure the new `bookings` screen in tab navigator | **P0** | `frontend/app/(tabs)/_layout.tsx` | ✅ |
| Create `bookings.tsx` and implement fetching logic with parallelized provider details | **P0** | `frontend/app/(tabs)/bookings.tsx` | ✅ |
| Design a premium glassmorphic FlatList for bookings with status badge colors | **P0** | `frontend/app/(tabs)/bookings.tsx` | ✅ |
| Add a Pull-To-Refresh control (`RefreshControl`) for list updating | **P1** | `frontend/app/(tabs)/bookings.tsx` | ✅ |
| Add segment filter chips (`All`, `Active`, `Past`) at the top of the tab | **P1** | `frontend/app/(tabs)/bookings.tsx` | ✅ |
| Implement custom beautiful Empty State with interactive navigation shortcut back to Home | **P1** | `frontend/app/(tabs)/bookings.tsx` | ✅ |
| Add dynamic `Haptics` feedback when changing filters or refreshing | **P2** | `frontend/app/(tabs)/bookings.tsx` | ✅ |
