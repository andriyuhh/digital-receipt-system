'use client'

import React from "react"
import Image from "next/image"
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes
const ATTEMPT_KEY = 'hostech_login_attempts'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  // Check lockout status on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ATTEMPT_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.lockoutEnd && Date.now() < data.lockoutEnd) {
          setLockoutEnd(data.lockoutEnd)
        } else if (data.lockoutEnd && Date.now() >= data.lockoutEnd) {
          localStorage.removeItem(ATTEMPT_KEY)
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockoutEnd) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutEnd - Date.now()) / 1000))
      setLockoutRemaining(remaining)
      if (remaining <= 0) {
        setLockoutEnd(null)
        localStorage.removeItem(ATTEMPT_KEY)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutEnd])

  const recordAttempt = (success: boolean) => {
    if (success) {
      localStorage.removeItem(ATTEMPT_KEY)
      return
    }
    try {
      const stored = localStorage.getItem(ATTEMPT_KEY)
      const data = stored ? JSON.parse(stored) : { count: 0 }
      data.count = (data.count || 0) + 1
      if (data.count >= MAX_ATTEMPTS) {
        data.lockoutEnd = Date.now() + LOCKOUT_DURATION
        setLockoutEnd(data.lockoutEnd)
      }
      localStorage.setItem(ATTEMPT_KEY, JSON.stringify(data))
    } catch { /* ignore */ }
  }

  const isLockedOut = lockoutEnd && Date.now() < lockoutEnd

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLockedOut) return

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        recordAttempt(false)
        throw authError
      }
      
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      if (staffError || !staff) {
        await supabase.auth.signOut()
        throw new Error('You are not authorized to access this system')
      }
      
      if (!staff.is_active) {
        await supabase.auth.signOut()
        throw new Error('Your account has been suspended. Contact an administrator.')
      }

      recordAttempt(true)
      
      if (staff.must_change_password) {
        router.push('/auth/change-password')
        return
      }
      
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4 md:p-10 bg-muted/30">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Image
                  src="/logo.png"
                  alt="HOSTech Coworking Space"
                  width={180}
                  height={80}
                  className="h-16 w-auto"
                />
              </div>
              <CardTitle className="text-2xl text-foreground">Staff Login</CardTitle>
              <CardDescription>
                Receipt Management System
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reason === 'inactivity' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  You were logged out due to inactivity. Please sign in again.
                </div>
              )}
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@coworkingspacesl.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!!isLockedOut}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput
                      id="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={!!isLockedOut}
                    />
                  </div>
                  {isLockedOut && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                      Too many failed attempts. Try again in {Math.floor(lockoutRemaining / 60)}:{String(lockoutRemaining % 60).padStart(2, '0')}
                    </div>
                  )}
                  {error && !isLockedOut && (
                    <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-[#1a7fc1] text-white hover:bg-[#1a7fc1]/90"
                    disabled={isLoading || !!isLockedOut}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground">
            Contact your administrator if you need access
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a7fc1]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
