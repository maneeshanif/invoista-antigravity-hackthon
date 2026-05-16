import { StyleSheet, Text, type TextProps } from 'react-native';
import { Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'caption';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'caption' ? styles.caption : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Typography.fonts.primary,
    fontSize: Typography.sizes.md,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.md,
    lineHeight: 24,
  },
  title: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.xxxl,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.xl,
    lineHeight: 28,
  },
  caption: {
    fontFamily: Typography.fonts.primary,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
    opacity: 0.7,
  },
  link: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.md,
    lineHeight: 24,
    color: '#3B82F6',
  },
});
