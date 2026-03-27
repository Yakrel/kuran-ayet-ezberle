import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../styles/theme';

type ErrorCardProps = {
  message: string;
};

export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    marginHorizontal: theme.spacing.XL,
    marginTop: theme.spacing.MD,
    borderRadius: theme.borderRadius.XLARGE,
    padding: 11,
    backgroundColor: theme.colors.ERROR_BG,
    borderWidth: 1,
    borderColor: theme.colors.ERROR_BORDER,
  },
  errorText: {
    color: theme.colors.ERROR_TEXT,
    fontWeight: '700',
  },
});
