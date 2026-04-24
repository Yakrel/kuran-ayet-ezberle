export const THEMES = {
  DARK: {
    // Background colors
    PRIMARY_BG: '#020617',
    SECONDARY_BG: '#0f172a',
    TERTIARY_BG: '#111827',
    CARD_BG: '#1f2937',
    DARK_BG: '#1e293b',
    
    // Accent colors
    ACCENT_PRIMARY: '#10b981', // Emerald green
    ACCENT_SECONDARY: '#059669',
    
    // Border colors
    BORDER_PRIMARY: '#1e293b',
    BORDER_SECONDARY: '#334155',
    BORDER_ACCENT: '#10b981',
    
    // Text colors
    TEXT_PRIMARY: '#f8fafc',
    TEXT_SECONDARY: '#e2e8f0',
    TEXT_TERTIARY: '#94a3b8',
    TEXT_MUTED: '#64748b',
    TEXT_PLACEHOLDER: '#475569',
    TEXT_ACCENT: '#10b981',
    
    // Status colors
    SUCCESS: '#10b981',
    SUCCESS_BG: '#064e3b',
    ERROR: '#b91c1c',
    ERROR_BG: '#7f1d1d',
    ERROR_BORDER: '#991b1b',
    ERROR_TEXT: '#fee2e2',
    WARNING: '#f59e0b',
    INFO: '#60a5fa',
    
    // UI element colors
    PICKER_ICON: '#cbd5e1',
    BUTTON_TEXT: '#e5e7eb',
    
    // Shadows
    SHADOW: '#000',
  },
  PAPER: {
    // Background colors (Sepia/Paper tones)
    PRIMARY_BG: '#fdf6e3', // Solarized base3
    SECONDARY_BG: '#eee8d5', // Solarized base2
    TERTIARY_BG: '#f5f2e9',
    CARD_BG: '#fffcf5',
    DARK_BG: '#eaddc0',
    
    // Accent colors (Deep Teal/Green)
    ACCENT_PRIMARY: '#2aa198', // Solarized cyan
    ACCENT_SECONDARY: '#268bd2', // Solarized blue
    
    // Border colors
    BORDER_PRIMARY: '#d5ccb5',
    BORDER_SECONDARY: '#93a1a1',
    BORDER_ACCENT: '#2aa198',
    
    // Text colors
    TEXT_PRIMARY: '#073642', // Solarized base02
    TEXT_SECONDARY: '#586e75', // Solarized base01
    TEXT_TERTIARY: '#657b83', // Solarized base00
    TEXT_MUTED: '#839496', // Solarized base0
    TEXT_PLACEHOLDER: '#93a1a1',
    TEXT_ACCENT: '#2aa198',
    
    // Status colors
    SUCCESS: '#859900', // Solarized green
    SUCCESS_BG: '#d7e8b0',
    ERROR: '#dc322f', // Solarized red
    ERROR_BG: '#f8d7da',
    ERROR_BORDER: '#f5c6cb',
    ERROR_TEXT: '#721c24',
    WARNING: '#b58900', // Solarized yellow
    INFO: '#268bd2',
    
    // UI element colors
    PICKER_ICON: '#586e75',
    BUTTON_TEXT: '#073642',
    
    // Shadows
    SHADOW: 'rgba(0,0,0,0.1)',
  }
} as const;

export type ThemeType = keyof typeof THEMES;
