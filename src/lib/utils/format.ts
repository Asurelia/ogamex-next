/**
 * Centralized formatting utilities for OGameX
 * All formatting functions should be imported from here to avoid duplication
 */

/**
 * Format large numbers with K, M, B suffixes
 * @example formatNumber(1500) => "1.5K"
 * @example formatNumber(1500000) => "1.5M"
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B'
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M'
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K'
  }
  return Math.floor(num).toLocaleString()
}

/**
 * Format number with full locale string (no abbreviation)
 */
export function formatNumberFull(num: number): string {
  return Math.floor(num).toLocaleString()
}

/**
 * Format coordinates as [G:S:P]
 */
export function formatCoordinates(
  galaxy: number,
  system: number,
  position: number
): string {
  return `[${galaxy}:${system}:${position}]`
}

/**
 * Format coordinates object as [G:S:P]
 */
export function formatCoordinatesObj(coords: {
  galaxy: number
  system: number
  position: number
}): string {
  return formatCoordinates(coords.galaxy, coords.system, coords.position)
}

/**
 * Format time remaining until a target date
 * @example formatTimeRemaining(futureDate) => "2h 15m 30s"
 */
export function formatTimeRemaining(targetDate: Date): string {
  const now = Date.now()
  const target = targetDate.getTime()
  const diff = Math.max(0, target - now)

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Format distance to now (like date-fns formatDistanceToNow)
 * @example formatDistanceToNow(pastDate) => "5 minutes"
 * @example formatDistanceToNow(futureDate) => "in 2 hours"
 */
export function formatDistanceToNow(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = Date.now()
  const target = d.getTime()
  const diffMs = Math.abs(now - target)
  const isPast = now > target

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  let result: string
  if (diffSec < 60) {
    result = 'less than a minute'
  } else if (diffMin < 60) {
    result = `${diffMin} minute${diffMin > 1 ? 's' : ''}`
  } else if (diffHour < 24) {
    result = `${diffHour} hour${diffHour > 1 ? 's' : ''}`
  } else if (diffDay < 7) {
    result = `${diffDay} day${diffDay > 1 ? 's' : ''}`
  } else if (diffWeek < 4) {
    result = `${diffWeek} week${diffWeek > 1 ? 's' : ''}`
  } else if (diffMonth < 12) {
    result = `${diffMonth} month${diffMonth > 1 ? 's' : ''}`
  } else {
    result = `${diffYear} year${diffYear > 1 ? 's' : ''}`
  }

  return isPast ? result : `in ${result}`
}

/**
 * Format time ago (relative time)
 * @example formatTimeAgo(pastDate) => "5 minutes ago"
 */
export function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const past = date.getTime()
  const diffMs = now - past
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return 'Just now'
  } else if (diffMin < 60) {
    return `${diffMin}m ago`
  } else if (diffHour < 24) {
    return `${diffHour}h ago`
  } else {
    return `${diffDay}d ago`
  }
}

/**
 * Format duration in seconds to human readable
 * @example formatDuration(3665) => "1h 1m 5s"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

/**
 * Format a date to locale string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString()
}

/**
 * Format a date to locale datetime string
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString()
}

/**
 * Format server time (HH:MM:SS)
 */
export function formatServerTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format resource amount with color hint
 */
export function formatResource(
  amount: number,
  type: 'metal' | 'crystal' | 'deuterium' | 'energy'
): { value: string; color: string } {
  const colors = {
    metal: '#cccccc',
    crystal: '#88ccff',
    deuterium: '#00cccc',
    energy: '#ffcc00',
  }
  return {
    value: formatNumber(amount),
    color: colors[type],
  }
}
