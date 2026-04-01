import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

type PageHeaderProps = {
  title: string;
  pageProgressText: string;
};

export function PageHeader({ title, pageProgressText }: PageHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.pageHeaderRow, { borderBottomColor: theme.colors.BORDER_PRIMARY }]}>
      <Text style={[styles.pageTitle, { color: theme.colors.TEXT_PRIMARY }]}>{title}</Text>
      <Text style={[styles.pageProgressText, { color: theme.colors.TEXT_TERTIARY }]}>{pageProgressText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  pageTitle: {
    fontWeight: '800',
    fontSize: 15,
    flex: 1,
  },
  pageProgressText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
