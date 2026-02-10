import { createClient } from '@/lib/supabase/server'
import { ReceiptsTable } from '@/components/receipts-table'

export default async function ReceiptsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user?.id)
    .single()

  const { data: allStaff } = await supabase
    .from('staff')
    .select('*')
    .order('full_name')

  const { data: receipts } = await supabase
    .from('receipts')
    .select('*')
    .order('issued_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Receipts</h1>
        <p className="text-muted-foreground">
          View and manage all issued receipts
        </p>
      </div>
      <ReceiptsTable 
        receipts={receipts || []} 
        staffList={allStaff || []} 
        currentStaff={staff}
      />
    </div>
  )
}
