'use client'

import { useTheme } from 'next-themes'
import { useEffect, useRef } from 'react'

export function ThemeSyncer({ themePreference }: { themePreference: string }) {
  const { setTheme } = useTheme()
  const hasSet = useRef(false)

  useEffect(() => {
    if (!hasSet.current && themePreference) {
      setTheme(themePreference)
      hasSet.current = true
    }
  }, [themePreference, setTheme])

  return null
}
