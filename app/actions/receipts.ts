'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateSignature } from '@/lib/qr-signature'
import type { ReceiptStatus } from '@/lib/types'

const TRANSITIONS: Record<ReceiptStatus, ReceiptStatus[]> = {
  Draft: ['Issued', 'Cancelled'],
  Issued: ['Printed', 'Emailed', 'Verified', 'Cancelled'],
  Printed: ['Emailed', 'Verified', 'Cancelled'],
  Emailed: ['Verified', 'Cancelled'],
  Verified: ['Cancelled'],
  Cancelled: [],
  Synced: ['Issued', 'Cancelled'],
}

function canTransition(from: ReceiptStatus, to: ReceiptStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export async function generateReceiptNumber(): Promise<string> {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()

  const { data: counter, error: counterError } = await supabase
    .from('receipt_counter')
    .select('*')
    .eq('id', 1)
    .single()

  if (counterError) throw new Error('Failed to get receipt counter')

  let newNumber: number

  if (counter.current_year !== currentYear) {
    newNumber = 1
    await supabase
      .from('receipt_counter')
      .update({ current_year: currentYear, current_number: 1 })
      .eq('id', 1)
  } else {
    newNumber = counter.current_number + 1
    await supabase
      .from('receipt_counter')
      .update({ current_number: newNumber })
      .eq('id', 1)
  }

  return `HOS-${currentYear}-${String(newNumber).padStart(6, '0')}`
}

// Step 1: Create a draft receipt (shows confirmation screen)
export async function createDraftReceipt(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!staff) throw new Error('Staff record not found')

  const receiptNumber = await generateReceiptNumber()
  const issuedAt = new Date().toISOString()
  const sig = generateSignature(receiptNumber, issuedAt)
  const customerEmail = (formData.get('customer_email') as string) || null
  const customerPhone = (formData.get('customer_phone') as string) || null

  const receiptData = {
    receipt_number: receiptNumber,
    customer_name: formData.get('patient_name') as string,
    customer_id: (formData.get('patient_id') as string) || null,
    service_description: formData.get('service_description') as string,
    amount: parseFloat(formData.get('amount') as string),
    payment_method: formData.get('payment_method') as string,
    issuer_id: staff.id,
    issuer_name: staff.full_name,
    issuer_role: staff.role,
    internal_notes: (formData.get('internal_notes') as string) || null,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    qr_signature: sig,
    status: 'Draft',
    is_locked: false,
    issued_at: issuedAt,
  }

  const { data: receipt, error } = await supabase
    .from('receipts')
    .insert(receiptData)
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('audit_log').insert({
    receipt_id: receipt.id,
    action: 'DRAFT_CREATED',
    new_status: 'Draft',
    performed_by: staff.id,
    performed_by_name: staff.full_name,
    performed_by_role: staff.role,
    reason: 'Receipt draft created for confirmation',
  })

  revalidatePath('/dashboard')
  return receipt
}

// Step 2: Confirm and issue the receipt (Draft -> Issued)
export async function confirmReceipt(receiptId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!staff) throw new Error('Staff record not found')

  const { data: receipt } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single()

  if (!receipt) throw new Error('Receipt not found')
  if (!canTransition(receipt.status, 'Issued')) {
    throw new Error(`Cannot confirm receipt: invalid state transition from ${receipt.status} to Issued`)
  }

  const { error: updateError } = await supabase
    .from('receipts')
    .update({ status: 'Issued', is_locked: true })
    .eq('id', receiptId)

  if (updateError) throw new Error(updateError.message)

  await supabase.from('audit_log').insert({
    receipt_id: receiptId,
    action: 'CONFIRMED',
    old_status: 'Draft',
    new_status: 'Issued',
    performed_by: staff.id,
    performed_by_name: staff.full_name,
    performed_by_role: staff.role,
    reason: 'Receipt confirmed and permanently issued',
  })

  revalidatePath('/dashboard')
  return { ...receipt, status: 'Issued' as const }
}

// Transition receipt status with validation
export async function transitionReceiptStatus(
  receiptId: string,
  newStatus: ReceiptStatus,
  reason?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!staff) throw new Error('Staff record not found')

  const { data: receipt } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single()

  if (!receipt) throw new Error('Receipt not found')

  if (!canTransition(receipt.status, newStatus)) {
    throw new Error(`Invalid state transition: ${receipt.status} -> ${newStatus}`)
  }

  const { error: updateError } = await supabase
    .from('receipts')
    .update({ status: newStatus })
    .eq('id', receiptId)

  if (updateError) throw new Error(updateError.message)

  await supabase.from('audit_log').insert({
    receipt_id: receiptId,
    action: `STATUS_${newStatus.toUpperCase()}`,
    old_status: receipt.status,
    new_status: newStatus,
    performed_by: staff.id,
    performed_by_name: staff.full_name,
    performed_by_role: staff.role,
    reason: reason || `Status changed to ${newStatus}`,
  })

  revalidatePath('/dashboard')
  revalidatePath(`/receipt/${receipt.receipt_number}`)
}

export async function cancelReceipt(receiptId: string, reason: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!staff) throw new Error('Staff record not found')

  if (staff.role !== 'Supervisor' && staff.role !== 'Admin') {
    throw new Error('Only Supervisors and Admins can cancel receipts')
  }

  const { data: receipt } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single()

  if (!receipt) throw new Error('Receipt not found')

  if (!canTransition(receipt.status, 'Cancelled')) {
    throw new Error(`Cannot cancel receipt in ${receipt.status} state`)
  }

  const { error: updateError } = await supabase
    .from('receipts')
    .update({ status: 'Cancelled' })
    .eq('id', receiptId)

  if (updateError) throw new Error(updateError.message)

  await supabase.from('audit_log').insert({
    receipt_id: receiptId,
    action: 'CANCELLED',
    old_status: receipt.status,
    new_status: 'Cancelled',
    performed_by: staff.id,
    performed_by_name: staff.full_name,
    performed_by_role: staff.role,
    reason: reason,
  })

  revalidatePath('/dashboard')
  revalidatePath(`/receipt/${receipt.receipt_number}`)
}

export async function getReceipts(filters?: {
  dateFrom?: string
  dateTo?: string
  staffId?: string
  search?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('receipts')
    .select('*')
    .order('issued_at', { ascending: false })

  if (filters?.dateFrom) {
    query = query.gte('issued_at', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('issued_at', filters.dateTo + 'T23:59:59')
  }
  if (filters?.staffId) {
    query = query.eq('issuer_id', filters.staffId)
  }
  if (filters?.search) {
    query = query.ilike('receipt_number', `%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getReceiptByNumber(receiptNumber: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('receipt_number', receiptNumber)
    .single()

  if (error) return null
  return data
}

export async function getAuditLog(receiptId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getDashboardStats() {
  const supabase = await createClient()

  const { data: receipts } = await supabase
    .from('receipts')
    .select('issuer_id, issuer_name, status, amount')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')

  const totalReceipts = receipts?.length || 0
  const activeStatuses = ['Issued', 'Printed', 'Emailed', 'Verified']
  const activeReceipts = receipts?.filter(r => activeStatuses.includes(r.status)).length || 0
  const cancelledReceipts = receipts?.filter(r => r.status === 'Cancelled').length || 0
  const draftReceipts = receipts?.filter(r => r.status === 'Draft').length || 0
  const totalAmount = receipts?.filter(r => activeStatuses.includes(r.status)).reduce((sum, r) => sum + Number(r.amount), 0) || 0

  const receiptsByStaff = staff?.map(s => ({
    ...s,
    receiptCount: receipts?.filter(r => r.issuer_id === s.id).length || 0,
    totalAmount: receipts?.filter(r => r.issuer_id === s.id && activeStatuses.includes(r.status)).reduce((sum, r) => sum + Number(r.amount), 0) || 0,
  })) || []

  return {
    totalReceipts,
    activeReceipts,
    cancelledReceipts,
    draftReceipts,
    totalAmount,
    receiptsByStaff,
  }
}

// Missing receipt detection
export async function detectMissingReceipts() {
  const supabase = await createClient()

  const { data: receipts } = await supabase
    .from('receipts')
    .select('receipt_number, status, issued_at')
    .order('receipt_number', { ascending: true })

  if (!receipts || receipts.length === 0) return { gaps: [], unsyncedOffline: [] }

  const gaps: { expected: string; after: string; before: string }[] = []

  for (let i = 0; i < receipts.length - 1; i++) {
    const current = receipts[i]
    const next = receipts[i + 1]

    // Parse receipt numbers: HOS-YYYY-XXXXXX
    const currentMatch = current.receipt_number.match(/^HOS-(\d{4})-(\d{6})$/)
    const nextMatch = next.receipt_number.match(/^HOS-(\d{4})-(\d{6})$/)

    if (!currentMatch || !nextMatch) continue

    const currentYear = parseInt(currentMatch[1])
    const nextYear = parseInt(nextMatch[1])
    const currentNum = parseInt(currentMatch[2])
    const nextNum = parseInt(nextMatch[2])

    // Only detect gaps within the same year
    if (currentYear === nextYear && nextNum - currentNum > 1) {
      for (let n = currentNum + 1; n < nextNum; n++) {
        gaps.push({
          expected: `HOS-${currentYear}-${String(n).padStart(6, '0')}`,
          after: current.receipt_number,
          before: next.receipt_number,
        })
      }
    }
  }

  // Detect offline receipts not synced within 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: unsyncedOffline } = await supabase
    .from('receipts')
    .select('receipt_number, issued_at, issuer_name')
    .eq('status', 'Synced')
    .lt('issued_at', twentyFourHoursAgo)

  return {
    gaps,
    unsyncedOffline: unsyncedOffline || [],
  }
}
