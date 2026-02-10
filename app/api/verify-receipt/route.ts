import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service-level client for public access (bypasses RLS)
function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10 // 10 lookups per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

export async function GET(request: NextRequest) {
  const receiptNumber = request.nextUrl.searchParams.get('number')

  if (!receiptNumber) {
    return NextResponse.json({ error: 'Receipt number is required' }, { status: 400 })
  }

  // Validate format to prevent enumeration
  const receiptPattern = /^HOS-\d{4}-\d{6}$/
  if (!receiptPattern.test(receiptNumber)) {
    return NextResponse.json({ error: 'Invalid receipt number format' }, { status: 400 })
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429 }
    )
  }

  const supabase = getPublicClient()

  // Log verification access for anomaly detection
  await supabase.from('verification_log').insert({
    receipt_number: receiptNumber,
    ip_address: ip,
    user_agent: request.headers.get('user-agent')?.slice(0, 200) || null,
  })

  // Fetch receipt - only return safe public fields
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('receipt_number, status, amount, issued_at, issuer_name, service_description, customer_name')
    .eq('receipt_number', receiptNumber)
    .single()

  if (error || !receipt) {
    // Generic message - don't reveal if number is close to a real one
    return NextResponse.json(
      { error: 'Receipt not found or invalid.' },
      { status: 404 }
    )
  }

  // Map lifecycle states to public-facing status
  const activeStatuses = ['Issued', 'Printed', 'Emailed', 'Verified']
  const publicStatus = activeStatuses.includes(receipt.status) ? 'Valid' : receipt.status

  return NextResponse.json({
    receipt_number: receipt.receipt_number,
    status: publicStatus,
    amount: receipt.amount,
    issued_at: receipt.issued_at,
    issued_by: receipt.issuer_name,
  })
}
