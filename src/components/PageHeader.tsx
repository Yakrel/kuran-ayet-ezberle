import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../styles/theme';

type PageHeaderProps = {
  pageText: string;
  currentPage: number;
  pageProgressText: string;
};

export function PageHeader({ pageText, currentPage, pageProgressText }: PageHeaderProps) {
  return (
    <View style={styles.pageHeaderRow}>
      <Text style={styles.pageTitle}>
        {pageText} {currentPage + 1}
      </Text>
      <Text style={styles.pageProgressText}>{pageProgressText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.MD,
  },
  pageTitle: {
    color: theme.colors.TEXT_PRIMARY,
    fontWeight: '700',
    fontSize: theme.fontSize.LG,
    marginLeft: 2,
  },
  pageProgressText: {
    color: theme.colors.TEXT_MUTED,
    fontSize: theme.fontSize.XS,
    fontWeight: '700',
  },
});
