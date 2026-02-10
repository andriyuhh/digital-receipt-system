'use client'

import React from "react"

import { useAutoLogout } from '@/hooks/use-auto-logout'

export function AutoLogoutWrapper({ children }: { children: React.ReactNode }) {
  useAutoLogout()
  return <>{children}</>
}
