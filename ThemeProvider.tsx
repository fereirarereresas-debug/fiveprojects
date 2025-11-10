'use client'

import { useEffect, useState } from 'react'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Detecta horário e aplica tema automaticamente
    const hour = new Date().getHours()
    const isDarkTime = hour >= 18 || hour < 6
    
    if (isDarkTime) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  if (!mounted) return <>{children}</>

  return <>{children}</>
}