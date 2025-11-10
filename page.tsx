'use client'

import { motion } from 'framer-motion'
import ParticleBackground from '@/components/ParticleBackground'
import { useState } from 'react'
import { FaDiscord, FaEnvelope, FaUser, FaPaperPlane } from 'react-icons/fa'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulação de envio (você pode integrar com um backend real)
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitSuccess(true)
      setFormData({ name: '', email: '', message: '' })
      
      setTimeout(() => setSubmitSuccess(false), 5000)
    }, 2000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="relative min-h-screen">
      <ParticleBackground />
      
      <div className="relative z-10 container mx-auto px-6 pt-32 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-7xl font-orbitron font-bold gradient-text mb-6">
            Contato
          </h1>
          <p className="text-xl md:text-2xl font-exo text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
            Tem alguma dúvida ou quer colaborar? Entre em contato conosco!
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card-3d"
          >
            <h2 className="text-3xl font-orbitron font-bold gradient-text mb-6">
              Envie uma Mensagem
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-exo font-semibold mb-2">
                  <FaUser className="inline mr-2" />
                  Nome
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-primary/20 bg-white dark:bg-gray-800 focus:border-primary focus:outline-none transition-colors"
                  placeholder="Seu nome"
                />
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-exo font-semibold mb-2">
                  <FaEnvelope className="inline mr-2" />
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-primary/20 bg-white dark:bg-gray-800 focus:border-primary focus:outline-none transition-colors"
                  placeholder="seu@email.com"
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label htmlFor="message" className="block text-sm font-exo font-semibold mb-2">
                  Mensagem
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border-2 border-primary/20 bg-white dark:bg-gray-800 focus:border-primary focus:outline-none transition-colors resize-none"
                  placeholder="Escreva sua mensagem aqui..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full glow-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <FaPaperPlane />
                    Enviar Mensagem
                  </>
                )}
              </button>

              {/* Success Message */}
              {submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/20 border border-green-500 rounded-xl text-green-600 dark:text-green-400 text-center font-exo"
                >
                  ✓ Mensagem enviada com sucesso!
                </motion.div>
              )}
            </form>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-8"
          >
            {/* Discord Card */}
            <div className="card-3d">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <FaDiscord className="text-4xl text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-orbitron font-bold gradient-text">
                    Discord
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 font-exo">
                    Junte-se à nossa comunidade
                  </p>
                </div>
              </div>
              <a
                href="https://discord.gg/eCxwCsMMD3"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full glow-button text-center"
              >
                Entrar no Discord
              </a>
            </div>

            {/* Info Card */}
            <div className="card-3d">
              <h3 className="text-2xl font-orbitron font-bold gradient-text mb-4">
                Outras Formas de Contato
              </h3>
              <div className="space-y-4 text-gray-700 dark:text-gray-300 font-exo">
                <p className="leading-relaxed">
                  📧 <strong>Email:</strong> contact@fiveprojects.com
                </p>
                <p className="leading-relaxed">
                  🐙 <strong>GitHub:</strong> @fiveprojects
                </p>
                <p className="leading-relaxed">
                  📍 <strong>Localização:</strong> Global (Remote First)
                </p>
              </div>
            </div>

            {/* FAQ Card */}
            <div className="card-3d">
              <h3 className="text-2xl font-orbitron font-bold gradient-text mb-4">
                Respostas Rápidas
              </h3>
              <div className="space-y-3 text-sm font-exo">
                <div>
                  <strong className="text-primary">Os projetos são open source?</strong>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Sim! Todos os nossos projetos são código aberto e podem ser encontrados no GitHub.
                  </p>
                </div>
                <div>
                  <strong className="text-primary">Como posso contribuir?</strong>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Entre no nosso Discord e veja os issues abertos nos repositórios!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}