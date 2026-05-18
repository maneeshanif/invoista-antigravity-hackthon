import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@clerk/expo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme, ThemeMode } from '@/context/ThemeContext';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function ModalScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  const handleThemeChange = (mode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(mode);
  };

  const renderSegment = (mode: ThemeMode, label: string) => (
    <TouchableOpacity
      style={[styles.segmentButton, theme === mode && styles.segmentActive]}
      onPress={() => handleThemeChange(mode)}
    >
      <ThemedText style={[styles.segmentText, theme === mode && styles.segmentTextActive]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Appearance</ThemedText>
        <View style={styles.segmentContainer}>
          {renderSegment('light', 'Light')}
          {renderSegment('dark', 'Dark')}
          {renderSegment('system', 'System')}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.bold,
    marginBottom: Spacing.md,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.lg,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  segmentActive: {
    backgroundColor: Colors.dark.accent,
  },
  segmentText: {
    fontFamily: Typography.fonts.medium,
    color: '#FFF',
  },
  segmentTextActive: {
    color: '#000',
    fontFamily: Typography.fonts.bold,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.3)',
  },
  signOutText: {
    color: '#FF4B4B',
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.md,
  },
});
