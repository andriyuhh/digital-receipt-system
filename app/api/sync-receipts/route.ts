import { createClient } from '@/lib/supabase/server'
import { generateReceiptNumber } from '@/app/actions/receipts'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: staff } = await supabase
      .from('staff')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 403 })
    }

    const body = await request.json()
    const { receipts } = body

    if (!receipts || !Array.isArray(receipts)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const synced: { tempId: string; receiptNumber: string }[] = []

    for (const offlineReceipt of receipts) {
      try {
        const receiptNumber = await generateReceiptNumber()

        const { data: receipt, error } = await supabase
          .from('receipts')
          .insert({
            receipt_number: receiptNumber,
            customer_name: offlineReceipt.customer_name,
            customer_id: offlineReceipt.customer_id,
            service_description: offlineReceipt.service_description,
            amount: offlineReceipt.amount,
            payment_method: offlineReceipt.payment_method,
            issuer_id: staff.id,
            issuer_name: staff.full_name,
            issuer_role: staff.role,
            internal_notes: offlineReceipt.internal_notes,
            status: 'Synced',
            is_locked: true,
            issued_at: offlineReceipt.created_at,
          })
          .select()
          .single()

        if (!error && receipt) {
          await supabase.from('audit_log').insert({
            receipt_id: receipt.id,
            action: 'CREATED',
            new_status: 'Synced',
            performed_by: staff.id,
            performed_by_name: staff.full_name,
            performed_by_role: staff.role,
            reason: `Receipt issued offline (synced). Original temp ID: ${offlineReceipt.tempId}`,
          })

          synced.push({
            tempId: offlineReceipt.tempId,
            receiptNumber,
          })
        }
      } catch {
        // Skip failed receipt, will retry next sync
      }
    }

    return NextResponse.json({ synced, total: synced.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
