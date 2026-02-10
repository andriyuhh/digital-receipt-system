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

  const { format, dateFrom, dateTo, count } = await request.json()

  // Log the export action in audit trail
  await supabase.from('audit_log').insert({
    receipt_id: null,
    action: 'REPORT_EXPORT',
    performed_by: staff.id,
    performed_by_name: staff.full_name,
    performed_by_role: staff.role,
    reason: `Exported ${count} receipts as ${format} (${dateFrom || 'all'} to ${dateTo || 'all'})`,
  })

  return NextResponse.json({ success: true })
}
