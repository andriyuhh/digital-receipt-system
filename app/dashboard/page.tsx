import { createClient } from '@/lib/supabase/server'
import { ReceiptForm } from '@/components/receipt-form'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user?.id)
    .single()

  if (!staff) {
    return <div className="text-foreground">Staff record not found</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Issue Receipt</h1>
        <p className="text-muted-foreground">
          Create a new receipt for a client or customer
        </p>
      </div>
      <ReceiptForm staffName={staff.full_name} staffRole={staff.role} staffId={staff.id} />
    </div>
  )
}
