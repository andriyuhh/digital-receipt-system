'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerifyPage() {
  const [receiptNumber, setReceiptNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = receiptNumber.trim().toUpperCase()
    if (!trimmed) {
      setError('Please enter a receipt number')
      return
    }

    const pattern = /^HOS-\d{4}-\d{6}$/
    if (!pattern.test(trimmed)) {
      setError('Invalid format. Expected: HOS-YYYY-XXXXXX')
      return
    }

    router.push(`/verify/${trimmed}`)
  }

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="HOSTech Coworking Space" className="h-16 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Receipt Verification</h1>
          <p className="text-sm text-muted-foreground">
            Verify the authenticity of a receipt from HOSTech Coworking Space.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">Enter Receipt Number</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="HOS-2026-000001"
                  value={receiptNumber}
                  onChange={(e) => {
                    setReceiptNumber(e.target.value.toUpperCase())
                    setError(null)
                  }}
                  className="font-mono text-center text-lg tracking-wider"
                  maxLength={17}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Format: HOS-YYYY-XXXXXX
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-[#1a7fc1] hover:bg-[#1a7fc1]/90 text-white"
              >
                Verify Receipt
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="text-center space-y-3 text-xs text-muted-foreground">
          <p>You can also scan the QR code on your receipt to verify it instantly.</p>
          <div className="flex items-center gap-2 justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
            <span>No account or login required</span>
          </div>
        </div>
      </div>
    </div>
  )
}
