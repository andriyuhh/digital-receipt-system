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
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Build QR code SVG from the ref
    const qrSvg = receiptRef.current?.querySelector('.qr-code-wrap svg')?.outerHTML || ''

    const isOffice = variant === 'office'
    const statusText = receipt.status
    const isCancelled = statusText === 'Cancelled'

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${receipt.receipt_number} - ${isOffice ? 'Office' : 'Customer'} Copy</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 3mm 4mm;
              background: #fff;
              color: #000;
              font-size: 12px;
              line-height: 1.3;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .receipt-paper {
              width: 100%;
            }

            /* Dashed divider */
            .divider {
              border: none;
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .divider-double {
              border: none;
              border-top: 2px solid #000;
              margin: 6px 0;
            }

            /* Header */
            .header {
              text-align: center;
              padding-bottom: 4px;
            }
            .biz-name {
              font-size: 16px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .biz-tagline {
              font-size: 9px;
              font-style: italic;
              color: #555;
            }
            .biz-location {
              font-size: 10px;
              color: #333;
              margin-top: 2px;
            }

            /* Copy type banner */
            .copy-banner {
              text-align: center;
              font-size: 11px;
              font-weight: bold;
              letter-spacing: 3px;
              text-transform: uppercase;
              padding: 4px 0;
              border: 1px dashed #000;
              margin: 4px 0;
            }
            .copy-banner.office {
              background: #f5f5f5;
            }

            /* Receipt number */
            .rcpt-num {
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              letter-spacing: 2px;
              padding: 4px 0;
            }

            /* Status */
            .status {
              text-align: center;
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 2px;
              padding: 3px 0;
            }
            .status.cancelled {
              text-decoration: line-through;
            }

            /* Row items */
            .row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 11px;
              gap: 8px;
            }
            .row .lbl {
              color: #333;
              flex-shrink: 0;
            }
            .row .val {
              text-align: right;
              font-weight: bold;
              word-break: break-word;
            }

            /* Description block */
            .desc-label {
              font-size: 10px;
              color: #333;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 2px;
            }
            .desc-text {
              font-size: 11px;
              white-space: pre-wrap;
              word-break: break-word;
            }

            /* Amount block */
            .amount-block {
              text-align: center;
              padding: 8px 0;
            }
            .amount-label {
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 2px;
              color: #333;
            }
            .amount-value {
              font-size: 22px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .payment-method {
              font-size: 10px;
              color: #333;
              margin-top: 2px;
            }

            /* Notes */
            .notes-block {
              border: 1px dashed #000;
              padding: 4px 6px;
              margin: 4px 0;
            }
            .notes-label {
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .notes-text {
              font-size: 10px;
              white-space: pre-wrap;
              word-break: break-word;
            }

            /* QR */
            .qr-section {
              text-align: center;
              padding: 6px 0;
            }
            .qr-section svg {
              display: block;
              margin: 4px auto;
            }
            .qr-hint {
              font-size: 8px;
              color: #555;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .qr-url {
              font-size: 7px;
              color: #888;
              word-break: break-all;
              margin-top: 2px;
            }

            /* Footer */
            .footer {
              text-align: center;
              font-size: 9px;
              color: #555;
              padding-top: 4px;
            }
            .footer p {
              margin: 1px 0;
            }
            .thank-you {
              font-size: 11px;
              font-weight: bold;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 2px;
              color: #000;
            }

            /* Office watermark */
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 36px;
              color: rgba(0,0,0,0.04);
              font-weight: bold;
              pointer-events: none;
              z-index: -1;
              white-space: nowrap;
            }

            @media print {
              body { margin: 0; padding: 2mm 3mm; }
              @page { margin: 0; size: 72mm auto; }
            }
          </style>
        </head>
        <body>
          ${isOffice ? '<div class="watermark">OFFICE COPY</div>' : ''}
          <div class="receipt-paper">

            <!-- Header -->
            <div class="header">
              <div class="biz-name">HOSTech</div>
              <div class="biz-tagline">Coworking Space</div>
              <div class="biz-location">Freetown, Sierra Leone</div>
              <div class="biz-tagline">Innovate. Learn. Grow.</div>
            </div>

            <hr class="divider-double" />

            <!-- Copy type -->
            <div class="copy-banner ${isOffice ? 'office' : ''}">${isOffice ? 'Office Copy' : 'Customer Copy'}</div>

            <!-- Receipt number & status -->
            <div class="rcpt-num">${receipt.receipt_number}</div>
            <div class="status ${isCancelled ? 'cancelled' : ''}">${statusText}</div>

            <hr class="divider" />

            <!-- Client info -->
            <div class="row">
              <span class="lbl">Client:</span>
              <span class="val">${receipt.customer_name}</span>
            </div>
            ${receipt.customer_id ? `
            <div class="row">
              <span class="lbl">Member ID:</span>
              <span class="val">${receipt.customer_id}</span>
            </div>` : ''}

            <hr class="divider" />

            <!-- Service description -->
            <div class="desc-label">Service</div>
            <div class="desc-text">${receipt.service_description}</div>

            <hr class="divider" />

            <!-- Amount -->
            <div class="amount-block">
              ${receipt.discount_code && Number(receipt.discount_amount) > 0 ? `
              <div style="font-size:10px;color:#555;margin-bottom:2px;">Original: ${formatAmount(Number(receipt.original_amount) || receipt.amount)}</div>
              <div style="font-size:10px;color:#16a34a;margin-bottom:2px;">Discount (${receipt.discount_code}): -${formatAmount(Number(receipt.discount_amount))}</div>
              ` : ''}
              <div class="amount-label">Total Amount</div>
              <div class="amount-value">${formatAmount(receipt.amount)}</div>
              <div class="payment-method">${receipt.payment_method}</div>
            </div>

            <hr class="divider" />

            <!-- Date/Time -->
            <div class="row">
              <span class="lbl">Date:</span>
              <span class="val">${formatDate(receipt.issued_at)}</span>
            </div>
            <div class="row">
              <span class="lbl">Time:</span>
              <span class="val">${formatTime(receipt.issued_at)}</span>
            </div>

            <hr class="divider" />

            <!-- Issuer -->
            <div class="row">
              <span class="lbl">Issued by:</span>
              <span class="val">${receipt.issuer_name}</span>
            </div>
            <div class="row">
              <span class="lbl">Role:</span>
              <span class="val">${receipt.issuer_role}</span>
            </div>

            ${isOffice && receipt.internal_notes ? `
            <hr class="divider" />
            <div class="notes-block">
              <div class="notes-label">Internal Notes</div>
              <div class="notes-text">${receipt.internal_notes}</div>
            </div>` : ''}

            <hr class="divider" />

            <!-- QR Code -->
            <div class="qr-section">
              <div class="qr-hint">Scan to Verify</div>
              ${qrSvg}
              <div class="qr-url">${verificationUrl}</div>
            </div>

            <hr class="divider-double" />

            <!-- Footer -->
            <div class="footer">
              <p class="thank-you">Thank You!</p>
              <p>HOSTech Coworking Space</p>
              <p>Computer-generated receipt</p>
              <p>No signature required</p>
            </div>

          </div>
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
            {receipt.discount_code && Number(receipt.discount_amount) > 0 && (
              <div className="mb-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Original: {formatAmount(Number(receipt.original_amount) || receipt.amount)}
                </p>
                <p className="text-xs text-emerald-600 font-medium">
                  Discount ({receipt.discount_code}): -{formatAmount(Number(receipt.discount_amount))}
                </p>
              </div>
            )}
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
          <div className="qr-code-wrap inline-block bg-white p-2 rounded">
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
