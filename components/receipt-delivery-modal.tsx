'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Receipt } from '@/lib/types'

interface ReceiptDeliveryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: Receipt
}

export function ReceiptDeliveryModal({ open, onOpenChange, receipt }: ReceiptDeliveryModalProps) {
  const [email, setEmail] = useState(receipt.customer_email || '')
  const [phone, setPhone] = useState(receipt.customer_phone || '')
  const [sending, setSending] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, 'success' | 'error' | null>>({})
  const [includeVerifyLink, setIncludeVerifyLink] = useState(true)
  const [whatsappPdfReady, setWhatsappPdfReady] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const isValidPhone = (p: string) => /^\+?[0-9]{7,15}$/.test(p.replace(/[\s\-()]/g, ''))

  const handlePrint = async () => {
    setSending(s => ({ ...s, print: true }))
    try {
      await fetch('/api/log-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: receipt.id, method: 'Print' }),
      })
      setResults(r => ({ ...r, print: 'success' }))
      window.open(`/receipt/${receipt.receipt_number}`, '_blank')
    } catch {
      setResults(r => ({ ...r, print: 'error' }))
    } finally {
      setSending(s => ({ ...s, print: false }))
    }
  }

  const handleDownloadPdf = async () => {
    setSending(s => ({ ...s, pdf: true }))
    try {
      const pdfUrl = `/api/generate-pdf?receiptId=${receipt.id}`
      window.open(pdfUrl, '_blank')

      await fetch('/api/log-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: receipt.id, method: 'PDF Download' }),
      })
      setResults(r => ({ ...r, pdf: 'success' }))
    } catch {
      setResults(r => ({ ...r, pdf: 'error' }))
    } finally {
      setSending(s => ({ ...s, pdf: false }))
    }
  }

  const handleEmail = async () => {
    if (!isValidEmail(email)) return
    setSending(s => ({ ...s, email: true }))
    try {
      const res = await fetch('/api/send-receipt-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: receipt.id, customerEmail: email }),
      })
      setResults(r => ({ ...r, email: res.ok ? 'success' : 'error' }))
    } catch {
      setResults(r => ({ ...r, email: 'error' }))
    } finally {
      setSending(s => ({ ...s, email: false }))
    }
  }

  // Step 1: Download the PDF and get the WhatsApp URL ready
  const handleWhatsAppStep1 = async () => {
    if (!isValidPhone(phone)) return
    setSending(s => ({ ...s, whatsapp: true }))
    try {
      // First, open the PDF in a new tab so the staff can download/save it
      const pdfUrl = `/api/generate-pdf?receiptId=${receipt.id}`
      window.open(pdfUrl, '_blank')

      // Get the WhatsApp URL from the server
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: receipt.id,
          phone,
          includeVerifyLink,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setWhatsappUrl(data.whatsappUrl || null)
        setWhatsappPdfReady(true)
      } else {
        setResults(r => ({ ...r, whatsapp: 'error' }))
      }
    } catch {
      setResults(r => ({ ...r, whatsapp: 'error' }))
    } finally {
      setSending(s => ({ ...s, whatsapp: false }))
    }
  }

  // Step 2: Open WhatsApp with the text message (user manually attaches the saved PDF)
  const handleWhatsAppStep2 = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank')
      setResults(r => ({ ...r, whatsapp: 'success' }))
      setWhatsappPdfReady(false)
      setWhatsappUrl(null)
    }
  }

  const StatusIcon = ({ method }: { method: string }) => {
    const status = results[method]
    if (!status) return null
    if (status === 'success') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
      )
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" /></svg>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">How would you like to deliver this receipt?</DialogTitle>
          <DialogDescription>
            Receipt <span className="font-mono font-medium">{receipt.receipt_number}</span> - SLE {Number(receipt.amount).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Print Option */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Print Receipt</p>
              <p className="text-xs text-muted-foreground">Open print-ready view</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon method="print" />
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent"
                onClick={handlePrint}
                disabled={sending.print}
              >
                {sending.print ? 'Opening...' : 'Print'}
              </Button>
            </div>
          </div>

          {/* PDF Download Option */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/30 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M12 18v-6" /><path d="m9 15 3 3 3-3" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Download PDF</p>
              <p className="text-xs text-muted-foreground">Save as PDF with watermark and QR code</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon method="pdf" />
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent"
                onClick={handleDownloadPdf}
                disabled={sending.pdf}
              >
                {sending.pdf ? 'Opening...' : 'PDF'}
              </Button>
            </div>
          </div>

          {/* Email Option */}
          <div className="p-3 rounded-lg border bg-card space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Email Receipt</p>
                <p className="text-xs text-muted-foreground">Send a copy to customer email</p>
              </div>
              <StatusIcon method="email" />
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 text-sm"
              />
              <Button
                size="sm"
                onClick={handleEmail}
                disabled={sending.email || !isValidEmail(email)}
                className="bg-[#1a7fc1] hover:bg-[#1a7fc1]/90 shrink-0"
              >
                {sending.email ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>

          {/* WhatsApp Option - Two-step flow */}
          <div className="p-3 rounded-lg border bg-card space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366]/10 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">WhatsApp with PDF</p>
                <p className="text-xs text-muted-foreground">
                  {whatsappPdfReady
                    ? 'PDF opened - now send via WhatsApp'
                    : 'Download PDF then send via WhatsApp'}
                </p>
              </div>
              <StatusIcon method="whatsapp" />
            </div>

            {!whatsappPdfReady ? (
              <>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="+232 XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleWhatsAppStep1}
                    disabled={sending.whatsapp || !isValidPhone(phone)}
                    className="bg-[#25D366] hover:bg-[#25D366]/90 text-white shrink-0"
                  >
                    {sending.whatsapp ? 'Preparing...' : 'Send PDF'}
                  </Button>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="include-verify-link"
                    checked={includeVerifyLink}
                    onCheckedChange={(checked) => setIncludeVerifyLink(checked === true)}
                  />
                  <Label htmlFor="include-verify-link" className="text-xs text-muted-foreground cursor-pointer">
                    Include verification link in message
                  </Label>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Step 1:</strong> The PDF receipt opened in a new tab.
                    Use your browser&apos;s <strong>Save as PDF</strong> or <strong>Print {'>'} Save as PDF</strong> to save it.
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                    <strong className="text-foreground">Step 2:</strong> Click the button below to open WhatsApp. 
                    Then <strong>attach the saved PDF file</strong> to the message.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => {
                      setWhatsappPdfReady(false)
                      setWhatsappUrl(null)
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                    onClick={handleWhatsAppStep2}
                  >
                    Open WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
