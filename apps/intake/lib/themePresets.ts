/**
 * Theme Presets for Intake App
 * 
 * Defines accent color presets that firms can choose from.
 * Each preset provides CSS variable values for theming.
 */

export type AccentPreset =
    | 'verilex_default'
    | 'slate'
    | 'indigo'
    | 'emerald'
    | 'amber'
    | 'rose';

export type ThemeMode = 'system' | 'light' | 'dark';

export type PresetColors = {
    accent: string;
    accentLight: string;
    accentGlow: string;
};

/**
 * Accent preset color definitions
 * These map to CSS variables used throughout the intake UI
 */
export const ACCENT_PRESETS: Record<AccentPreset, PresetColors> = {
    verilex_default: {
        accent: '#7c3aed',
        accentLight: '#a78bfa',
        accentGlow: 'rgba(139, 92, 246, 0.5)',
    },
    slate: {
        accent: '#475569',
        accentLight: '#94a3b8',
        accentGlow: 'rgba(148, 163, 184, 0.4)',
    },
    indigo: {
        accent: '#4f46e5',
        accentLight: '#818cf8',
        accentGlow: 'rgba(129, 140, 248, 0.5)',
    },
    emerald: {
        accent: '#059669',
        accentLight: '#34d399',
        accentGlow: 'rgba(52, 211, 153, 0.5)',
    },
    amber: {
        accent: '#d97706',
        accentLight: '#fbbf24',
        accentGlow: 'rgba(251, 191, 36, 0.5)',
    },
    rose: {
        accent: '#e11d48',
        accentLight: '#fb7185',
        accentGlow: 'rgba(251, 113, 133, 0.5)',
    },
};

/**
 * Get CSS variable overrides for a given accent preset
 */
export function getAccentCssVars(preset: AccentPreset): Record<string, string> {
    const colors = ACCENT_PRESETS[preset] ?? ACCENT_PRESETS.verilex_default;
    return {
        '--accent': colors.accent,
        '--accent-light': colors.accentLight,
        '--accent-glow': colors.accentGlow,
    };
}

/**
 * Light theme surface colors
 */
export const LIGHT_THEME_VARS: Record<string, string> = {
    '--g1': '#f8fafc',
    '--g2': '#f1f5f9',
    '--g3': '#e2e8f0',
    '--bg': '#ffffff',
    '--surface-0': 'rgba(241, 245, 249, 0.8)',
    '--surface-1': 'rgba(226, 232, 240, 0.6)',
    '--surface-2': 'rgba(203, 213, 225, 0.5)',
    '--border': 'rgba(0, 0, 0, 0.08)',
    '--border-highlight': 'rgba(0, 0, 0, 0.12)',
    '--muted': 'rgba(0, 0, 0, 0.5)',
    '--muted-2': 'rgba(0, 0, 0, 0.3)',
    '--text': 'rgba(0, 0, 0, 0.9)',
    '--text-0': '#0f172a',
    '--text-1': 'rgba(0, 0, 0, 0.85)',
    '--text-2': 'rgba(0, 0, 0, 0.6)',
};

/**
 * Dark theme surface colors (default)
 */
export const DARK_THEME_VARS: Record<string, string> = {
    '--g1': '#000000',
    '--g2': '#13001f',
    '--g3': '#1a0b2e',
    '--bg': '#030005',
    '--surface-0': 'rgba(20, 20, 25, 0.40)',
    '--surface-1': 'rgba(25, 25, 35, 0.25)',
    '--surface-2': 'rgba(30, 30, 45, 0.30)',
    '--border': 'rgba(255, 255, 255, 0.08)',
    '--border-highlight': 'rgba(255, 255, 255, 0.15)',
    '--muted': 'rgba(255, 255, 255, 0.5)',
    '--muted-2': 'rgba(255, 255, 255, 0.3)',
    '--text': 'rgba(255, 255, 255, 0.95)',
    '--text-0': '#ffffff',
    '--text-1': 'rgba(255, 255, 255, 0.9)',
    '--text-2': 'rgba(255, 255, 255, 0.6)',
};

/**
 * Get CSS variable overrides for a given theme mode
 */
export function getThemeCssVars(mode: 'light' | 'dark'): Record<string, string> {
    return mode === 'light' ? LIGHT_THEME_VARS : DARK_THEME_VARS;
}
