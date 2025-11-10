import type { Metadata } from 'next'
import { Orbitron, Exo_2, Poppins } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ThemeProvider from '@/components/ThemeProvider'

const orbitron = Orbitron({ 
  subsets: ['latin'],
  variable: '--font-orbitron',
})

const exo2 = Exo_2({ 
  subsets: ['latin'],
  variable: '--font-exo',
})

const poppins = Poppins({ 
  weight: ['300', '400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'FiveProjects — Inovação, Segurança e Sustentabilidade Digital',
  description: 'Grupo de desenvolvedores focados em criar soluções tecnológicas sustentáveis, seguras e inovadoras.',
  keywords: 'tecnologia, sustentabilidade digital, segurança, inovação, IA',
  authors: [{ name: 'FiveProjects' }],
  openGraph: {
    title: 'FiveProjects',
    description: 'Tecnologia, segurança e sustentabilidade digital',
    type: 'website',
    url: 'https://fiveprojects.com',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FiveProjects',
    description: 'Tecnologia, segurança e sustentabilidade digital',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${orbitron.variable} ${exo2.variable} ${poppins.variable} font-poppins`}>
        <ThemeProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}