'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PasswordInput, validatePasswordStrength } from '@/components/password-input'
import { createStaffAccount } from '@/app/actions/staff'

export function CreateStaffDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'sent' | 'logged' | 'failed' | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'Cashier' as 'Cashier' | 'Supervisor' | 'Admin'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const strengthError = validatePasswordStrength(formData.password)
    if (strengthError) {
      setError(strengthError)
      setIsLoading(false)
      return
    }

    const result = await createStaffAccount(formData)
    
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    // Send onboarding email/notification
    try {
      const emailRes = await fetch('/api/send-onboarding-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName: formData.fullName,
          staffEmail: formData.email,
          tempPassword: formData.password,
        }),
      })
      if (emailRes.ok) {
        const emailData = await emailRes.json()
        setEmailStatus(emailData.message?.includes('logged') ? 'logged' : 'sent')
      } else {
        setEmailStatus('failed')
      }
    } catch {
      setEmailStatus('failed')
    }

    setSuccess(true)
    setTimeout(() => {
      setOpen(false)
      setFormData({ email: '', password: '', fullName: '', role: 'Cashier' })
      setSuccess(false)
      setEmailStatus(null)
    }, 3000)
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) {
        setError(null)
        setSuccess(false)
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-[#1a7fc1] text-white hover:bg-[#1a7fc1]/90">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
          Create Staff Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Staff Account</DialogTitle>
          <DialogDescription>
            Create a new staff account. They will be required to change their password on first login.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
            </div>
            <p className="mt-4 text-green-600 font-medium">Staff account created successfully</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {emailStatus === 'sent' && 'An onboarding email has been sent with login details.'}
              {emailStatus === 'logged' && 'Email logged (configure RESEND_API_KEY to enable delivery). Share credentials manually.'}
              {emailStatus === 'failed' && 'Could not send onboarding email. Please share login details manually.'}
              {!emailStatus && 'Sending onboarding notification...'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@coworkingspacesl.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">Must end with @coworkingspacesl.com</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Temporary Password</Label>
              <PasswordInput
                id="password"
                placeholder="Min 8 characters"
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                showStrength
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'Cashier' | 'Supervisor' | 'Admin') => 
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cashier">Cashier</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1a7fc1] text-white hover:bg-[#1a7fc1]/90" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
