Create a high-converting, premium Home Page that serves as the central hub for discovering services and initiating AI-powered requests. The design must emphasize ease of use and professional aesthetics.

## Design

The Home Page should follow a "Service-First" layout:

### 1. Header Section
- **Greeting**: Personalized "Good morning, [Name]" using Clerk's `useUser`.
- **Profile/Notifications**: Avatar and a notification bell with a badge for active job updates.

### 2. AI Request Hero (Main CTA)
- **Visual**: A prominent Glassmorphic card or a large, soft-glow input area.
- **Functionality**: A natural language input field (e.g., "Describe what you need help with...").
- **Interaction**: Pressing "Submit" should trigger the `/requests` endpoint and show a loading animation (AI Agent working).

### 3. Active Bookings (Status Section)
- **Visibility**: Only visible if the user has active or pending bookings.
- **Layout**: Horizontal scroll of cards showing:
    - Service Type (Icon + Name).
    - Status (e.g., "Finding Pro", "Provider En-route", "Job Started").
    - Progress Bar or Mini Timeline.

### 4. Categories Grid
- **Items**: Plumber, Electrician, Cleaner, HVAC, Handyman, etc.
- **Style**: Circular or rounded-square icons with subtle gradients.

### 5. Recommended Professionals (Service Cards)
- **Layout**: Vertical list of "Top Rated Professionals".
- **Card Content**:
    - High-quality avatar/photo.
    - Title (e.g., "Premium Home Cleaning").
    - Rating (⭐ 4.9) and Review Count.
    - Price Tag (e.g., "From Rs. 800").
    - Distance (e.g., "1.2 km away").
    - Action: "Book Now" button (Primary) and "View Profile" (Secondary).

## Implementation

### Data Fetching
- Integrate with `GET /providers` to populate the professional list.
- Use `GET /me` or a custom hook to fetch the current user's active bookings.
- Handle loading states with Shimmer effects (Skeleton UI).

### Components to Build
- `ServiceCard.tsx`: Premium card for professional listings.
- `CategoryChip.tsx`: Interactive chip for filtering services.
- `AIInput.tsx`: Custom text input with a "Magic" or "Agent" feel.
- `ActiveBookingCard.tsx`: Compact card for tracking live status.

### Interaction Logic
- Tapping a category should filter the providers list or navigate to a specialized category page.
- Tapping "Book Now" should open a modal or navigate to a booking confirmation screen.

## Check When Done

- [ ] Header correctly displays Clerk user information.
- [ ] AI Input field is stylized and functional (UI only for now).
- [ ] Categories are rendered and interactive.
- [ ] Provider list fetches data from the backend (mock or real API).
- [ ] "Active Bookings" section appears/disappears based on data.
- [ ] Responsive layout works on all screen sizes.
- [ ] All elements adhere to the "Premium Dark" theme (HSL colors, Glassmorphism).
