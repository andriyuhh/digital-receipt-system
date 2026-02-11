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
import { validateDiscountCode, applyDiscountUsage } from '@/app/actions/discounts'
import { useOfflineReceipts } from '@/hooks/use-offline-receipts'
import { ReceiptDeliveryModal } from '@/components/receipt-delivery-modal'
import { ServiceLineItems } from '@/components/service-line-items'
import type { Receipt, ServiceLineItem } from '@/lib/types'

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

  // Service line items
  const [lineItems, setLineItems] = useState<ServiceLineItem[]>([])
  const [serviceSubtotal, setServiceSubtotal] = useState(0)

  // Discount code
  const [discountCode, setDiscountCode] = useState('')
  const [discountValidation, setDiscountValidation] = useState<{
    valid: boolean
    discount?: Record<string, unknown>
    discountAmount?: number
    finalAmount?: number
    error?: string
  } | null>(null)
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false)

  // Stored discount info for draft
  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string
    code: string
    type: string
    value: number
    amount: number
  } | null>(null)

  const handleServiceItemsChange = (items: ServiceLineItem[], subtotal: number) => {
    setLineItems(items)
    setServiceSubtotal(subtotal)
    // Reset discount if amount changed
    if (discountValidation) {
      setDiscountValidation(null)
      setAppliedDiscount(null)
    }
  }

  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) return
    if (serviceSubtotal <= 0) {
      setDiscountValidation({ valid: false, error: 'Add services first before applying a discount' })
      return
    }

    setIsValidatingDiscount(true)
    try {
      const result = await validateDiscountCode(discountCode, serviceSubtotal)
      setDiscountValidation(result)
      if (result.valid && result.discount) {
        const disc = result.discount as Record<string, unknown>
        setAppliedDiscount({
          id: disc.id as string,
          code: disc.code as string,
          type: disc.discount_type as string,
          value: disc.discount_value as number,
          amount: result.discountAmount || 0,
        })
      } else {
        setAppliedDiscount(null)
      }
    } catch {
      setDiscountValidation({ valid: false, error: 'Failed to validate discount code' })
    } finally {
      setIsValidatingDiscount(false)
    }
  }

  const removeDiscount = () => {
    setDiscountCode('')
    setDiscountValidation(null)
    setAppliedDiscount(null)
  }

  const finalAmount = appliedDiscount
    ? serviceSubtotal - appliedDiscount.amount
    : serviceSubtotal

  const serviceDescription = lineItems
    .map(item => item.description)
    .join('; ') || ''

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Require at least one service item
    if (lineItems.length === 0) {
      setError('Please add at least one service item')
      setIsSubmitting(false)
      return
    }

    // Override amount and description with calculated values
    formData.set('amount', String(finalAmount))
    formData.set('service_description', serviceDescription)

    // Add discount and service metadata
    if (appliedDiscount) {
      formData.set('discount_code_id', appliedDiscount.id)
      formData.set('discount_code', appliedDiscount.code)
      formData.set('discount_type', appliedDiscount.type)
      formData.set('discount_value', String(appliedDiscount.value))
      formData.set('discount_amount', String(appliedDiscount.amount))
      formData.set('original_amount', String(serviceSubtotal))
    }

    formData.set('service_details', JSON.stringify({
      line_items: lineItems,
      subtotal: serviceSubtotal,
      discount_amount: appliedDiscount?.amount || 0,
      total: finalAmount,
    }))

    formData.set('service_type', lineItems.length === 1 ? lineItems[0].service_type : 'multiple')

    if (!isOnline) {
      addOfflineReceipt({
        customer_name: formData.get('patient_name') as string,
        customer_id: (formData.get('patient_id') as string) || null,
        service_description: serviceDescription,
        amount: finalAmount,
        payment_method: formData.get('payment_method') as string,
        internal_notes: (formData.get('internal_notes') as string) || null,
        issuer_id: staffId,
        issuer_name: staffName,
        issuer_role: staffRole,
      })
      setIsSubmitting(false)
      alert('Receipt saved offline. It will sync when internet is restored.')
      return
    }

    try {
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
      // Apply discount usage if a discount was used
      if (appliedDiscount) {
        await applyDiscountUsage(appliedDiscount.id)
      }

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
    return `NLe ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }

  // Issued success screen with delivery modal
  if (issuedReceipt) {
    return (
      <div className="space-y-4">
        <Card className="max-w-lg mx-auto border-2 border-green-300 dark:border-green-800">
          <CardHeader className="text-center bg-green-50/50 dark:bg-green-950/20">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </div>
            <CardTitle className="text-foreground text-xl">Receipt Issued Successfully</CardTitle>
            <CardDescription>
              <span className="font-mono font-bold text-foreground">{issuedReceipt.receipt_number}</span>
              {' '} - {formatAmount(issuedReceipt.amount)}
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
                  onClick={() => {
                    setIssuedReceipt(null)
                    setShowDeliveryModal(false)
                    setLineItems([])
                    setServiceSubtotal(0)
                    setAppliedDiscount(null)
                    setDiscountCode('')
                    setDiscountValidation(null)
                  }}
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
      <Card className="max-w-lg mx-auto border-2 border-amber-300 dark:border-amber-800">
        <CardHeader className="text-center bg-amber-50/50 dark:bg-amber-950/20">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
          </div>
          <CardTitle className="text-foreground text-xl">Confirm Receipt Issuance</CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-400 font-medium">
            Please verify the details below before issuing. Once confirmed, this receipt becomes permanent.
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

            {/* Line items breakdown */}
            {lineItems.length > 0 && (
              <div className="py-2 border-b space-y-1">
                <span className="text-muted-foreground text-sm">Services:</span>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm ml-2">
                    <span className="text-foreground">{item.description}</span>
                    <span className="text-foreground">{formatAmount(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}

            {appliedDiscount && (
              <>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground text-sm">Original Amount</span>
                  <span className="text-foreground">{formatAmount(serviceSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b text-emerald-600">
                  <span className="text-sm">Discount ({appliedDiscount.code})</span>
                  <span>-{formatAmount(appliedDiscount.amount)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Payment Method</span>
              <span className="text-foreground">{draftReceipt.payment_method}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Issuer</span>
              <span className="text-foreground">{staffName} ({staffRole})</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="text-muted-foreground font-medium">Final Amount</span>
              <span className="text-xl font-bold text-foreground">{formatAmount(draftReceipt.amount)}</span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Warning:</strong> Once you confirm, this receipt will be permanently issued with number <strong className="font-mono">{draftReceipt.receipt_number}</strong>. It cannot be edited after issuance.
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
            {/* Customer Details */}
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

            {/* Service Line Items */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Services *</Label>
              <ServiceLineItems onChange={handleServiceItemsChange} />
            </div>

            {/* Discount Code Section */}
            {lineItems.length > 0 && (
              <div className="space-y-2">
                <Label>Discount Code</Label>
                {appliedDiscount ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                    <div>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{appliedDiscount.code}</span>
                      <span className="text-sm text-emerald-600 dark:text-emerald-500 ml-2">
                        (-{appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : formatAmount(appliedDiscount.value)})
                      </span>
                      <p className="text-sm text-emerald-600 dark:text-emerald-500">
                        Saves {formatAmount(appliedDiscount.amount)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeDiscount} className="text-destructive">
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter discount code..."
                      value={discountCode}
                      onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountValidation(null) }}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleValidateDiscount}
                      disabled={isValidatingDiscount || !discountCode.trim()}
                    >
                      {isValidatingDiscount ? 'Checking...' : 'Apply'}
                    </Button>
                  </div>
                )}
                {discountValidation && !discountValidation.valid && (
                  <p className="text-sm text-destructive">{discountValidation.error}</p>
                )}
              </div>
            )}

            {/* Amount Summary */}
            {lineItems.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatAmount(serviceSubtotal)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>-{formatAmount(appliedDiscount.amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total Payable</span>
                  <span>{formatAmount(finalAmount)}</span>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div />
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

            {/* Hidden fields for service data */}
            <input type="hidden" name="amount" value={finalAmount} />
            <input type="hidden" name="service_description" value={serviceDescription} />

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#1a7fc1] text-white hover:bg-[#1a7fc1]/90"
              disabled={isSubmitting || lineItems.length === 0}
            >
              {isSubmitting ? 'Preparing Receipt...' : isOnline ? 'Review & Confirm Receipt' : 'Save Offline Receipt'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
