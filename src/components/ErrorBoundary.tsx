import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { theme } from '../styles/theme';
import { inferDeviceLanguage } from '../utils/language';
import { TRANSLATIONS } from '../i18n/translations';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const language = inferDeviceLanguage();
      const text = TRANSLATIONS[language];

      return (
        <View style={styles.container}>
          <Text style={styles.title}>{text.unexpectedError}</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>{text.restartApp}</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.SECONDARY_BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: theme.colors.TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    color: theme.colors.TEXT_SECONDARY,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: theme.colors.ACCENT_PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: theme.colors.TEXT_PRIMARY,
    fontWeight: '600',
  },
});
