import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';

interface CategoryChipProps {
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onPress: () => void;
}

export const CategoryChip = ({ label, icon, isActive, onPress }: CategoryChipProps) => {
  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <TouchableOpacity 
      style={[styles.container, isActive && styles.activeContainer]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
        {icon}
      </View>
      <ThemedText style={[styles.label, isActive && styles.activeLabel]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: Spacing.lg,
    gap: Spacing.xs,
  },
  activeContainer: {
    // Optional scaling or effect
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  activeIconWrapper: {
    backgroundColor: Colors.dark.tint,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.medium,
    color: Colors.dark.icon,
  },
  activeLabel: {
    color: '#FFFFFF',
  },
});
