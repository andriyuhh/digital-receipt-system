import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReceiptStatus } from '@/lib/types'
import { VALID_TRANSITIONS } from '@/lib/types'

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

  const { receiptId, method } = await request.json()

  if (!receiptId || !method) {
    return NextResponse.json({ error: 'Receipt ID and method required' }, { status: 400 })
  }

  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single()

  if (error || !receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  // Map delivery method to potential status transition
  const statusMap: Record<string, ReceiptStatus> = {
    Print: 'Printed',
  }

  const newStatus = statusMap[method]
  if (newStatus) {
    const currentStatus = receipt.status as ReceiptStatus
    const validNext = VALID_TRANSITIONS[currentStatus] || []
    if (validNext.includes(newStatus)) {
      await supabase
        .from('receipts')
        .update({ status: newStatus })
        .eq('id', receipt.id)
    }
  }

  // Log in audit trail
  await supabase.from('audit_log').insert({
    receipt_id: receipt.id,
    action: `${method} Delivery`,
    old_status: receipt.status,
    new_status: newStatus || receipt.status,
    performed_by: staff.id,
    performed_by_name: staff.full_name,
    performed_by_role: staff.role,
    reason: `Receipt delivered via ${method}`,
  })

  return NextResponse.json({ success: true })
}
