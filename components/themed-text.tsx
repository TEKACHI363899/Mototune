import { StyleSheet, Text, type TextProps } from 'react-native';
import { HIGTypography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: keyof typeof HIGTypography;
  colorName?: Parameters<typeof useThemeColor>[1];
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'body',
  colorName = 'label',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, colorName);
  const typographyStyle = HIGTypography[type];

  return (
    <Text
      style={[
        { color },
        typographyStyle,
        style,
      ]}
      {...rest}
    />
  );
}
