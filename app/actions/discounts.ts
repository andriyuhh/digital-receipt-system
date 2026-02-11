'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getDiscountCodes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function createDiscountCode(formData: {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_usage: number | null
  expires_at: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check admin role
  const { data: staff } = await supabase.from('staff').select('role').eq('id', user.id).single()
  if (!staff || staff.role !== 'Admin') throw new Error('Only admins can create discount codes')

  // Validate percentage doesn't exceed 100
  if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
    throw new Error('Percentage discount cannot exceed 100%')
  }

  const { data, error } = await supabase
    .from('discount_codes')
    .insert({
      code: formData.code.toUpperCase().trim(),
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      max_usage: formData.max_usage,
      expires_at: formData.expires_at,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('A discount code with this name already exists')
    throw new Error(error.message)
  }

  // Log in audit
  await supabase.from('audit_log').insert({
    receipt_id: null,
    action: 'discount_code_created',
    performed_by: user.id,
    performed_by_name: (await supabase.from('staff').select('full_name').eq('id', user.id).single()).data?.full_name || 'Unknown',
    performed_by_role: 'Admin',
    reason: `Created discount code: ${formData.code.toUpperCase()} (${formData.discount_type} - ${formData.discount_value})`,
  })

  revalidatePath('/dashboard/admin')
  return data
}

export async function toggleDiscountCode(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: staff } = await supabase.from('staff').select('role, full_name').eq('id', user.id).single()
  if (!staff || staff.role !== 'Admin') throw new Error('Only admins can modify discount codes')

  const { error } = await supabase
    .from('discount_codes')
    .update({ is_active })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('audit_log').insert({
    receipt_id: null,
    action: is_active ? 'discount_code_activated' : 'discount_code_deactivated',
    performed_by: user.id,
    performed_by_name: staff.full_name,
    performed_by_role: 'Admin',
    reason: `Discount code ${is_active ? 'activated' : 'deactivated'}`,
  })

  revalidatePath('/dashboard/admin')
}

export async function deleteDiscountCode(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: staff } = await supabase.from('staff').select('role, full_name').eq('id', user.id).single()
  if (!staff || staff.role !== 'Admin') throw new Error('Only admins can delete discount codes')

  // Get code details before deletion for audit log
  const { data: code } = await supabase.from('discount_codes').select('code').eq('id', id).single()

  const { error } = await supabase
    .from('discount_codes')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  await supabase.from('audit_log').insert({
    receipt_id: null,
    action: 'discount_code_deleted',
    performed_by: user.id,
    performed_by_name: staff.full_name,
    performed_by_role: 'Admin',
    reason: `Deleted discount code: ${code?.code || 'Unknown'}`,
  })

  revalidatePath('/dashboard/admin')
}

export async function validateDiscountCode(code: string, amount: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (error || !data) {
    return { valid: false, error: 'Invalid discount code' }
  }

  if (!data.is_active) {
    return { valid: false, error: 'This discount code is inactive' }
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'This discount code has expired' }
  }

  if (data.max_usage !== null && data.current_usage >= data.max_usage) {
    // Auto-disable
    await supabase.from('discount_codes').update({ is_active: false }).eq('id', data.id)
    return { valid: false, error: 'This discount code has reached its usage limit' }
  }

  // Calculate discount amount
  let discountAmount = 0
  if (data.discount_type === 'percentage') {
    discountAmount = (amount * data.discount_value) / 100
  } else {
    discountAmount = data.discount_value
  }

  // Block if discount exceeds total
  if (discountAmount >= amount) {
    return { valid: false, error: 'Discount exceeds the total amount. Cannot apply.' }
  }

  return {
    valid: true,
    discount: data,
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalAmount: Math.round((amount - discountAmount) * 100) / 100,
  }
}

export async function applyDiscountUsage(discountCodeId: string) {
  const supabase = await createClient()
  
  // Increment usage
  const { data: current } = await supabase
    .from('discount_codes')
    .select('current_usage, max_usage')
    .eq('id', discountCodeId)
    .single()

  if (!current) return

  const newUsage = (current.current_usage || 0) + 1

  await supabase
    .from('discount_codes')
    .update({
      current_usage: newUsage,
      // Auto-disable if usage limit reached
      is_active: current.max_usage === null || newUsage < current.max_usage,
    })
    .eq('id', discountCodeId)
}
