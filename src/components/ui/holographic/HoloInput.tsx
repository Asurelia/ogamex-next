'use client'

import React, { useState, useRef, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

export interface HoloInputProps {
  type?: 'text' | 'number' | 'password' | 'email' | 'search'
  label?: string
  placeholder?: string
  value?: string | number
  defaultValue?: string | number
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  error?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  min?: number
  max?: number
  step?: number
  autoComplete?: string
  className?: string
  inputClassName?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: {
    padding: 'py-1.5 px-2',
    fontSize: 'text-xs',
    height: 'h-8',
  },
  md: {
    padding: 'py-2.5 px-3',
    fontSize: 'text-sm',
    height: 'h-10',
  },
  lg: {
    padding: 'py-3.5 px-4',
    fontSize: 'text-base',
    height: 'h-12',
  },
}

export function HoloInput({
  type = 'text',
  label,
  placeholder,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  error,
  icon,
  iconPosition = 'left',
  disabled = false,
  readOnly = false,
  required = false,
  min,
  max,
  step,
  autoComplete,
  className,
  inputClassName,
  name,
  size = 'md',
}: HoloInputProps) {
  const sizes = sizeStyles[size]
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(
    Boolean(value || defaultValue)
  )
  const id = useId()

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    onFocus?.()
  }, [onFocus])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onBlur?.()
  }, [onBlur])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setHasValue(Boolean(newValue))
    onChange?.(newValue)
  }, [onChange])

  const isLabelFloating = isFocused || hasValue || Boolean(placeholder)

  const borderColor = error
    ? 'rgba(255, 68, 68, 0.5)'
    : isFocused
      ? 'rgba(0, 255, 255, 0.6)'
      : 'rgba(0, 255, 255, 0.3)'

  const glowColor = error
    ? 'rgba(255, 68, 68, 0.3)'
    : 'rgba(0, 255, 255, 0.3)'

  return (
    <div className={clsx('relative', className)}>
      {/* Input container */}
      <div className="relative">
        {/* Glow effect */}
        <motion.div
          className="absolute -inset-[1px] rounded-lg pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${glowColor}, transparent, ${glowColor})`,
            filter: 'blur(4px)',
          }}
          animate={{
            opacity: isFocused ? 0.6 : 0,
          }}
          transition={{ duration: 0.2 }}
        />

        {/* Input wrapper */}
        <div
          className={clsx(
            'relative flex items-center rounded-lg overflow-hidden',
            'transition-all duration-200',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(10, 20, 35, 0.8))',
            border: `1px solid ${borderColor}`,
            boxShadow: isFocused
              ? `0 0 15px ${glowColor}, inset 0 0 10px rgba(0, 0, 0, 0.3)`
              : 'inset 0 0 10px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Left icon */}
          {icon && iconPosition === 'left' && (
            <motion.div
              className="flex items-center justify-center pl-3 text-cyan-400"
              animate={{
                opacity: isFocused ? 1 : 0.6,
                scale: isFocused ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}

          {/* Input field */}
          <div className="relative flex-1">
            {/* Floating label */}
            {label && (
              <motion.label
                htmlFor={id}
                className={clsx(
                  'absolute left-3 pointer-events-none',
                  'text-sm font-medium tracking-wide',
                  'origin-left',
                  required && "after:content-['*'] after:ml-1 after:text-red-400"
                )}
                style={{
                  color: error
                    ? '#ff4444'
                    : isFocused
                      ? '#00ffff'
                      : 'rgba(255, 255, 255, 0.5)',
                  textShadow: isFocused ? '0 0 8px rgba(0, 255, 255, 0.5)' : 'none',
                }}
                initial={false}
                animate={{
                  y: isLabelFloating ? -24 : 0,
                  scale: isLabelFloating ? 0.85 : 1,
                  x: isLabelFloating ? -4 : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {label}
              </motion.label>
            )}

            <input
              ref={inputRef}
              id={id}
              name={name}
              type={type}
              value={value}
              defaultValue={defaultValue}
              placeholder={isLabelFloating ? placeholder : undefined}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              min={min}
              max={max}
              step={step}
              autoComplete={autoComplete}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={clsx(
                'w-full bg-transparent outline-none',
                'text-white placeholder-white/30',
                'py-3 px-3',
                label && 'pt-5 pb-2',
                icon && iconPosition === 'left' && 'pl-1',
                icon && iconPosition === 'right' && 'pr-1',
                disabled && 'cursor-not-allowed',
                inputClassName
              )}
              style={{
                caretColor: error ? '#ff4444' : '#00ffff',
              }}
            />
          </div>

          {/* Right icon */}
          {icon && iconPosition === 'right' && (
            <motion.div
              className="flex items-center justify-center pr-3 text-cyan-400"
              animate={{
                opacity: isFocused ? 1 : 0.6,
                scale: isFocused ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}

          {/* Focus scan line */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                className="absolute bottom-0 left-0 h-[2px] pointer-events-none"
                style={{
                  background: error
                    ? 'linear-gradient(90deg, transparent, #ff4444, transparent)'
                    : 'linear-gradient(90deg, transparent, #00ffff, transparent)',
                  boxShadow: error
                    ? '0 0 8px rgba(255, 68, 68, 0.5)'
                    : '0 0 8px rgba(0, 255, 255, 0.5)',
                }}
                initial={{ width: 0, left: '50%', x: '-50%' }}
                animate={{ width: '100%', left: 0, x: 0 }}
                exit={{ width: 0, left: '50%', x: '-50%' }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Corner decorations */}
        <div
          className={clsx(
            'absolute top-0 left-0 w-2 h-2 pointer-events-none transition-opacity duration-200',
            isFocused ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div
            className="absolute top-0 left-0 w-full h-[1px]"
            style={{ background: error ? '#ff4444' : '#00ffff' }}
          />
          <div
            className="absolute top-0 left-0 w-[1px] h-full"
            style={{ background: error ? '#ff4444' : '#00ffff' }}
          />
        </div>
        <div
          className={clsx(
            'absolute top-0 right-0 w-2 h-2 pointer-events-none transition-opacity duration-200',
            isFocused ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div
            className="absolute top-0 right-0 w-full h-[1px]"
            style={{ background: error ? '#ff4444' : '#00ffff' }}
          />
          <div
            className="absolute top-0 right-0 w-[1px] h-full"
            style={{ background: error ? '#ff4444' : '#00ffff' }}
          />
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="flex items-center gap-1 mt-1.5 px-1"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {/* Error icon */}
            <svg
              className="w-3.5 h-3.5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span
              className="text-xs font-medium"
              style={{
                color: '#ff4444',
                textShadow: '0 0 8px rgba(255, 68, 68, 0.3)',
              }}
            >
              {error}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default HoloInput
