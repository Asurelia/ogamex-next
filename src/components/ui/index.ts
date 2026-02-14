// ============================================================================
// UI COMPONENT SYSTEM
// ============================================================================

// HolographicTooltip (legacy, standalone)
export { HolographicTooltip } from './HolographicTooltip'

// ============================================================================
// Holographic UI Components (re-exported from holographic/)
// ============================================================================

// Core components
export {
  HoloCard,
  HoloButton,
  HoloInput,
  HoloProgress,
  HoloModal,
  HoloTabs,
  HoloTabPanel,
  HoloBadge,
  HoloSpinner,
  HoloDivider,
} from './holographic'

export type {
  HoloCardProps,
  HoloButtonProps,
  HoloInputProps,
  HoloProgressProps,
  HoloModalProps,
  HoloTabsProps,
  HoloTab,
  HoloTabPanelProps,
  HoloBadgeProps,
  HoloSpinnerProps,
  HoloDividerProps,
} from './holographic'

// Data visualization components
export {
  HoloChart,
  HoloStats,
  HoloTable,
  HoloTimeline,
  HoloCountdown,
} from './holographic'

// Notification system
export {
  HoloNotification,
  HoloToastContainer,
} from './holographic'

// ============================================================================
// Toast System
// ============================================================================

export {
  ToastProvider,
  Toast,
  useToastContext,
  type ToastProviderProps,
  type ToastPosition,
  type ToastOptions,
  type ToastType,
  type ToastData,
} from './toast'
