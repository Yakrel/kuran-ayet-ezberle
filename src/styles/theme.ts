import { COLORS } from '../constants/colors';
import { BORDER_RADIUS, FONT_SIZE, SPACING, UI_SIZES } from '../constants/spacing';

export const theme = {
  colors: COLORS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  fontSize: FONT_SIZE,
  sizes: UI_SIZES,
  
  // Refined shadows
  shadow: {
    medium: {
      color: COLORS.SHADOW,
      opacity: 0.3,
      radius: 12,
      offset: { width: 0, height: 4 },
      elevation: 6,
    },
    large: {
      color: COLORS.SHADOW,
      opacity: 0.4,
      radius: 20,
      offset: { width: 0, height: 10 },
      elevation: 10,
    },
    soft: {
      color: COLORS.SHADOW,
      opacity: 0.15,
      radius: 8,
      offset: { width: 0, height: 2 },
      elevation: 3,
    }
  },
} as const;

export type Theme = typeof theme;
