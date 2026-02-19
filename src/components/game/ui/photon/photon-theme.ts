/**
 * Photon UI Theme
 *
 * CSS tokens for the EVE Online-inspired Photon glassmorphism UI.
 * 3-state opacity system: active (focused), inactive (blur), camera-drag (transparent).
 */

// ============================================================================
// COLORS
// ============================================================================

export const PHOTON_COLORS = {
  // Background layers
  panelBg: 'rgba(10, 14, 20, 0.75)',
  panelBgActive: 'rgba(10, 14, 20, 0.92)',
  panelBgInactive: 'rgba(10, 14, 20, 0.55)',
  panelBgDragging: 'rgba(10, 14, 20, 0.25)',

  // Borders
  borderDefault: 'rgba(80, 120, 160, 0.3)',
  borderActive: 'rgba(100, 180, 255, 0.5)',
  borderInactive: 'rgba(60, 90, 120, 0.2)',

  // Header
  headerBg: 'rgba(15, 22, 35, 0.9)',
  headerText: '#8BB8E8',
  headerTextActive: '#A8D4FF',

  // Text
  textPrimary: '#C8D8E8',
  textSecondary: '#7890A8',
  textMuted: '#4A5A6A',
  textHighlight: '#00AAFF',

  // Semantic
  danger: '#FF4444',
  warning: '#FFAA22',
  success: '#44CC66',
  info: '#3399FF',

  // Security level colors
  highsec: '#44CC44',
  lowsec: '#CC8800',
  nullsec: '#CC2200',
} as const

// ============================================================================
// BLUR & EFFECTS
// ============================================================================

export const PHOTON_EFFECTS = {
  blur: 'blur(12px) saturate(0.8)',
  blurLight: 'blur(8px) saturate(0.9)',
  blurHeavy: 'blur(16px) saturate(0.7)',
  shadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
  shadowActive: '0 4px 30px rgba(0, 100, 200, 0.2)',
  glowBorder: '0 0 10px rgba(100, 180, 255, 0.15)',
} as const

// ============================================================================
// OPACITY STATES
// ============================================================================

export const PHOTON_OPACITY = {
  active: 0.95,
  inactive: 0.7,
  cameraDrag: 0.3,
} as const

// ============================================================================
// CSS CLASS HELPERS
// ============================================================================

export function getPhotonPanelStyle(state: 'active' | 'inactive' | 'cameraDrag'): React.CSSProperties {
  const bg = state === 'active' ? PHOTON_COLORS.panelBgActive
    : state === 'inactive' ? PHOTON_COLORS.panelBgInactive
    : PHOTON_COLORS.panelBgDragging

  const border = state === 'active' ? PHOTON_COLORS.borderActive : PHOTON_COLORS.borderInactive

  return {
    background: bg,
    backdropFilter: PHOTON_EFFECTS.blur,
    WebkitBackdropFilter: PHOTON_EFFECTS.blur,
    border: `1px solid ${border}`,
    boxShadow: state === 'active' ? PHOTON_EFFECTS.shadowActive : PHOTON_EFFECTS.shadow,
    transition: 'all 0.3s ease',
  }
}
