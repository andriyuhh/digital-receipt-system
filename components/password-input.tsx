'use client'

import React from "react"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean
}

export function PasswordInput({ className, showStrength = false, value, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false)

  const getStrength = (val: string): { label: string; color: string; width: string } => {
    if (!val) return { label: '', color: '', width: '0%' }
    let score = 0
    if (val.length >= 8) score++
    if (val.length >= 12) score++
    if (/[A-Z]/.test(val)) score++
    if (/[a-z]/.test(val)) score++
    if (/[0-9]/.test(val)) score++
    if (/[^A-Za-z0-9]/.test(val)) score++

    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '25%' }
    if (score <= 3) return { label: 'Fair', color: 'bg-amber-500', width: '50%' }
    if (score <= 4) return { label: 'Good', color: 'bg-blue-500', width: '75%' }
    return { label: 'Strong', color: 'bg-green-500', width: '100%' }
  }

  const strength = showStrength ? getStrength(String(value || '')) : null

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          {...props}
          type={show ? 'text' : 'password'}
          value={value}
          className={cn('pr-20', className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground text-xs"
          onClick={() => setShow(!show)}
          tabIndex={-1}
        >
          {show ? (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" x2="23" y1="1" y2="23" /></svg>
              Hide
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              Show
            </span>
          )}
        </Button>
      </div>
      {showStrength && strength && strength.label && (
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', strength.color)}
              style={{ width: strength.width }}
            />
          </div>
          <p className={cn(
            'text-xs',
            strength.label === 'Weak' && 'text-red-500',
            strength.label === 'Fair' && 'text-amber-500',
            strength.label === 'Good' && 'text-blue-500',
            strength.label === 'Strong' && 'text-green-500',
          )}>
            Password strength: {strength.label}
          </p>
        </div>
      )}
    </div>
  )
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character'
  return null
}
