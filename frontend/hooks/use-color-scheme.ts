import { useTheme } from '@/context/ThemeContext';

export function useColorScheme() {
  const { activeTheme } = useTheme();
  return activeTheme;
}
