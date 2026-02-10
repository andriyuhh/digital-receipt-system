import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
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

  if (!staff || (staff.role !== 'Admin' && staff.role !== 'Supervisor')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const status = searchParams.get('status')
  const staffId = searchParams.get('staffId')

  let query = supabase
    .from('receipts')
    .select('*')
    .order('issued_at', { ascending: false })

  if (dateFrom) query = query.gte('issued_at', dateFrom)
  if (dateTo) query = query.lte('issued_at', dateTo + 'T23:59:59')
  if (status && status !== 'all') query = query.eq('status', status)
  if (staffId && staffId !== 'all') query = query.eq('issuer_id', staffId)

  const { data: receipts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch staff list for filter dropdown
  const { data: staffList } = await supabase
    .from('staff')
    .select('id, full_name')
    .order('full_name')

  return NextResponse.json({
    receipts: receipts || [],
    staffList: staffList || [],
    staffName: staff.full_name,
  })
}
