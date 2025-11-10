'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { IconType } from 'react-icons'

interface ProjectCardProps {
  title: string
  description: string
  icon: IconType
  href: string
  gradient: string
  delay?: number
}

export default function ProjectCard({
  title,
  description,
  icon: Icon,
  href,
  gradient,
  delay = 0,
}: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -10 }}
      className="group"
    >
      <Link href={href}>
        <div className="card-3d h-full relative overflow-hidden">
          {/* Gradient Background */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${gradient}`} />
          
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-6 bg-primary/10 rounded-full group-hover:animate-float">
              <Icon className="text-6xl text-primary" />
            </div>
          </div>

          {/* Content */}
          <h3 className="text-2xl font-orbitron font-bold mb-4 text-center gradient-text">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-center font-exo leading-relaxed">
            {description}
          </p>

          {/* Hover Effect */}
          <div className="mt-6 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-primary font-semibold">Saiba mais →</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}