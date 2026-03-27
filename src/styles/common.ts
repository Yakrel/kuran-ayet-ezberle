import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { theme } from './theme';

export const commonStyles = {
  flex: {
    flex: 1,
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.PRIMARY_BG,
  },
  
  statusTopSpacer: {
    height: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + theme.spacing.XS : theme.spacing.LG,
    backgroundColor: theme.colors.PRIMARY_BG,
  },
  
  card: {
    borderRadius: theme.borderRadius.XXLARGE,
    backgroundColor: theme.colors.SECONDARY_BG,
    borderWidth: 1,
    borderColor: theme.colors.BORDER_PRIMARY,
    shadowColor: theme.shadow.medium.color,
    shadowOpacity: theme.shadow.medium.opacity,
    shadowRadius: theme.shadow.medium.radius,
    shadowOffset: theme.shadow.medium.offset,
    elevation: theme.shadow.medium.elevation,
  },
} as const;
