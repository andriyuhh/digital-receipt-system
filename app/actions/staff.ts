'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const ALLOWED_EMAIL_DOMAIN = '@coworkingspacesl.com'
const SEED_ADMIN_EMAIL = 'officeadmin@coworkingspacesl.com'

// Check if current user is admin (uses regular client to verify session)
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }
  
  const adminClient = createAdminClient()
  const { data: staff } = await adminClient
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (!staff || staff.role !== 'Admin') {
    throw new Error('Admin access required')
  }
  
  return { user, staff }
}

// Validate email domain
function validateEmailDomain(email: string): boolean {
  if (email.toLowerCase() === SEED_ADMIN_EMAIL.toLowerCase()) {
    return true
  }
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN.toLowerCase())
}

// Create staff account (Admin only)
export async function createStaffAccount(data: {
  email: string
  password: string
  fullName: string
  role: 'Cashier' | 'Supervisor' | 'Admin'
}) {
  const { staff: adminStaff } = await requireAdmin()
  const adminClient = createAdminClient()
  
  // Validate email domain
  if (!validateEmailDomain(data.email)) {
    return { 
      error: `Only official coworking space emails are allowed (must end with ${ALLOWED_EMAIL_DOMAIN})` 
    }
  }
  
  // Create user in Supabase Auth using admin client (service role)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.fullName,
      role: data.role
    }
  })
  
  if (authError) {
    return { error: authError.message }
  }
  
  if (!authData.user) {
    return { error: 'Failed to create user' }
  }
  
  // Create staff record
  const { error: staffError } = await adminClient
    .from('staff')
    .insert({
      id: authData.user.id,
      email: data.email,
      full_name: data.fullName,
      role: data.role,
      is_active: true,
      must_change_password: true,
    })
  
  if (staffError) {
    // Rollback: delete auth user if staff creation fails
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: staffError.message }
  }
  
  // Log to audit
  await adminClient.from('audit_log').insert({
    action: 'STAFF_CREATED',
    performed_by: adminStaff.id,
    performed_by_name: adminStaff.full_name,
    performed_by_role: adminStaff.role,
    reason: `Created staff account for ${data.fullName} (${data.email}) with role ${data.role}`
  })
  
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/staff')
  
  return { success: true, userId: authData.user.id }
}

// Reset staff password (Admin only)
export async function resetStaffPassword(staffId: string, newPassword: string) {
  const { staff: adminStaff } = await requireAdmin()
  const adminClient = createAdminClient()
  
  // Get target staff info for audit log
  const { data: targetStaff } = await adminClient
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single()
  
  if (!targetStaff) {
    return { error: 'Staff not found' }
  }
  
  // Update password using admin API
  const { error: authError } = await adminClient.auth.admin.updateUserById(staffId, {
    password: newPassword
  })
  
  if (authError) {
    return { error: authError.message }
  }
  
  // Set must_change_password flag
  await adminClient
    .from('staff')
    .update({ must_change_password: true })
    .eq('id', staffId)
  
  // Log to audit
  await adminClient.from('audit_log').insert({
    action: 'PASSWORD_RESET',
    performed_by: adminStaff.id,
    performed_by_name: adminStaff.full_name,
    performed_by_role: adminStaff.role,
    reason: `Password reset for ${targetStaff.full_name} (${staffId})`
  })
  
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/staff')
  
  return { success: true }
}

// Suspend/Activate staff account (Admin only)
export async function toggleStaffStatus(staffId: string, activate: boolean) {
  const { staff: adminStaff } = await requireAdmin()
  const adminClient = createAdminClient()
  
  // Get target staff info
  const { data: targetStaff } = await adminClient
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single()
  
  if (!targetStaff) {
    return { error: 'Staff not found' }
  }
  
  // Prevent disabling the seed admin
  const { data: authUser } = await adminClient.auth.admin.getUserById(staffId)
  if (authUser?.user?.email?.toLowerCase() === SEED_ADMIN_EMAIL.toLowerCase() && !activate) {
    return { error: 'Cannot disable the seed admin account' }
  }
  
  // Update staff status
  const { error: updateError } = await adminClient
    .from('staff')
    .update({
      is_active: activate,
      disabled_at: activate ? null : new Date().toISOString(),
      disabled_by: activate ? null : adminStaff.id
    })
    .eq('id', staffId)
  
  if (updateError) {
    return { error: updateError.message }
  }
  
  // Log to audit
  await adminClient.from('audit_log').insert({
    action: activate ? 'STAFF_ACTIVATED' : 'STAFF_SUSPENDED',
    performed_by: adminStaff.id,
    performed_by_name: adminStaff.full_name,
    performed_by_role: adminStaff.role,
    reason: `${activate ? 'Activated' : 'Suspended'} staff account: ${targetStaff.full_name}`
  })
  
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/staff')
  
  return { success: true }
}

// Update staff role (Admin only)
export async function updateStaffRole(staffId: string, newRole: 'Cashier' | 'Supervisor' | 'Admin') {
  const { staff: adminStaff } = await requireAdmin()
  const adminClient = createAdminClient()
  
  // Get target staff info
  const { data: targetStaff } = await adminClient
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single()
  
  if (!targetStaff) {
    return { error: 'Staff not found' }
  }
  
  const oldRole = targetStaff.role
  
  // Update role
  const { error: updateError } = await adminClient
    .from('staff')
    .update({ role: newRole })
    .eq('id', staffId)
  
  if (updateError) {
    return { error: updateError.message }
  }
  
  // Log to audit
  await adminClient.from('audit_log').insert({
    action: 'ROLE_CHANGED',
    performed_by: adminStaff.id,
    performed_by_name: adminStaff.full_name,
    performed_by_role: adminStaff.role,
    reason: `Changed role for ${targetStaff.full_name} from ${oldRole} to ${newRole}`
  })
  
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/staff')
  
  return { success: true }
}

// Soft delete staff account (Admin only) - marks as deleted but retains record
export async function softDeleteStaff(staffId: string) {
  const { staff: adminStaff } = await requireAdmin()
  const adminClient = createAdminClient()
  
  // Get target staff info
  const { data: targetStaff } = await adminClient
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single()
  
  if (!targetStaff) {
    return { error: 'Staff not found' }
  }

  // Prevent deleting the seed admin
  const { data: authUser } = await adminClient.auth.admin.getUserById(staffId)
  if (authUser?.user?.email?.toLowerCase() === SEED_ADMIN_EMAIL.toLowerCase()) {
    return { error: 'Cannot delete the seed admin account' }
  }

  // Check for active receipts - prevent deletion if they have active receipts
  const { data: activeReceipts } = await adminClient
    .from('receipts')
    .select('id')
    .eq('issuer_id', staffId)
    .in('status', ['Issued', 'Printed', 'Emailed'])
    .limit(1)

  if (activeReceipts && activeReceipts.length > 0) {
    return { error: 'Cannot delete staff with active receipts. Suspend the account instead.' }
  }
  
  // Soft delete: set is_active to false and mark as deleted
  const { error: updateError } = await adminClient
    .from('staff')
    .update({
      is_active: false,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: adminStaff.id,
      disabled_at: new Date().toISOString(),
      disabled_by: adminStaff.id,
    })
    .eq('id', staffId)
  
  if (updateError) {
    return { error: updateError.message }
  }
  
  // Disable auth account too
  await adminClient.auth.admin.updateUserById(staffId, {
    ban_duration: '876600h' // ~100 years, effectively permanent ban
  })
  
  // Log to audit
  await adminClient.from('audit_log').insert({
    action: 'STAFF_DELETED',
    performed_by: adminStaff.id,
    performed_by_name: adminStaff.full_name,
    performed_by_role: adminStaff.role,
    reason: `Soft-deleted staff account: ${targetStaff.full_name} (records retained for audit trail)`
  })
  
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/staff')
  
  return { success: true }
}

// Update staff name (Admin only)
export async function updateStaffName(staffId: string, newName: string) {
  const { staff: adminStaff } = await requireAdmin()
  const adminClient = createAdminClient()

  const { data: targetStaff } = await adminClient
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single()

  if (!targetStaff) {
    return { error: 'Staff not found' }
  }

  const oldName = targetStaff.full_name

  const { error: updateError } = await adminClient
    .from('staff')
    .update({ full_name: newName })
    .eq('id', staffId)

  if (updateError) {
    return { error: updateError.message }
  }

  await adminClient.from('audit_log').insert({
    action: 'STAFF_NAME_UPDATED',
    performed_by: adminStaff.id,
    performed_by_name: adminStaff.full_name,
    performed_by_role: adminStaff.role,
    reason: `Updated name for ${oldName} to ${newName}`
  })

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/staff')

  return { success: true }
}

// Get all staff members
export async function getAllStaff() {
  await requireAdmin()
  const adminClient = createAdminClient()
  
  const { data: staff, error } = await adminClient
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    return { error: error.message, staff: [] }
  }
  
  return { staff: staff || [] }
}

// Get audit logs
export async function getAuditLogs(filter?: { action?: string; limit?: number }) {
  await requireAdmin()
  const adminClient = createAdminClient()
  
  let query = adminClient
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (filter?.action) {
    query = query.eq('action', filter.action)
  }
  
  if (filter?.limit) {
    query = query.limit(filter.limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    return { error: error.message, logs: [] }
  }
  
  return { logs: data || [] }
}
