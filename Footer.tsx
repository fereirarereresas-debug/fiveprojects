'use client'

import { FaDiscord, FaGithub } from 'react-icons/fa'

export default function Footer() {
  return (
    <footer className="bg-dark text-white py-8 mt-20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="font-exo text-center md:text-left mb-4 md:mb-0">
            © 2025 FiveProjects — Inovando com propósito.
          </p>
          
          <div className="flex space-x-6">
            <a
              href="https://discord.gg/eCxwCsMMD3"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors text-2xl"
              aria-label="Discord"
            >
              <FaDiscord />
            </a>
            <a
              href="https://github.com/fiveprojects"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors text-2xl"
              aria-label="GitHub"
            >
              <FaGithub />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}