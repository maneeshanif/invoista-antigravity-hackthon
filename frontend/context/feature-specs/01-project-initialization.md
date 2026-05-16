Initialize the Expo project with a premium design system, essential routing structure, and core UI tokens. This sets the foundation for the AI Service Marketplace frontend.

## Design

Create a "Premium Dark" visual identity:
- Base Background: Deep charcoal/black (`#0A0A0B`).
- Accents: Vibrant Electric Blue or Purple (`#3B82F6` or `#8B5CF6`).
- Surfaces: Glassmorphic cards with subtle borders (`rgba(255,255,255,0.05)`).
- Typography: Use `Inter` or `Outfit` for a modern look. Avoid system defaults where possible.
- Spacing: Strict 4px/8px grid system.

Key UI Elements:
- Custom Tab Bar: Floating or glassmorphic design.
- Typography: Large, bold headings with generous letter spacing.
- Interactions: Subtle haptic feedback and micro-animations for all interactive elements.

## Implementation

Update `constants/theme.ts`:
- Define a full palette of HSL-based colors for consistency.
- Add spacing, radius, and shadow tokens.

Configure `app/_layout.tsx`:
- Setup `Stack` and `Tabs` navigation with custom headers and tab bar.
- Add `ThemeProvider` and `SafeProvider`.
- Integrate `expo-font` to load custom premium fonts.

Create `components/shared`:
- `PremiumButton`: A highly stylized button with gradients and haptics.
- `GlassCard`: A reusable glassmorphic container.
- `ThemedText`: A text component that respects the design system.

Setup Global State:
- Initialize a simple context for managing UI state (e.g., active agent trace visibility).

## Dependencies

install: `lucide-react-native`, `expo-haptics`, `react-native-reanimated`, `expo-font`, `@expo-google-fonts/outfit`.

## Check When Done

- [ ] `constants/theme.ts` contains premium color tokens.
- [ ] Expo Router is configured with custom tab styling.
- [ ] Custom fonts (Outfit/Inter) are loading and applied.
- [ ] Shared components (`PremiumButton`, `GlassCard`) are functional.
- [ ] App launches without errors on Web/Android/iOS.
