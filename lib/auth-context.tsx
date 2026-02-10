'use client'

import React from "react"

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Staff {
  id: string
  full_name: string
  role: 'Cashier' | 'Supervisor' | 'Admin'
  is_active: boolean
  must_change_password: boolean
  rules_acknowledged: boolean
}

interface AuthContextType {
  user: User | null
  staff: Staff | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .eq('id', user.id)
          .single()

        setStaff(staffData)
      }

      setIsLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          const { data: staffData } = await supabase
            .from('staff')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setStaff(staffData)
        } else {
          setStaff(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setStaff(null)
  }

  return (
    <AuthContext.Provider value={{ user, staff, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
