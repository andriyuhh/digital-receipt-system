'use client'

import { useState, useEffect, useCallback } from 'react'

export interface OfflineReceipt {
  tempId: string
  customer_name: string
  customer_id: string | null
  service_description: string
  amount: number
  payment_method: string
  internal_notes: string | null
  issuer_id: string
  issuer_name: string
  issuer_role: string
  created_at: string
  synced: boolean
}

const STORAGE_KEY = 'hostech_offline_receipts'

export function useOfflineReceipts() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingReceipts, setPendingReceipts] = useState<OfflineReceipt[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load pending receipts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const receipts = JSON.parse(stored) as OfflineReceipt[]
        setPendingReceipts(receipts.filter((r) => !r.synced))
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Save to localStorage whenever pending receipts change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingReceipts))
  }, [pendingReceipts])

  const generateTempId = () => {
    const num = Math.floor(Math.random() * 10000)
    return `HOS-OFFLINE-${String(num).padStart(4, '0')}`
  }

  const addOfflineReceipt = useCallback(
    (data: Omit<OfflineReceipt, 'tempId' | 'synced' | 'created_at'>) => {
      const receipt: OfflineReceipt = {
        ...data,
        tempId: generateTempId(),
        created_at: new Date().toISOString(),
        synced: false,
      }
      setPendingReceipts((prev) => [...prev, receipt])
      return receipt
    },
    [],
  )

  const syncReceipts = useCallback(async () => {
    if (!isOnline || pendingReceipts.length === 0 || isSyncing) return

    setIsSyncing(true)

    try {
      const response = await fetch('/api/sync-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipts: pendingReceipts.filter((r) => !r.synced) }),
      })

      if (response.ok) {
        const data = await response.json()
        setPendingReceipts((prev) =>
          prev.map((r) => {
            const synced = data.synced?.find((s: { tempId: string }) => s.tempId === r.tempId)
            if (synced) return { ...r, synced: true }
            return r
          }),
        )
        // Clean up synced receipts
        setPendingReceipts((prev) => prev.filter((r) => !r.synced))
      }
    } catch {
      // Will retry on next online event
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, pendingReceipts, isSyncing])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingReceipts.some((r) => !r.synced)) {
      syncReceipts()
    }
  }, [isOnline, syncReceipts, pendingReceipts])

  return {
    isOnline,
    pendingReceipts: pendingReceipts.filter((r) => !r.synced),
    addOfflineReceipt,
    syncReceipts,
    isSyncing,
    pendingCount: pendingReceipts.filter((r) => !r.synced).length,
  }
}
