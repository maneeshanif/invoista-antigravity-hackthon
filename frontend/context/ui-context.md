# UI Context

## Frontend Routes (Expo Router)

```txt
app/
  _layout.tsx
  index.tsx

  auth/
    sign-in.tsx
    sign-up.tsx

  customer/
    _layout.tsx
    home.tsx
    request.tsx
    thinking/[sessionId].tsx
    providers/[sessionId].tsx
    booking/[bookingId].tsx
    history.tsx
    profile.tsx

  admin/
    _layout.tsx
    dashboard.tsx
    traces.tsx
    traces/[sessionId].tsx
    bookings.tsx
    providers.tsx
```

## Page Layout Overview

### Customer Home
```mermaid
flowchart TD
    A[Header: AI Service Marketplace] --> B[Greeting Card]
    B --> C[Request Input Card]
    C --> D[Example Prompts]
    D --> E[Find Provider Button]
    E --> F[Recent Bookings]
```

### Request Screen
```mermaid
flowchart TD
    A[Service Request Form] --> B[Text Input]
    B --> C[Language Chips]
    C --> D[Location/Area Optional]
    D --> E[Submit Request]
```

### Agent Thinking Screen
```mermaid
flowchart TD
    A[Finding Best Provider] --> B[Intent Agent Card]
    B --> C[Discovery Agent Card]
    C --> D[Ranking Agent Card]
    D --> E[Booking Agent Card]
    E --> F[Follow-up Agent Card]
    F --> G[View Raw Trace JSON]
```

### Provider Selection Screen
```mermaid
flowchart TD
    A[Top Providers] --> B[Recommended Provider Card]
    A --> C[Alternative Provider Card]
    A --> D[Alternative Provider Card]
    B --> E[Why Recommended]
    E --> F[Book Now Button]
```

### Booking Confirmation Screen
```mermaid
flowchart TD
    A[Booking Confirmed] --> B[Receipt Card]
    B --> C[Provider Details]
    B --> D[Time Slot]
    B --> E[Confirmation Code]
    A --> F[Follow-up Timeline]
    F --> G[Reminder Scheduled]
    F --> H[Completion Check Scheduled]
```

### Admin Trace Dashboard
```mermaid
flowchart TD
    A[Admin Dashboard] --> B[Stats Cards]
    A --> C[Sessions Table]
    C --> D[Trace Detail Page]
    D --> E[Agent Timeline]
    D --> F[Tool Input/Output JSON]
```
