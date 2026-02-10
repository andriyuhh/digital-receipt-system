'use client'

import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import type { Receipt } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ReceiptDeliveryModal } from '@/components/receipt-delivery-modal'

interface ReceiptDisplayProps {
  receipt: Receipt
  variant: 'customer' | 'office'
  baseUrl: string
  canReprint?: boolean
}

export function ReceiptDisplay({ receipt, variant, baseUrl, canReprint = false }: ReceiptDisplayProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)

  // Build signed verification URL
  const sig = receipt.qr_signature || ''
  const t = encodeURIComponent(receipt.issued_at)
  const verificationUrl = sig
    ? `${baseUrl}/verify/${receipt.receipt_number}?sig=${sig}&t=${t}`
    : `${baseUrl}/verify/${receipt.receipt_number}`

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAmount = (amount: number) => {
    return `SLE ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }

  const handlePrint = () => {
    const printContent = receiptRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receipt.receipt_number} - ${variant === 'customer' ? 'Customer' : 'Office'} Copy</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'JetBrains Mono', 'Courier New', monospace;
              padding: 12mm;
              background: #fff;
              color: #1a1a1a;
              font-size: 11px;
            }
            .receipt { 
              max-width: 80mm;
              margin: 0 auto;
              padding: 0;
            }
            .receipt.a4 {
              max-width: 180mm;
              padding: 20mm;
              border: 1px solid #ddd;
            }
            .header { text-align: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #999; }
            .header img { height: 40px; margin-bottom: 6px; }
            .business-name { font-size: 14px; font-weight: bold; color: #1a7fc1; margin-bottom: 2px; }
            .tagline { font-size: 8px; font-style: italic; color: #666; }
            .location { font-size: 9px; color: #666; margin-top: 4px; }
            .receipt-number { font-size: 12px; font-weight: bold; margin-top: 8px; letter-spacing: 2px; }
            .status-badge { display: inline-block; padding: 2px 10px; border-radius: 3px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .status-valid { background: #dcfce7; color: #166534; }
            .status-cancelled { background: #fee2e2; color: #991b1b; text-decoration: line-through; }
            .status-refunded { background: #fef3c7; color: #92400e; }
            .section { margin: 10px 0; padding: 8px 0; border-bottom: 1px dashed #ccc; }
            .label { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 2px; }
            .value { font-size: 11px; }
            .amount-box { text-align: center; background: #f5f5f5; padding: 12px 8px; margin: 12px 0; border: 1px dashed #ccc; }
            .amount { font-size: 22px; font-weight: bold; }
            .amount-label { font-size: 8px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-bottom: 4px; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
            .qr-section { text-align: center; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #999; }
            .qr-code svg { margin: 8px auto; }
            .qr-url { font-size: 7px; color: #999; word-break: break-all; }
            .footer { text-align: center; font-size: 8px; color: #999; margin-top: 12px; }
            .copy-type { font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 60px; color: rgba(0,0,0,0.04); font-weight: bold; pointer-events: none; z-index: -1; }
            .office-badge { background: #fff7ed; border: 1px dashed #f59e0b; padding: 8px; margin-top: 10px; }
            .office-badge .label { color: #92400e; }
            .notes-box { background: #fffbeb; border: 1px dashed #f59e0b; padding: 8px; margin-top: 10px; }
            @media print {
              body { padding: 0; margin: 0; }
              @page { margin: 5mm; size: 80mm auto; }
            }
            @media print and (min-width: 200mm) {
              @page { margin: 15mm; size: A4; }
              .receipt { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          ${variant === 'office' ? '<div class="watermark">OFFICE COPY</div>' : ''}
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
  }

  return (
    <div className="space-y-4">
      <div
        ref={receiptRef}
        className={cn(
          'relative max-w-md mx-auto p-6 font-mono text-sm border-2 border-dashed rounded-lg',
          variant === 'customer' && 'bg-background border-muted-foreground/30',
          variant === 'office' && 'bg-amber-50/50 border-amber-300/50'
        )}
        style={{
          backgroundImage: variant === 'office' 
            ? 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,0,0.03) 1px, rgba(255,255,0,0.03) 2px)' 
            : undefined,
        }}
      >
        {/* Watermark for Office Copy */}
        {variant === 'office' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <span className="text-5xl font-bold text-foreground/5 rotate-[-30deg] whitespace-nowrap select-none">
              OFFICE COPY
            </span>
          </div>
        )}

        {/* Header */}
        <div className="text-center pb-4 border-b border-dashed border-muted-foreground/30">
          <img src="/logo.png" alt="HOSTech Coworking Space" className="h-12 mx-auto mb-2" />
          <h2 className="text-lg font-bold tracking-wide text-[#1a7fc1]">HOSTech Coworking Space</h2>
          <p className="text-[10px] italic text-muted-foreground">Innovate. Learn. Grow.</p>
          <p className="text-xs text-muted-foreground mt-1">Freetown, Sierra Leone</p>
          <div className="mt-3">
            <span className={cn(
              'inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider',
              receipt.status === 'Draft' && 'bg-gray-100 text-gray-800',
              (receipt.status === 'Issued' || receipt.status === 'Printed' || receipt.status === 'Emailed' || receipt.status === 'Verified') && 'bg-green-100 text-green-800',
              receipt.status === 'Cancelled' && 'bg-red-100 text-red-800 line-through',
              receipt.status === 'Synced' && 'bg-blue-100 text-blue-800'
            )}>
              {receipt.status}
            </span>
          </div>
          <p className="text-sm font-bold mt-3 tracking-widest text-foreground">{receipt.receipt_number}</p>
        </div>

        {/* Client Info */}
        <div className="py-4 border-b border-dashed border-muted-foreground/30">
          <div className="grid gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Client Name</p>
              <p className="font-semibold text-foreground">{receipt.customer_name}</p>
            </div>
            {receipt.customer_id && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Member ID</p>
                <p className="text-foreground">{receipt.customer_id}</p>
              </div>
            )}
          </div>
        </div>

        {/* Service Details */}
        <div className="py-4 border-b border-dashed border-muted-foreground/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Service Description</p>
          <p className="whitespace-pre-wrap text-foreground">{receipt.service_description}</p>
        </div>

        {/* Amount */}
        <div className="py-4 bg-muted/50 -mx-6 px-6">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{formatAmount(receipt.amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Payment: {receipt.payment_method}
            </p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="py-4 border-b border-dashed border-muted-foreground/30">
          <div className="flex justify-between text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</p>
              <p className="text-foreground">{formatDate(receipt.issued_at)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Time</p>
              <p className="text-foreground">{formatTime(receipt.issued_at)}</p>
            </div>
          </div>
        </div>

        {/* Issuer Info */}
        <div className={cn(
          'py-4',
          variant === 'office' && 'bg-blue-50/50 -mx-6 px-6 border-b border-dashed border-blue-200'
        )}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Issued By</p>
          <p className="font-medium text-foreground">{receipt.issuer_name}</p>
          <p className="text-xs text-muted-foreground">
            {receipt.issuer_role} | ID: {receipt.issuer_id.slice(0, 8)}...
          </p>
        </div>

        {/* Internal Notes (Office Copy Only) */}
        {variant === 'office' && receipt.internal_notes && (
          <div className="mt-4 p-3 bg-amber-50 border border-dashed border-amber-300 rounded">
            <p className="text-[10px] uppercase tracking-wider text-amber-700 mb-1">Internal Notes</p>
            <p className="text-xs text-amber-900 whitespace-pre-wrap">{receipt.internal_notes}</p>
          </div>
        )}

        {/* QR Code */}
        <div className="pt-4 text-center border-t border-dashed border-muted-foreground/30 mt-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Scan to Verify</p>
          <div className="inline-block bg-white p-2 rounded">
            <QRCodeSVG
              value={verificationUrl}
              size={100}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 break-all">
            {verificationUrl}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-4 text-center text-[10px] text-muted-foreground">
          <p>Thank you for choosing HOSTech Coworking Space</p>
          <p className="mt-1">This receipt is computer-generated</p>
          <p className="mt-2 font-bold tracking-widest text-xs">
            {variant === 'customer' ? 'CUSTOMER COPY' : 'OFFICE COPY'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="gap-2 bg-transparent"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg>
          Print {variant === 'customer' ? 'Customer' : 'Office'} Copy
        </Button>
        {variant === 'customer' && (
          <Button
            onClick={() => setShowDeliveryModal(true)}
            variant="outline"
            className="gap-2 border-[#1a7fc1] text-[#1a7fc1] bg-transparent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
            Deliver Receipt
          </Button>
        )}
        {canReprint && (
          <Button
            onClick={handlePrint}
            variant="outline"
            className="gap-2 border-[#1a7fc1] text-[#1a7fc1] bg-transparent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M21 21v-5h-5" /></svg>
            Reprint
          </Button>
        )}
      </div>

      <ReceiptDeliveryModal
        open={showDeliveryModal}
        onOpenChange={setShowDeliveryModal}
        receipt={receipt}
      />
    </div>
  )
}
