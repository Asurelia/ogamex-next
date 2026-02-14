'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

interface HoloChartProps {
  type: 'bar' | 'line' | 'donut'
  data: ChartDataPoint[]
  height?: number
  showLegend?: boolean
  animated?: boolean
}

const DEFAULT_COLORS = [
  '#00ffff',
  '#0088ff',
  '#00ff88',
  '#ff8800',
  '#ff00ff',
  '#ffff00',
  '#88ff00',
  '#ff0088',
]

function BarChart({
  data,
  height,
  animated,
}: {
  data: ChartDataPoint[]
  height: number
  animated: boolean
}) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const barWidth = Math.max(20, Math.min(60, (100 / data.length) * 0.7))
  const gap = (100 - barWidth * data.length) / (data.length + 1)

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        {data.map((item, idx) => {
          const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
          return (
            <linearGradient
              key={`bar-gradient-${idx}`}
              id={`bar-gradient-${idx}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.3" />
            </linearGradient>
          )
        })}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((percent) => (
        <line
          key={percent}
          x1="0"
          y1={height - (percent / 100) * (height - 20)}
          x2="100"
          y2={height - (percent / 100) * (height - 20)}
          stroke="rgba(0,255,255,0.1)"
          strokeWidth="0.3"
          strokeDasharray="2,2"
        />
      ))}

      {/* Bars */}
      {data.map((item, idx) => {
        const barHeight = (item.value / maxValue) * (height - 20)
        const x = gap + idx * (barWidth + gap)
        const y = height - barHeight
        const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
        const isHovered = hoveredBar === idx

        return (
          <g key={idx}>
            {/* Bar glow */}
            <motion.rect
              x={x - 1}
              y={y - 1}
              width={barWidth + 2}
              height={barHeight + 2}
              fill="none"
              stroke={color}
              strokeWidth="1"
              opacity={isHovered ? 0.8 : 0.3}
              filter="url(#glow)"
              initial={animated ? { height: 0, y: height } : undefined}
              animate={{ height: barHeight + 2, y: y - 1 }}
              transition={{ delay: idx * 0.1, duration: 0.6, ease: 'easeOut' }}
            />

            {/* Main bar */}
            <motion.rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={`url(#bar-gradient-${idx})`}
              rx="1"
              onMouseEnter={() => setHoveredBar(idx)}
              onMouseLeave={() => setHoveredBar(null)}
              style={{ cursor: 'pointer' }}
              initial={animated ? { height: 0, y: height } : undefined}
              animate={{
                height: barHeight,
                y,
                opacity: isHovered ? 1 : 0.8,
              }}
              transition={{ delay: idx * 0.1, duration: 0.6, ease: 'easeOut' }}
            />

            {/* Value label on hover */}
            <AnimatePresence>
              {isHovered && (
                <motion.g
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                >
                  <rect
                    x={x + barWidth / 2 - 10}
                    y={y - 18}
                    width="20"
                    height="14"
                    fill="rgba(10,25,40,0.9)"
                    stroke={color}
                    strokeWidth="0.5"
                    rx="2"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    fill={color}
                    fontSize="6"
                    fontFamily="monospace"
                  >
                    {item.value}
                  </text>
                </motion.g>
              )}
            </AnimatePresence>
          </g>
        )
      })}
    </svg>
  )
}

function LineChart({
  data,
  height,
  animated,
}: {
  data: ChartDataPoint[]
  height: number
  animated: boolean
}) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const padding = 10

  const points = data.map((item, idx) => ({
    x: padding + (idx / Math.max(1, data.length - 1)) * (100 - padding * 2),
    y: height - padding - (item.value / maxValue) * (height - padding * 2),
    ...item,
  }))

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ')

  const areaD = `${pathD} L ${points[points.length - 1]?.x ?? padding} ${height - padding} L ${padding} ${height - padding} Z`

  const color = data[0]?.color || DEFAULT_COLORS[0]

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={DEFAULT_COLORS[1]} />
        </linearGradient>
        <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="line-glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((percent) => (
        <line
          key={percent}
          x1={padding}
          y1={height - padding - (percent / 100) * (height - padding * 2)}
          x2={100 - padding}
          y2={height - padding - (percent / 100) * (height - padding * 2)}
          stroke="rgba(0,255,255,0.1)"
          strokeWidth="0.3"
          strokeDasharray="2,2"
        />
      ))}

      {/* Area fill */}
      <motion.path
        d={areaD}
        fill="url(#area-gradient)"
        initial={animated ? { opacity: 0 } : undefined}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      />

      {/* Line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="url(#line-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#line-glow)"
        initial={animated ? { pathLength: 0 } : undefined}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
      />

      {/* Data points */}
      {points.map((point, idx) => {
        const isHovered = hoveredPoint === idx
        const pointColor = point.color || color

        return (
          <g key={idx}>
            {/* Point glow */}
            <motion.circle
              cx={point.x}
              cy={point.y}
              r={isHovered ? 4 : 2}
              fill={pointColor}
              opacity={isHovered ? 0.5 : 0.3}
              filter="url(#line-glow)"
              initial={animated ? { scale: 0 } : undefined}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
            />

            {/* Point */}
            <motion.circle
              cx={point.x}
              cy={point.y}
              r={isHovered ? 3 : 1.5}
              fill="rgba(10,25,40,1)"
              stroke={pointColor}
              strokeWidth="1"
              onMouseEnter={() => setHoveredPoint(idx)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: 'pointer' }}
              initial={animated ? { scale: 0 } : undefined}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
            />

            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.g
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                >
                  <rect
                    x={point.x - 15}
                    y={point.y - 20}
                    width="30"
                    height="14"
                    fill="rgba(10,25,40,0.95)"
                    stroke={pointColor}
                    strokeWidth="0.5"
                    rx="2"
                  />
                  <text
                    x={point.x}
                    y={point.y - 10}
                    textAnchor="middle"
                    fill={pointColor}
                    fontSize="6"
                    fontFamily="monospace"
                  >
                    {point.value}
                  </text>
                </motion.g>
              )}
            </AnimatePresence>
          </g>
        )
      })}
    </svg>
  )
}

function DonutChart({
  data,
  height,
  animated,
}: {
  data: ChartDataPoint[]
  height: number
  animated: boolean
}) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const size = Math.min(height, 100)
  const cx = 50
  const cy = size / 2
  const outerRadius = size / 2 - 5
  const innerRadius = outerRadius * 0.6

  const segments = useMemo(() => {
    let currentAngle = -90

    return data.map((item, idx) => {
      const angle = (item.value / total) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle = endAngle

      const startRad = (startAngle * Math.PI) / 180
      const endRad = (endAngle * Math.PI) / 180

      const x1 = cx + outerRadius * Math.cos(startRad)
      const y1 = cy + outerRadius * Math.sin(startRad)
      const x2 = cx + outerRadius * Math.cos(endRad)
      const y2 = cy + outerRadius * Math.sin(endRad)
      const x3 = cx + innerRadius * Math.cos(endRad)
      const y3 = cy + innerRadius * Math.sin(endRad)
      const x4 = cx + innerRadius * Math.cos(startRad)
      const y4 = cy + innerRadius * Math.sin(startRad)

      const largeArc = angle > 180 ? 1 : 0

      const d = [
        `M ${x1} ${y1}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ')

      return {
        ...item,
        d,
        color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        percentage: ((item.value / total) * 100).toFixed(1),
      }
    })
  }, [data, total, cx, cy, outerRadius, innerRadius])

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${size}`}
      className="overflow-visible"
    >
      <defs>
        <filter id="donut-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Segments */}
      {segments.map((segment, idx) => {
        const isHovered = hoveredSegment === idx

        return (
          <g key={idx}>
            {/* Glow layer */}
            <motion.path
              d={segment.d}
              fill={segment.color}
              opacity={isHovered ? 0.5 : 0.2}
              filter="url(#donut-glow)"
              initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
              animate={{ scale: 1, opacity: isHovered ? 0.5 : 0.2 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />

            {/* Main segment */}
            <motion.path
              d={segment.d}
              fill={segment.color}
              opacity={isHovered ? 1 : 0.8}
              stroke="rgba(10,25,40,0.8)"
              strokeWidth="0.5"
              onMouseEnter={() => setHoveredSegment(idx)}
              onMouseLeave={() => setHoveredSegment(null)}
              style={{ cursor: 'pointer', transformOrigin: `${cx}px ${cy}px` }}
              initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
              animate={{
                scale: isHovered ? 1.05 : 1,
                opacity: isHovered ? 1 : 0.8,
              }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
            />
          </g>
        )
      })}

      {/* Center circle */}
      <circle
        cx={cx}
        cy={cy}
        r={innerRadius - 2}
        fill="rgba(10,25,40,0.9)"
        stroke="rgba(0,255,255,0.3)"
        strokeWidth="0.5"
      />

      {/* Center text */}
      <text
        x={cx}
        y={cy - 3}
        textAnchor="middle"
        fill="#00ffff"
        fontSize="8"
        fontFamily="monospace"
        style={{ textShadow: '0 0 8px rgba(0,255,255,0.5)' }}
      >
        {hoveredSegment !== null ? `${segments[hoveredSegment].percentage}%` : 'Total'}
      </text>
      <text
        x={cx}
        y={cy + 7}
        textAnchor="middle"
        fill="rgba(150,200,230,0.8)"
        fontSize="6"
        fontFamily="monospace"
      >
        {hoveredSegment !== null ? segments[hoveredSegment].label : total}
      </text>
    </svg>
  )
}

function Legend({
  data,
  hoveredIndex,
  onHover,
}: {
  data: ChartDataPoint[]
  hoveredIndex: number | null
  onHover: (idx: number | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-3 mt-4 justify-center">
      {data.map((item, idx) => {
        const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
        const isHovered = hoveredIndex === idx

        return (
          <motion.div
            key={idx}
            className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer"
            style={{
              background: isHovered ? `${color}20` : 'transparent',
              border: `1px solid ${isHovered ? color : 'transparent'}`,
            }}
            onMouseEnter={() => onHover(idx)}
            onMouseLeave={() => onHover(null)}
            whileHover={{ scale: 1.05 }}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                background: color,
                boxShadow: `0 0 8px ${color}60`,
              }}
            />
            <span
              className="text-xs"
              style={{
                color: isHovered ? color : 'rgba(150,200,230,0.8)',
              }}
            >
              {item.label}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

export function HoloChart({
  type,
  data,
  height = 200,
  showLegend = true,
  animated = true,
}: HoloChartProps) {
  const [hoveredLegendIndex, setHoveredLegendIndex] = useState<number | null>(null)

  return (
    <div className="relative">
      {/* Glow background */}
      <div
        className="absolute inset-0 rounded-lg blur-xl opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.2), transparent 70%)',
        }}
      />

      {/* Main container */}
      <div
        className="relative rounded-lg overflow-hidden p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.9), rgba(5, 15, 30, 0.95))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
        }}
      >
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

        {/* Chart */}
        <div className="relative" style={{ height }}>
          {type === 'bar' && <BarChart data={data} height={height} animated={animated} />}
          {type === 'line' && <LineChart data={data} height={height} animated={animated} />}
          {type === 'donut' && <DonutChart data={data} height={height} animated={animated} />}
        </div>

        {/* Legend */}
        {showLegend && (
          <Legend
            data={data}
            hoveredIndex={hoveredLegendIndex}
            onHover={setHoveredLegendIndex}
          />
        )}

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

export default HoloChart
