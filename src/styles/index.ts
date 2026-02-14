/**
 * Holographic Theme System - JavaScript/TypeScript Exports
 *
 * This file provides typed constants and utilities for the holographic CSS theme.
 * Import this file when you need to reference theme values in JavaScript/TypeScript code.
 */

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

export const HoloColors = {
  // Primary holographic colors
  cyan: '#00ffff',
  magenta: '#ff00ff',
  gold: '#ffd700',
  green: '#00ff88',
  red: '#ff4444',
  blue: '#4488ff',
  purple: '#aa44ff',
  orange: '#ff8800',
  white: '#ffffff',

  // Dimmed variants
  cyanDim: 'rgba(0, 255, 255, 0.6)',
  magentaDim: 'rgba(255, 0, 255, 0.6)',
  goldDim: 'rgba(255, 215, 0, 0.6)',
  greenDim: 'rgba(0, 255, 136, 0.6)',
  redDim: 'rgba(255, 68, 68, 0.6)',
  blueDim: 'rgba(68, 136, 255, 0.6)',
  purpleDim: 'rgba(170, 68, 255, 0.6)',

  // Background colors
  bgDark: 'rgba(0, 0, 0, 0.8)',
  bgMedium: 'rgba(20, 30, 50, 0.7)',
  bgLight: 'rgba(40, 60, 100, 0.5)',
  bgTransparent: 'rgba(0, 20, 40, 0.4)',
  bgPanel: 'rgba(10, 20, 35, 0.85)',

  // Border colors
  borderPrimary: 'rgba(0, 255, 255, 0.3)',
  borderAccent: 'rgba(255, 0, 255, 0.3)',
  borderSubtle: 'rgba(255, 255, 255, 0.1)',
  borderGold: 'rgba(255, 215, 0, 0.3)',
  borderDanger: 'rgba(255, 68, 68, 0.3)',
} as const;

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

export const HoloTransitions = {
  instant: '50ms ease',
  fast: '150ms ease',
  normal: '300ms ease',
  slow: '500ms ease',
  slower: '800ms ease',
} as const;

export const HoloTransitionDurations = {
  instant: 50,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
} as const;

// ============================================================================
// SPACING CONSTANTS
// ============================================================================

export const HoloSpacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const;

export const HoloSpacingValues = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// ============================================================================
// BORDER RADIUS CONSTANTS
// ============================================================================

export const HoloBorderRadius = {
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  round: '9999px',
} as const;

// ============================================================================
// GLOW EFFECTS
// ============================================================================

export const HoloGlow = {
  xs: '0 0 3px',
  sm: '0 0 5px',
  md: '0 0 10px',
  lg: '0 0 20px',
  xl: '0 0 30px',
} as const;

// ============================================================================
// BLUR EFFECTS
// ============================================================================

export const HoloBlur = {
  xs: 'blur(2px)',
  sm: 'blur(4px)',
  md: 'blur(8px)',
  lg: 'blur(16px)',
  xl: 'blur(24px)',
} as const;

// ============================================================================
// CSS CLASS NAMES
// ============================================================================

export const HoloClasses = {
  // Glass effects
  glass: 'holo-glass',
  glassDark: 'holo-glass-dark',
  glassLight: 'holo-glass-light',
  glassPanel: 'holo-glass-panel',

  // Glow effects
  glowCyan: 'holo-glow-cyan',
  glowMagenta: 'holo-glow-magenta',
  glowGold: 'holo-glow-gold',
  glowGreen: 'holo-glow-green',
  glowRed: 'holo-glow-red',
  glowBlue: 'holo-glow-blue',
  glowPurple: 'holo-glow-purple',

  // Text colors
  textCyan: 'holo-text-cyan',
  textMagenta: 'holo-text-magenta',
  textGold: 'holo-text-gold',
  textGreen: 'holo-text-green',
  textRed: 'holo-text-red',
  textBlue: 'holo-text-blue',
  textPurple: 'holo-text-purple',

  // Text effects
  textGlow: 'holo-text-glow',
  textGlowSubtle: 'holo-text-glow-subtle',
  textFlicker: 'holo-text-flicker',
  textChromatic: 'holo-text-chromatic',
  textGradient: 'holo-text-gradient',
  textGradientGold: 'holo-text-gradient-gold',
  textMono: 'holo-text-mono',

  // Animations
  pulse: 'holo-pulse',
  glowPulse: 'holo-glow-pulse',
  scan: 'holo-scan',
  shimmer: 'holo-shimmer',
  float: 'holo-float',
  rotate: 'holo-rotate',
  glitch: 'holo-glitch',
  glitchLoop: 'holo-glitch-loop',
  fadeIn: 'holo-fade-in',

  // Borders
  border: 'holo-border',
  borderAccent: 'holo-border-accent',
  borderGold: 'holo-border-gold',
  borderDanger: 'holo-border-danger',
  borderAnimated: 'holo-border-animated',
  borderCorners: 'holo-border-corners',

  // Cards
  card: 'holo-card',
  cardHeader: 'holo-card-header',
  cardHeaderTitle: 'holo-card-header-title',
  cardBody: 'holo-card-body',
  cardFooter: 'holo-card-footer',
  cardDanger: 'holo-card-danger',
  cardGold: 'holo-card-gold',

  // Buttons
  btn: 'holo-btn',
  btnPrimary: 'holo-btn-primary',
  btnSecondary: 'holo-btn-secondary',
  btnSuccess: 'holo-btn-success',
  btnDanger: 'holo-btn-danger',
  btnWarning: 'holo-btn-warning',
  btnGhost: 'holo-btn-ghost',
  btnIcon: 'holo-btn-icon',

  // Inputs
  input: 'holo-input',
  inputGroup: 'holo-input-group',
  inputLabel: 'holo-input-label',
  inputHelper: 'holo-input-helper',
  inputError: 'holo-input-error',
  inputErrorText: 'holo-input-error-text',
  textarea: 'holo-textarea',
  select: 'holo-select',

  // Tables
  table: 'holo-table',
  tableRow: 'holo-table-row',
  tableRowClickable: 'holo-table-row-clickable',
  tableRowSelected: 'holo-table-row-selected',
  tableStriped: 'holo-table-striped',

  // Progress
  progress: 'holo-progress',
  progressBar: 'holo-progress-bar',
  progressBarSuccess: 'holo-progress-bar-success',
  progressBarWarning: 'holo-progress-bar-warning',
  progressBarDanger: 'holo-progress-bar-danger',
  progressBarAnimated: 'holo-progress-bar-animated',
  progressThin: 'holo-progress-thin',

  // Badges
  badge: 'holo-badge',
  badgeCyan: 'holo-badge-cyan',
  badgeMagenta: 'holo-badge-magenta',
  badgeGold: 'holo-badge-gold',
  badgeGreen: 'holo-badge-green',
  badgeRed: 'holo-badge-red',
  badgeBlue: 'holo-badge-blue',

  // Misc
  tooltip: 'holo-tooltip',
  spinner: 'holo-spinner',
  spinnerSm: 'holo-spinner-sm',
  spinnerLg: 'holo-spinner-lg',
  loadingOverlay: 'holo-loading-overlay',
  divider: 'holo-divider',
  dividerSolid: 'holo-divider-solid',
  dividerVertical: 'holo-divider-vertical',
  scanlines: 'holo-scanlines',

  // Scrollbar
  scrollbar: 'holo-scrollbar',
  scrollbarHidden: 'holo-scrollbar-hidden',

  // Transitions
  transition: 'holo-transition',
  transitionFast: 'holo-transition-fast',
  transitionSlow: 'holo-transition-slow',

  // Z-index
  zBase: 'holo-z-base',
  zDropdown: 'holo-z-dropdown',
  zSticky: 'holo-z-sticky',
  zModal: 'holo-z-modal',
  zPopover: 'holo-z-popover',
  zTooltip: 'holo-z-tooltip',
  zMax: 'holo-z-max',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a CSS glow box-shadow value
 */
export function createGlow(
  color: string,
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'
): string {
  const glowSize = HoloGlow[size];
  return `${glowSize} ${color}`;
}

/**
 * Generate a CSS text-shadow glow value
 */
export function createTextGlow(
  color: string,
  intensity: 'subtle' | 'normal' | 'intense' = 'normal'
): string {
  switch (intensity) {
    case 'subtle':
      return `0 0 3px ${color}`;
    case 'normal':
      return `0 0 5px ${color}, 0 0 10px ${color}`;
    case 'intense':
      return `0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color}`;
  }
}

/**
 * Combine multiple CSS class names
 */
export function holoClasses(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get a CSS variable value by name
 */
export function getHoloVar(name: string): string {
  return `var(--holo-${name})`;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type HoloColorKey = keyof typeof HoloColors;
export type HoloTransitionKey = keyof typeof HoloTransitions;
export type HoloSpacingKey = keyof typeof HoloSpacing;
export type HoloBorderRadiusKey = keyof typeof HoloBorderRadius;
export type HoloGlowKey = keyof typeof HoloGlow;
export type HoloBlurKey = keyof typeof HoloBlur;
export type HoloClassKey = keyof typeof HoloClasses;
