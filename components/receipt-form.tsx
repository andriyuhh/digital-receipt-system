'use client'

import React from "react"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createDraftReceipt, confirmReceipt } from '@/app/actions/receipts'
import { useOfflineReceipts } from '@/hooks/use-offline-receipts'
import { ReceiptDeliveryModal } from '@/components/receipt-delivery-modal'
import type { Receipt } from '@/lib/types'

interface ReceiptFormProps {
  staffName: string
  staffRole: string
  staffId: string
}

export function ReceiptForm({ staffName, staffRole, staffId }: ReceiptFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftReceipt, setDraftReceipt] = useState<Receipt | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [issuedReceipt, setIssuedReceipt] = useState<Receipt | null>(null)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const router = useRouter()
  const { isOnline, pendingCount, addOfflineReceipt, syncReceipts, isSyncing } = useOfflineReceipts()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    if (!isOnline) {
      const offlineReceipt = addOfflineReceipt({
        customer_name: formData.get('patient_name') as string,
        customer_id: (formData.get('patient_id') as string) || null,
        service_description: formData.get('service_description') as string,
        amount: parseFloat(formData.get('amount') as string),
        payment_method: formData.get('payment_method') as string,
        internal_notes: (formData.get('internal_notes') as string) || null,
        issuer_id: staffId,
        issuer_name: staffName,
        issuer_role: staffRole,
      })
      setIsSubmitting(false)
      alert(`Receipt saved offline as ${offlineReceipt.tempId}. It will sync when internet is restored.`)
      e.currentTarget.reset()
      return
    }

    try {
      // Create draft receipt (not yet issued)
      const receipt = await createDraftReceipt(formData)
      setDraftReceipt(receipt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create receipt')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmIssue = async () => {
    if (!draftReceipt) return
    setIsConfirming(true)
    setError(null)

    try {
      const issued = await confirmReceipt(draftReceipt.id)
      setIssuedReceipt(issued)
      setDraftReceipt(null)
      setShowDeliveryModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm receipt')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCancelDraft = () => {
    setDraftReceipt(null)
    setError(null)
  }

  const formatAmount = (amount: number) => {
    return `SLE ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }

  // Issued success screen with delivery modal
  if (issuedReceipt) {
    return (
      <div className="space-y-4">
        <Card className="max-w-lg mx-auto border-2 border-green-300">
          <CardHeader className="text-center bg-green-50/50">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </div>
            <CardTitle className="text-foreground text-xl">Receipt Issued Successfully</CardTitle>
            <CardDescription>
              <span className="font-mono font-bold text-foreground">{issuedReceipt.receipt_number}</span>
              {' '} - SLE {issuedReceipt.amount.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-center text-muted-foreground">
              How would you like to deliver this receipt to the customer?
            </p>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full bg-[#1a7fc1] text-white hover:bg-[#1a7fc1]/90"
                onClick={() => setShowDeliveryModal(true)}
              >
                Choose Delivery Method
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => router.push(`/receipt/${issuedReceipt.receipt_number}`)}
                >
                  View Receipt
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => { setIssuedReceipt(null); setShowDeliveryModal(false) }}
                >
                  Issue Another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ReceiptDeliveryModal
          open={showDeliveryModal}
          onOpenChange={setShowDeliveryModal}
          receipt={issuedReceipt}
        />
      </div>
    )
  }

  // Confirmation screen
  if (draftReceipt) {
    return (
      <Card className="max-w-lg mx-auto border-2 border-amber-300">
        <CardHeader className="text-center bg-amber-50/50">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
          </div>
          <CardTitle className="text-foreground text-xl">Confirm Receipt Issuance</CardTitle>
          <CardDescription className="text-amber-700 font-medium">
            Please verify the details below before issuing. Once confirmed, this receipt becomes permanent and non-editable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Receipt Number</span>
              <span className="font-mono font-bold text-foreground">{draftReceipt.receipt_number}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Client Name</span>
              <span className="font-medium text-foreground">{draftReceipt.customer_name}</span>
            </div>
            {draftReceipt.customer_id && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground text-sm">Member ID</span>
                <span className="text-foreground">{draftReceipt.customer_id}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Service</span>
              <span className="text-sm text-foreground max-w-[60%] text-right">{draftReceipt.service_description}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Payment Method</span>
              <span className="text-foreground">{draftReceipt.payment_method}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Issuer</span>
              <span className="text-foreground">{staffName} ({staffRole})</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="text-muted-foreground font-medium">Total Amount</span>
              <span className="text-xl font-bold text-foreground">{formatAmount(draftReceipt.amount)}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Warning:</strong> Once you confirm, this receipt will be permanently issued with number <strong className="font-mono">{draftReceipt.receipt_number}</strong>. It cannot be edited after issuance. Only Supervisors/Admins can cancel issued receipts.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={handleCancelDraft}
              disabled={isConfirming}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[#1a7fc1] text-white hover:bg-[#1a7fc1]/90"
              onClick={handleConfirmIssue}
              disabled={isConfirming}
            >
              {isConfirming ? 'Issuing...' : 'Confirm & Issue Receipt'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Online/Offline Status */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={isOnline ? 'default' : 'destructive'} className={isOnline ? 'bg-green-600 text-white' : ''}>
          <span className={`inline-block h-2 w-2 rounded-full mr-2 ${isOnline ? 'bg-green-300' : 'bg-red-300'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
              {pendingCount} pending sync
            </Badge>
            {isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={syncReceipts}
                disabled={isSyncing}
                className="text-xs h-7 bg-transparent"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            )}
          </div>
        )}
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-foreground">Issue New Receipt</CardTitle>
          <CardDescription>
            Issuing as: {staffName} ({staffRole})
            {!isOnline && (
              <span className="block mt-1 text-amber-600 font-medium">
                Offline mode - receipt will be queued for sync
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="patient_name">Client Name *</Label>
                <Input id="patient_name" name="patient_name" placeholder="Full name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_id">Member ID</Label>
                <Input id="patient_id" name="patient_id" placeholder="Optional" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_description">Service Description *</Label>
              <Textarea
                id="service_description"
                name="service_description"
                placeholder="Describe the service or items..."
                required
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (SLE) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select name="payment_method" defaultValue="Cash">
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_email">Customer Email (Optional)</Label>
                <Input
                  id="customer_email"
                  name="customer_email"
                  type="email"
                  placeholder="customer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Customer Phone (Optional)</Label>
                <Input
                  id="customer_phone"
                  name="customer_phone"
                  type="tel"
                  placeholder="+232 XX XXX XXXX"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Contact info enables email and WhatsApp receipt delivery after issuance.</p>

            <div className="space-y-2">
              <Label htmlFor="internal_notes">Internal Notes (Office Copy Only)</Label>
              <Textarea
                id="internal_notes"
                name="internal_notes"
                placeholder="Notes visible only on office copy..."
                rows={2}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>
            )}

            <Button type="submit" className="w-full bg-[#1a7fc1] text-white hover:bg-[#1a7fc1]/90" disabled={isSubmitting}>
              {isSubmitting ? 'Preparing Receipt...' : isOnline ? 'Review & Confirm Receipt' : 'Save Offline Receipt'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
