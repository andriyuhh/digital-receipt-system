'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function SetupPage() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'initializing' | 'done' | 'error'>('checking')
  const [message, setMessage] = useState('')
  const [seedEmail, setSeedEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/init-admin')
      const data = await res.json()
      
      if (data.initialized) {
        setStatus('done')
        setMessage('System is already initialized. Redirecting to login...')
        setTimeout(() => router.push('/auth/login'), 2000)
      } else {
        setStatus('ready')
        setSeedEmail(data.seedAdminEmail)
      }
    } catch (error) {
      setStatus('error')
      setMessage('Failed to check system status')
    }
  }

  const handleInitialize = async () => {
    setStatus('initializing')
    setMessage('Creating seed admin account...')
    
    try {
      const res = await fetch('/api/init-admin', { method: 'POST' })
      const data = await res.json()
      
      if (data.error) {
        setStatus('error')
        setMessage(data.error)
        return
      }
      
      setStatus('done')
      setMessage('Seed admin created successfully! Redirecting to login...')
      setTimeout(() => router.push('/auth/login'), 3000)
    } catch (error) {
      setStatus('error')
      setMessage('Failed to initialize system')
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/30">
      <div className="w-full max-w-md">
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
            <CardTitle className="text-2xl">System Setup</CardTitle>
            <CardDescription>
              Initialize the Receipt Management System
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'checking' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a7fc1] mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Checking system status...</p>
              </div>
            )}

            {status === 'ready' && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-blue-900 mb-2">First-time Setup</p>
                  <p className="text-blue-800">
                    This will create the initial admin account with the following credentials:
                  </p>
                  <div className="mt-3 bg-white rounded p-3 font-mono text-sm">
                    <p><strong>Email:</strong> {seedEmail}</p>
                    <p><strong>Password:</strong> c0work1ng@</p>
                  </div>
                  <p className="mt-3 text-blue-700 text-xs">
                    Note: You will be required to change the password on first login.
                  </p>
                </div>
                <Button 
                  onClick={handleInitialize} 
                  className="w-full bg-[#1a7fc1] hover:bg-[#1a7fc1]/90"
                >
                  Initialize System
                </Button>
              </>
            )}

            {status === 'initializing' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a7fc1] mx-auto"></div>
                <p className="mt-4 text-muted-foreground">{message}</p>
              </div>
            )}

            {status === 'done' && (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-600"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                </div>
                <p className="mt-4 text-green-600 font-medium">{message}</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-600"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m15 9-6 6" />
                    <path d="m9 9 6 6" />
                  </svg>
                </div>
                <p className="mt-4 text-red-600">{message}</p>
                <Button 
                  onClick={checkStatus} 
                  variant="outline"
                  className="mt-4 bg-transparent"
                >
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
