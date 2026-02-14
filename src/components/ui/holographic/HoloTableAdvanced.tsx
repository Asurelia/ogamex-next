'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Column<T> {
  key: keyof T
  header: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface HoloTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
  selectedRow?: T
  loading?: boolean
  emptyMessage?: string
}

type SortDirection = 'asc' | 'desc' | null

interface SortState<T> {
  key: keyof T | null
  direction: SortDirection
}

export function HoloTableAdvanced<T extends object>({
  data,
  columns,
  onRowClick,
  selectedRow,
  loading = false,
  emptyMessage = 'No data available',
}: HoloTableProps<T>) {
  const [sortState, setSortState] = useState<SortState<T>>({
    key: null,
    direction: null,
  })
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const handleSort = useCallback((key: keyof T, sortable?: boolean) => {
    if (!sortable) return

    setSortState((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' }
      }
      return { key: null, direction: null }
    })
  }, [])

  const sortedData = useMemo(() => {
    if (!sortState.key || !sortState.direction) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortState.key!]
      const bVal = b[sortState.key!]

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      const comparison = aVal < bVal ? -1 : 1
      return sortState.direction === 'asc' ? comparison : -comparison
    })
  }, [data, sortState])

  const isRowSelected = useCallback(
    (row: T) => {
      if (!selectedRow) return false
      return JSON.stringify(row) === JSON.stringify(selectedRow)
    },
    [selectedRow]
  )

  const renderSortIcon = (key: keyof T, sortable?: boolean) => {
    if (!sortable) return null

    const isActive = sortState.key === key

    return (
      <motion.span
        className="ml-2 inline-flex flex-col items-center justify-center"
        initial={false}
        animate={{
          opacity: isActive ? 1 : 0.4,
        }}
      >
        <motion.svg
          width="8"
          height="5"
          viewBox="0 0 8 5"
          className="mb-0.5"
          animate={{
            opacity: isActive && sortState.direction === 'asc' ? 1 : 0.3,
            fill: isActive && sortState.direction === 'asc' ? '#00ffff' : '#6b7280',
          }}
        >
          <path d="M4 0L8 5H0L4 0Z" />
        </motion.svg>
        <motion.svg
          width="8"
          height="5"
          viewBox="0 0 8 5"
          animate={{
            opacity: isActive && sortState.direction === 'desc' ? 1 : 0.3,
            fill: isActive && sortState.direction === 'desc' ? '#00ffff' : '#6b7280',
          }}
        >
          <path d="M4 5L0 0H8L4 5Z" />
        </motion.svg>
      </motion.span>
    )
  }

  const SkeletonRow = () => (
    <tr>
      {columns.map((col, idx) => (
        <td
          key={idx}
          className="px-4 py-3 border-b border-cyan-500/10"
          style={{ width: col.width }}
        >
          <motion.div
            className="h-4 rounded"
            style={{
              background: 'linear-gradient(90deg, rgba(0,255,255,0.1) 0%, rgba(0,255,255,0.2) 50%, rgba(0,255,255,0.1) 100%)',
              backgroundSize: '200% 100%',
            }}
            animate={{
              backgroundPosition: ['0% 0%', '200% 0%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </td>
      ))}
    </tr>
  )

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Glow background */}
      <div
        className="absolute inset-0 rounded-lg blur-xl opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.15), transparent 70%)',
        }}
      />

      {/* Main container */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.9), rgba(5, 15, 30, 0.95))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
        }}
      >
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.3), transparent)',
              transform: 'translateX(-100%)',
            }}
            animate={{
              transform: ['translateX(-100%)', 'translateX(100%)'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 255, 0.05) 2px,
              rgba(0, 255, 255, 0.05) 4px
            )`,
          }}
        />

        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-b border-cyan-500/30 ${
                      col.sortable ? 'cursor-pointer select-none' : ''
                    }`}
                    style={{
                      color: '#00ffff',
                      textShadow: '0 0 10px rgba(0,255,255,0.5)',
                      width: col.width,
                      background: 'linear-gradient(180deg, rgba(0,255,255,0.1), transparent)',
                    }}
                    onClick={() => handleSort(col.key, col.sortable)}
                  >
                    <motion.div
                      className="flex items-center"
                      whileHover={col.sortable ? { x: 2 } : undefined}
                      transition={{ duration: 0.2 }}
                    >
                      {col.header}
                      {renderSortIcon(col.key, col.sortable)}
                    </motion.div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <AnimatePresence mode="wait">
                {loading ? (
                  // Skeleton loading state
                  Array.from({ length: 5 }).map((_, idx) => (
                    <SkeletonRow key={`skeleton-${idx}`} />
                  ))
                ) : sortedData.length === 0 ? (
                  // Empty state
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, rgba(0,255,255,0.1), rgba(0,200,255,0.05))',
                            border: '1px solid rgba(0,255,255,0.2)',
                          }}
                        >
                          <svg
                            className="w-8 h-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="rgba(0,255,255,0.5)"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                          </svg>
                        </div>
                        <span
                          className="text-sm"
                          style={{ color: 'rgba(150,200,230,0.7)' }}
                        >
                          {emptyMessage}
                        </span>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  // Data rows
                  sortedData.map((row, rowIdx) => {
                    const selected = isRowSelected(row)
                    const hovered = hoveredRow === rowIdx

                    return (
                      <motion.tr
                        key={rowIdx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: rowIdx * 0.05, duration: 0.3 }}
                        className={`relative transition-colors ${
                          onRowClick ? 'cursor-pointer' : ''
                        }`}
                        style={{
                          background: selected
                            ? 'linear-gradient(90deg, rgba(0,255,255,0.15), rgba(0,255,255,0.05))'
                            : hovered
                            ? 'rgba(0,255,255,0.05)'
                            : 'transparent',
                        }}
                        onMouseEnter={() => setHoveredRow(rowIdx)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onClick={() => onRowClick?.(row)}
                      >
                        {/* Selection indicator */}
                        {selected && (
                          <motion.div
                            layoutId="selection-indicator"
                            className="absolute left-0 top-0 bottom-0 w-[3px]"
                            style={{
                              background: 'linear-gradient(180deg, #00ffff, #0088ff)',
                              boxShadow: '0 0 10px rgba(0,255,255,0.6)',
                            }}
                          />
                        )}

                        {/* Hover glow */}
                        {hovered && !selected && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute left-0 top-0 bottom-0 w-[2px]"
                            style={{
                              background: 'rgba(0,255,255,0.5)',
                            }}
                          />
                        )}

                        {columns.map((col, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-4 py-3 text-sm border-b border-cyan-500/10"
                            style={{
                              color: selected ? '#00ffff' : 'rgba(200,230,255,0.9)',
                              textShadow: selected ? '0 0 8px rgba(0,255,255,0.3)' : 'none',
                              width: col.width,
                            }}
                          >
                            {col.render
                              ? col.render(row[col.key], row)
                              : String(row[col.key] ?? '')}
                          </td>
                        ))}
                      </motion.tr>
                    )
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute top-0 left-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
          />
        </div>
        <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(270deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute top-0 right-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
          />
        </div>
        <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute bottom-0 left-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(0deg, #00ffff, transparent)' }}
          />
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute bottom-0 right-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(270deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(0deg, #00ffff, transparent)' }}
          />
        </div>
      </div>
    </div>
  )
}

export default HoloTableAdvanced
