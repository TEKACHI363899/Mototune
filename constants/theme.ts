export const HIGTheme = {
  light: {
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',
    label: '#000000',
    secondaryLabel: '#3C3C43',
    systemRed: '#E31B23', // MotoTune core red
    systemBlue: '#007AFF',
    systemGreen: '#34C759',
    separator: '#C6C6C8',
  },
  dark: {
    systemBackground: '#050505', // MotoTune core black
    secondarySystemBackground: '#1C1C1E',
    tertiarySystemBackground: '#2C2C2E',
    label: '#FFFFFF',
    secondaryLabel: '#EBEBF5',
    systemRed: '#E31B23', // MotoTune core red
    systemBlue: '#0A84FF',
    systemGreen: '#30D158',
    separator: '#38383A',
  },
};

export const HIGTypography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' as const },
};

export const HIGSpacing = {
  base: 8,
  small: 16,
  medium: 24,
  large: 32,
  xlarge: 40,
};

export const HIGCornerRadius = {
  small: 10,
  medium: 16,
  large: 24,
};

export const HIGTouchTarget = {
  min: 44,
};
