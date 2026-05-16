# Feature: Provider Profile Screen

Create a detailed, high-conversion profile screen for service providers (professionals). The design must feel elite and emphasize the professional's credibility.

## Design Specs

### 1. Hero Header
- **Visual**: Large, high-resolution profile or workspace image.
- **Overlays**: Gradient overlay for text readability.
- **Controls**: Back button (floating glass) and Share/Favorite icons.

### 2. Professional Info
- **Identity**: Name, verified badge (Cyan), and primary service category.
- **Location**: Neighborhood/Distance from user.
- **Availability**: "Online Now" or "Available Today" status indicator.

### 3. Trust Stats (Horizontal Row)
- **Jobs**: Total completed requests.
- **Rating**: Large star rating with review count.
- **Experience**: Years in the industry.
- **Response**: Typical response time (e.g., "5 mins").

### 4. About & Services
- **Bio**: Short, professional summary.
- **Expertise**: List of specific skills (e.g., "Pipe Repair", "Gas Installation").
- **Pricing**: Transparent hourly or starting rates.

### 5. Reviews Section
- **Visual**: Card-based reviews with star ratings and timestamps.
- **Interaction**: "View all reviews" link.

### 6. Action Bar (Sticky Footer)
- **Primary CTA**: "Hire [Name]" button with immediate navigation to Booking.
- **Secondary CTA**: "Chat" icon for pre-booking inquiries.

## Technical Requirements
- **Route**: `/provider/[id]`
- **Transitions**: Smooth scroll with sticky header effects.
- **Data**: Dynamic fetching based on `id` (mocked for now).
