import { HIGTheme } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof HIGTheme.light & keyof typeof HIGTheme.dark
) {
  const theme = 'dark'; // Force dark mode for MotoTune
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return HIGTheme[theme][colorName];
  }
}
