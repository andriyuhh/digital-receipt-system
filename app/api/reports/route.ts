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

  // Calculate enhanced analytics
  const allReceipts = receipts || []
  const activeStatuses = ['Issued', 'Printed', 'Emailed', 'Verified']
  const activeReceipts = allReceipts.filter(r => activeStatuses.includes(r.status))

  // Discount analytics
  const discountedReceipts = activeReceipts.filter(r => r.discount_code && Number(r.discount_amount) > 0)
  const totalDiscountsGiven = discountedReceipts.reduce((sum, r) => sum + Number(r.discount_amount || 0), 0)

  // Discounts by code
  const discountsByCode: Record<string, { count: number; total: number }> = {}
  discountedReceipts.forEach(r => {
    const code = r.discount_code || 'Unknown'
    if (!discountsByCode[code]) discountsByCode[code] = { count: 0, total: 0 }
    discountsByCode[code].count++
    discountsByCode[code].total += Number(r.discount_amount || 0)
  })

  // Staff discount usage
  const staffDiscountUsage: Record<string, { name: string; count: number }> = {}
  discountedReceipts.forEach(r => {
    const id = r.issuer_id
    if (!staffDiscountUsage[id]) staffDiscountUsage[id] = { name: r.issuer_name, count: 0 }
    staffDiscountUsage[id].count++
  })
  const topDiscountStaff = Object.values(staffDiscountUsage).sort((a, b) => b.count - a.count)[0] || null

  // Revenue by service category
  const revenueByCategory: Record<string, number> = {}
  const freeBenefitsUsed: Record<string, number> = {}
  activeReceipts.forEach(r => {
    const category = r.service_type || 'Other'
    if (!revenueByCategory[category]) revenueByCategory[category] = 0
    revenueByCategory[category] += Number(r.amount)
    
    // Parse service details for free benefits
    if (r.service_details && typeof r.service_details === 'object') {
      const details = r.service_details as Record<string, unknown>
      const items = (details.line_items as Array<Record<string, unknown>>) || []
      items.forEach(item => {
        if (item.free_used && Number(item.free_used) > 0) {
          const itemType = (item.service_type as string) || category
          if (!freeBenefitsUsed[itemType]) freeBenefitsUsed[itemType] = 0
          freeBenefitsUsed[itemType] += Number(item.free_used)
        }
      })
    }
  })

  return NextResponse.json({
    receipts: allReceipts,
    staffList: staffList || [],
    staffName: staff.full_name,
    analytics: {
      totalDiscountsGiven,
      discountsByCode,
      topDiscountStaff,
      discountedReceiptsCount: discountedReceipts.length,
      revenueByCategory,
      freeBenefitsUsed,
    }
  })
}
