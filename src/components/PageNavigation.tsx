import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';

type PageNavigationProps = {
  canGoPreviousPage: boolean;
  canGoNextPage: boolean;
  onPreviousPress: () => void;
  onNextPress: () => void;
};

export function PageNavigation({
  canGoPreviousPage,
  canGoNextPage,
  onPreviousPress,
  onNextPress,
}: PageNavigationProps) {
  return (
    <>
      <Pressable
        style={[styles.pageNavButton, !canGoPreviousPage ? styles.pageButtonDisabled : undefined]}
        onPress={onPreviousPress}
        disabled={!canGoPreviousPage}
      >
        <Feather
          name="chevron-left"
          size={20}
          color={!canGoPreviousPage ? theme.colors.TEXT_MUTED : theme.colors.TEXT_PRIMARY}
        />
      </Pressable>
      <Pressable
        style={[styles.pageNavButton, !canGoNextPage ? styles.pageButtonDisabled : undefined]}
        onPress={onNextPress}
        disabled={!canGoNextPage}
      >
        <Feather
          name="chevron-right"
          size={20}
          color={!canGoNextPage ? theme.colors.TEXT_MUTED : theme.colors.TEXT_PRIMARY}
        />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  pageNavButton: {
    width: theme.sizes.PAGE_NAV_BUTTON_SIZE,
    height: theme.sizes.PAGE_NAV_BUTTON_SIZE,
    borderRadius: theme.borderRadius.MEDIUM,
    backgroundColor: theme.colors.DARK_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.BORDER_SECONDARY,
  },
  pageButtonDisabled: {
    opacity: 0.45,
  },
});
