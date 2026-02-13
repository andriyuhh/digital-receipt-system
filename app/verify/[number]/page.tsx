import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { verifySignature } from '@/lib/qr-signature'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Rate limiter (in-memory, per-instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export default async function VerifyReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>
  searchParams: Promise<{ sig?: string; t?: string }>
}) {
  const { number } = await params
  const { sig, t } = await searchParams

  // Validate receipt number format to prevent enumeration
  const receiptPattern = /^HOS-\d{4}-\d{6}$/
  if (!receiptPattern.test(number)) {
    notFound()
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  // Rate limiting
  if (!checkRateLimit(ip)) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Too Many Requests</h2>
          <p className="text-muted-foreground text-sm">Please wait a moment before verifying again.</p>
        </Card>
      </div>
    )
  }

  const supabase = getServiceClient()

  // Log verification access for anomaly detection
  await supabase.from('verification_log').insert({
    receipt_number: number,
    ip_address: ip,
    user_agent: headersList.get('user-agent')?.slice(0, 200) || null,
  })

  // Validate signature if provided (from QR code)
  // Try both raw and decoded timestamp since URL params may already be decoded by the browser
  let signatureValid = false
  if (sig && t) {
    signatureValid = verifySignature(number, t, sig) || verifySignature(number, decodeURIComponent(t), sig)
  }

  // Fetch only safe public fields
  const { data: receipt } = await supabase
    .from('receipts')
    .select('receipt_number, status, amount, issued_at, issuer_name, service_description, customer_name, payment_method')
    .eq('receipt_number', number)
    .single()

  // Generic "not found" message - don't reveal if number is close to a real one
  if (!receipt) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Receipt Not Found or Invalid</h2>
          <p className="text-muted-foreground text-sm">The receipt number you provided could not be verified. Please check and try again.</p>
          <Link href="/verify" className="inline-block mt-4 text-sm text-[#1a7fc1] hover:underline">
            Try another receipt number
          </Link>
        </Card>
      </div>
    )
  }

  // Update status to Verified if currently Issued/Printed/Emailed (only with valid signature)
  if (signatureValid && ['Issued', 'Printed', 'Emailed'].includes(receipt.status)) {
    await supabase
      .from('receipts')
      .update({ status: 'Verified' })
      .eq('receipt_number', number)
    receipt.status = 'Verified'
  }

  const isActive = ['Issued', 'Printed', 'Emailed', 'Verified'].includes(receipt.status)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
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

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            {isActive ? (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
              </div>
            )}
          </div>
          <CardTitle className="text-xl text-foreground">Receipt Verification</CardTitle>
          {signatureValid && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
              <span className="text-xs text-green-700 font-medium">Cryptographically verified</span>
            </div>
          )}
          <div className={cn(
            'inline-block px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider mt-2',
            isActive && 'bg-green-100 text-green-800',
            receipt.status === 'Cancelled' && 'bg-red-100 text-red-800',
            receipt.status === 'Draft' && 'bg-gray-100 text-gray-800',
            receipt.status === 'Synced' && 'bg-blue-100 text-blue-800'
          )}>
            {isActive ? 'Valid' : receipt.status}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Receipt Number</p>
            <p className="text-lg font-mono font-bold mt-1 text-foreground">{receipt.receipt_number}</p>
          </div>

          <div className="grid gap-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Amount</span>
              <span className="font-semibold text-foreground">{formatAmount(receipt.amount)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Date</span>
              <span className="text-sm text-foreground">{formatDate(receipt.issued_at)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Time</span>
              <span className="text-sm text-foreground">{formatTime(receipt.issued_at)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Status</span>
              <span className={cn(
                'text-sm font-semibold',
                isActive && 'text-green-700',
                receipt.status === 'Cancelled' && 'text-red-700'
              )}>
                {isActive ? 'Valid' : receipt.status}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground text-sm">Issued By</span>
              <span className="text-sm text-foreground">{receipt.issuer_name}</span>
            </div>
          </div>

          {/* Read-only notice */}
          <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground bg-muted/50 rounded-lg py-3 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
            <span>This is a read-only verification. Receipt cannot be modified from this page.</span>
          </div>

          <div className="text-center pt-4 text-xs text-muted-foreground">
            <img src="/logo.png" alt="HOSTech Coworking Space" className="h-10 mx-auto mb-2" />
            <p className="text-[#1a7fc1] font-medium">HOSTech Coworking Space</p>
            <p>Freetown, Sierra Leone</p>
            <p className="mt-1">This verification confirms the authenticity of the receipt.</p>
          </div>

          <div className="text-center pt-2">
            <Link href="/verify" className="text-xs text-[#1a7fc1] hover:underline">
              Verify another receipt
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
