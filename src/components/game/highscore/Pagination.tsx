'use client'

import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
  showFirstLast?: boolean
  maxVisiblePages?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  showFirstLast = true,
  maxVisiblePages = 5,
}: PaginationProps) {
  // Calculate visible page numbers
  const visiblePages = useMemo(() => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const half = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, start + maxVisiblePages - 1)

    if (end - start < maxVisiblePages - 1) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentPage, totalPages, maxVisiblePages])

  const handlePageClick = useCallback((page: number) => {
    if (!disabled && page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
    }
  }, [disabled, totalPages, currentPage, onPageChange])

  if (totalPages <= 1) return null

  const buttonBaseStyle = {
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.6)',
  }

  const buttonActiveStyle = {
    background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.3), rgba(0, 255, 255, 0.1))',
    border: '1px solid rgba(0, 255, 255, 0.6)',
    color: '#00ffff',
    boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
  }

  const buttonDisabledStyle = {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.2)',
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {/* First page button */}
      {showFirstLast && currentPage > 2 && (
        <motion.button
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={disabled ? buttonDisabledStyle : buttonBaseStyle}
          onClick={() => handlePageClick(1)}
          disabled={disabled}
          whileHover={disabled ? {} : { scale: 1.05, backgroundColor: 'rgba(0, 255, 255, 0.1)' }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          title="Premiere page"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6 1.41-1.41zM6 6h2v12H6V6z" />
          </svg>
        </motion.button>
      )}

      {/* Previous page button */}
      <motion.button
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={disabled || currentPage === 1 ? buttonDisabledStyle : buttonBaseStyle}
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        whileHover={disabled || currentPage === 1 ? {} : { scale: 1.05, backgroundColor: 'rgba(0, 255, 255, 0.1)' }}
        whileTap={disabled || currentPage === 1 ? {} : { scale: 0.95 }}
        title="Page precedente"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z" />
        </svg>
      </motion.button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {visiblePages[0] > 1 && (
          <>
            <motion.button
              className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm"
              style={buttonBaseStyle}
              onClick={() => handlePageClick(1)}
              disabled={disabled}
              whileHover={disabled ? {} : { scale: 1.05, backgroundColor: 'rgba(0, 255, 255, 0.1)' }}
              whileTap={disabled ? {} : { scale: 0.95 }}
            >
              1
            </motion.button>
            {visiblePages[0] > 2 && (
              <span className="px-2 text-white/30">...</span>
            )}
          </>
        )}

        {visiblePages.map((page) => {
          const isActive = page === currentPage

          return (
            <motion.button
              key={page}
              className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm"
              style={disabled ? buttonDisabledStyle : isActive ? buttonActiveStyle : buttonBaseStyle}
              onClick={() => handlePageClick(page)}
              disabled={disabled || isActive}
              whileHover={disabled || isActive ? {} : { scale: 1.05, backgroundColor: 'rgba(0, 255, 255, 0.1)' }}
              whileTap={disabled || isActive ? {} : { scale: 0.95 }}
              animate={isActive ? {
                boxShadow: ['0 0 10px rgba(0, 255, 255, 0.3)', '0 0 20px rgba(0, 255, 255, 0.5)', '0 0 10px rgba(0, 255, 255, 0.3)'],
              } : {}}
              transition={isActive ? { duration: 2, repeat: Infinity } : {}}
            >
              {page}
            </motion.button>
          )
        })}

        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="px-2 text-white/30">...</span>
            )}
            <motion.button
              className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm"
              style={buttonBaseStyle}
              onClick={() => handlePageClick(totalPages)}
              disabled={disabled}
              whileHover={disabled ? {} : { scale: 1.05, backgroundColor: 'rgba(0, 255, 255, 0.1)' }}
              whileTap={disabled ? {} : { scale: 0.95 }}
            >
              {totalPages}
            </motion.button>
          </>
        )}
      </div>

      {/* Next page button */}
      <motion.button
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={disabled || currentPage === totalPages ? buttonDisabledStyle : buttonBaseStyle}
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        whileHover={disabled || currentPage === totalPages ? {} : { scale: 1.05, backgroundColor: 'rgba(0, 255, 255, 0.1)' }}
        whileTap={disabled || currentPage === totalPages ? {} : { scale: 0.95 }}
        title="Page suivante"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
        </svg>
      </motion.button>

      {/* Last page button */}
      {showFirstLast && currentPage < totalPages - 1 && (
        <motion.button
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={disabled ? buttonDisabledStyle : buttonBaseStyle}
          onClick={() => handlePageClick(totalPages)}
          disabled={disabled}
          whileHover={disabled ? {} : { scale: 1.05, backgroundColor: 'rgba(0, 255, 255, 0.1)' }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          title="Derniere page"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6-1.41 1.41zM16 6h2v12h-2V6z" />
          </svg>
        </motion.button>
      )}
    </div>
  )
}

export default Pagination
