Setup Clerk authentication for the Expo app. This includes token caching, secure store integration, auth screens (Sign In/Sign Up), and route protection.

## Design

Create a "Premium Dark" Auth experience:
- Background: Use the deep background from `theme.ts`.
- Components: Center-aligned forms with glassmorphic input fields.
- Buttons: Use `PremiumButton` for primary actions (Sign In, Sign Up).
- Logo: Clear, high-contrast logo at the top of the auth flow.
- Transitions: Smooth fade-in animations for screen transitions.

Key UI Elements:
- Custom `Clerk` integration that respects the app's premium design tokens.
- No default system alerts; use custom toast or inline validation messages.
- Social login buttons with premium styling (Google, Apple).

## Implementation

Configure Clerk for Expo:
- Use `expo-secure-store` for token caching (TokenCache implementation).
- Initialize `ClerkProvider` in `app/_layout.tsx` using the environment variables.

Auth Flow:
- Create `(auth)` group in `app/` directory.
- `app/(auth)/sign-in.tsx`: Custom sign-in screen using `useSignIn`.
- `app/(auth)/sign-up.tsx`: Custom sign-up screen using `useSignUp`.
- Implement a "Redirect" logic: 
  - If authenticated: allow access to `(tabs)`.
  - If unauthenticated: restrict to `(auth)`.

Middleware/Protection:
- Use `expo-router`'s `useAuth` or `useUser` hooks to protect routes at the layout level.
- Ensure `(tabs)` is only accessible when `isSignedIn` is true.

## Dependencies

install: `@clerk/clerk-expo`, `expo-secure-store`, `expo-linking`.

## Check When Done

- [ ] `ClerkProvider` is correctly wrapping the root layout.
- [ ] `TokenCache` is implemented using `expo-secure-store`.
- [ ] Sign-in and Sign-up screens are functional and styled with premium tokens.
- [ ] Unauthenticated users are automatically redirected to `sign-in`.
- [ ] Social auth (Google/Apple) works as expected.
- [ ] `npm run build` passes.
