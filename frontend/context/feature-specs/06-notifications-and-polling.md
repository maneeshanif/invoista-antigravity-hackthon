# Feature Specification: Notifications and Polling

## 1. Objective
Currently, the React Native Expo frontend does not reflect follow-ups or completed bookings made by the AI Orchestrator. The objective is to establish a robust synchronization mechanism (polling or real-time listeners) to fetch and display notifications, completed bookings, and orchestrator status to make the application fully full-stack ready.

## 2. Backend Enhancements
Before the frontend can consume updates, the backend must expose the necessary data endpoints.

### 2.1 Update `/me` Endpoints
File to update: `backend/app/api/routes/me.py`
Add the following endpoints to fetch current user's specific data:
- `GET /me/bookings`: Fetches all bookings associated with the current user.
- `GET /me/notifications`: Fetches all notifications (including follow-ups) for the current user. Ensure notifications are ordered by `created_at` descending.

### 2.2 Mark Notifications as Read
Add an endpoint to acknowledge notifications:
- `POST /me/notifications/{id}/read`: Updates the status of a specific notification to "read" or "acknowledged".

## 3. Frontend Architecture (React Native / Expo)

### 3.1 Global State Management
Use a global state provider (React Context, Zustand, or Redux) to manage user bookings and notifications so they can be accessed anywhere in the app (e.g., to show badge counts on a tab bar).

### 3.2 Polling Mechanism
Implement an asynchronous polling mechanism to check for new data:
- **Interval**: Poll `GET /me/notifications` and `GET /me/bookings` every 5-10 seconds while the app is in the foreground.
- **Hook Strategy**: Create a custom React Hook `useNotificationsPolling()` that manages the `setInterval` logic. It should pause polling when the app goes into the background (using React Native's `AppState` API) to conserve battery.

### 3.3 Supabase Real-time (Alternative to Polling)
If Supabase is directly accessible from the frontend, subscribe to changes on the `bookings` and `notifications` tables using Supabase Real-time listeners.
- **Listener Setup**: Subscribe to `INSERT` and `UPDATE` events on `notifications` where `user_id` matches the authenticated user.
- **Fallback**: Maintain long-polling as a fallback if WebSocket connections fail.

## 4. UI/UX Implementations

### 4.1 Push Notifications / Toasts
- When a new notification arrives (e.g., a follow-up is triggered), trigger an in-app toast message.
- Recommended libraries: `react-native-toast-message` or `burnt` for native-feeling toasts.

### 4.2 Notification Center
- Create a dedicated "Notifications" screen or modal where users can view a timeline of all past and pending notifications.
- Differentiate between "Booking Confirmed" notifications and "Follow-up" requests visually.

### 4.3 Actionable Follow-ups
- For follow-up notifications, include interactive elements (e.g., "Rate your service", "Confirm Completion") that trigger API calls back to the server, closing the loop on the user journey.

## 5. Security & Edge Cases
- Ensure any user IDs passed match the authenticated session (Clerk UUID mapping).
- Clear the polling interval immediately upon user logout.
- Handle network failures gracefully without spamming the backend with retry loops (implement exponential backoff).
