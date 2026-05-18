import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Animated } from 'react-native';
import { Sparkles, Send } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { GlassCard } from '@/components/shared/GlassCard';
import { ThemedText } from '@/components/themed-text';
import * as Haptics from 'expo-haptics';

interface AIInputProps {
  onSend: (text: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const AIInput = ({ onSend, loading, disabled }: AIInputProps) => {
  const [text, setText] = useState('');
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const handleSend = () => {
    if (text.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSend(text);
      setText('');
    }
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.dark.tint, Colors.dark.accent],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, { borderColor: glowColor, shadowColor: glowColor }]} />
      <GlassCard style={styles.card}>
        <View style={styles.inner}>
          <Sparkles size={20} color={Colors.dark.accent} style={styles.icon} />
          <TextInput
            style={[styles.input, disabled && styles.disabledInput]}
            placeholder={disabled ? "AI is coordinating service..." : "Describe what you need help with..."}
            placeholderTextColor={disabled ? "rgba(0, 243, 255, 0.6)" : "rgba(255,255,255,0.4)"}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={200}
            selectionColor={Colors.dark.accent}
            editable={!disabled}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!text.trim() || disabled) && styles.disabled]} 
            onPress={handleSend}
            disabled={!text.trim() || loading || disabled}
          >
            <Send size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </GlassCard>
      <ThemedText style={styles.hint}>
        {disabled ? "AI Concierge is processing your request..." : "AI Agent will process your request instantly"}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
    width: '100%',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: Radius.lg,
    opacity: 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  icon: {
    marginHorizontal: Spacing.sm,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: Typography.fonts.primary,
    fontSize: Typography.sizes.md,
    minHeight: 45,
    paddingVertical: Spacing.sm,
    backgroundColor: 'transparent',
  },
  disabledInput: {
    color: '#00F3FF',
    opacity: 0.8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.dark.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: Colors.dark.surface,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.icon,
    textAlign: 'center',
    marginTop: Spacing.xs,
    opacity: 0.7,
  },
});
