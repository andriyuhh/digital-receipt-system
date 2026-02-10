import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 403 })
  }

  const { receiptId, phone } = await request.json()

  if (!receiptId || !phone) {
    return NextResponse.json({ error: 'Receipt ID and phone required' }, { status: 400 })
  }

  // Validate phone format
  const cleanPhone = phone.replace(/[\s\-()]/g, '')
  if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
  }

  // Get receipt
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single()

  if (error || !receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  // Save phone to receipt if not already set
  if (!receipt.customer_phone) {
    await supabase
      .from('receipts')
      .update({ customer_phone: cleanPhone })
      .eq('id', receipt.id)
  }

  // Build signed verification URL
  const sig = receipt.qr_signature || ''
  const t = encodeURIComponent(receipt.issued_at)
  const origin = request.headers.get('origin') || new URL(request.url).origin
  const verifyUrl = sig
    ? `${origin}/verify/${receipt.receipt_number}?sig=${sig}&t=${t}`
    : `${origin}/verify/${receipt.receipt_number}`

  // Compose WhatsApp message - only verification link, no sensitive data
  const message = encodeURIComponent(
    `HOSTech Coworking Space\n\nYour receipt ${receipt.receipt_number} is ready.\n\nVerify here:\n${verifyUrl}\n\nThank you for choosing HOSTech!`
  )

  // Use WhatsApp click-to-chat URL
  const whatsappPhone = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${message}`

  // Log delivery in audit trail
  await supabase.from('audit_log').insert({
    receipt_id: receipt.id,
    action: 'WhatsApp Delivery',
    old_status: receipt.status,
    new_status: receipt.status,
    performed_by: staff.id,
    performed_by_name: staff.full_name,
    performed_by_role: staff.role,
    reason: `WhatsApp sent to ${cleanPhone.slice(0, 4)}***${cleanPhone.slice(-3)}`,
  })

  return NextResponse.json({ success: true, whatsappUrl })
}
