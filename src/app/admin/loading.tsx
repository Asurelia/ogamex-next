'use client'

import { motion } from 'framer-motion'

export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full"
      />
      <p className="mt-4 text-gray-400">Loading admin panel...</p>
    </div>
  )
}
