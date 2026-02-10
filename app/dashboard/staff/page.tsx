import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllStaff } from '@/app/actions/staff'
import { StaffManagementTable } from '@/components/staff-management-table'
import { CreateStaffDialog } from '@/components/create-staff-dialog'

export default async function StaffManagementPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: currentStaff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user?.id)
    .single()

  // Only admins can access this page
  if (!currentStaff || currentStaff.role !== 'Admin') {
    redirect('/dashboard')
  }

  const { staff } = await getAllStaff()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and control staff accounts
          </p>
        </div>
        <CreateStaffDialog />
      </div>

      <StaffManagementTable staff={staff} currentUserId={user?.id || ''} />
    </div>
  )
}
