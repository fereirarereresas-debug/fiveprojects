'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import ParticleBackground from '@/components/ParticleBackground'
import { FaHome } from 'react-icons/fa'

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <ParticleBackground />
      
      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-9xl font-orbitron font-bold gradient-text mb-4">
            404
          </h1>
          <h2 className="text-4xl font-exo font-bold mb-6 text-gray-800 dark:text-white">
            Página Não Encontrada
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Parece que você se perdeu no espaço digital. A página que você está 
            procurando não existe ou foi movida.
          </p>
          
          <Link href="/" className="glow-button inline-flex items-center gap-2">
            <FaHome />
            Voltar para Home
          </Link>
        </motion.div>
      </div>
    </div>
  )
}