import { View, type ViewProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HIGTheme } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  colorName?: keyof typeof HIGTheme.light & keyof typeof HIGTheme.dark;
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  colorName = 'systemBackground', 
  ...rest 
}: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, colorName);

  return <View style={[{ backgroundColor }, style]} {...rest} />;
}
