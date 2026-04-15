import React, { createContext, useContext, useMemo } from 'react';
import { THEMES, ThemeType } from '../constants/colors';
import { BORDER_RADIUS, FONT_SIZE, SPACING, UI_SIZES } from '../constants/spacing';

type ThemeColors = typeof THEMES.DARK;

type Theme = ThemeColors & {
  colors: ThemeColors;
  spacing: typeof SPACING;
  borderRadius: typeof BORDER_RADIUS;
  fontSize: typeof FONT_SIZE;
  sizes: typeof UI_SIZES;
  shadow: any;
};

type ThemeContextType = {
  theme: Theme;
  themeType: ThemeType;
  setTheme: (type: ThemeType) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  themeType,
  onThemeChange,
}: {
  children: React.ReactNode;
  themeType: ThemeType;
  onThemeChange: (type: ThemeType) => void;
}) {
  const theme = useMemo(() => {
    const colors = THEMES[themeType];
    return {
      colors,
      ...colors, // For backward compatibility if someone uses theme.PRIMARY_BG
      spacing: SPACING,
      borderRadius: BORDER_RADIUS,
      fontSize: FONT_SIZE,
      sizes: UI_SIZES,
      shadow: {
        medium: {
          color: colors.SHADOW,
          opacity: 0.3,
          radius: 12,
          offset: { width: 0, height: 4 },
          elevation: 6,
        },
        large: {
          color: colors.SHADOW,
          opacity: 0.4,
          radius: 20,
          offset: { width: 0, height: 10 },
          elevation: 10,
        },
        soft: {
          color: colors.SHADOW,
          opacity: 0.15,
          radius: 8,
          offset: { width: 0, height: 2 },
          elevation: 3,
        }
      },
    };
  }, [themeType]);

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme: theme as any, themeType, setTheme: onThemeChange } },
    children
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
