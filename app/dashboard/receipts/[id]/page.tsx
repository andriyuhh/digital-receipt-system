import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuditLog } from '@/app/actions/receipts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuditLogViewer } from '@/components/audit-log-viewer'
import { CancelReceiptDialog } from '@/components/cancel-receipt-dialog'
import { cn } from '@/lib/utils'

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!staff) redirect('/auth/login')

  const { data: receipt } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .single()

  if (!receipt) {
    notFound()
  }

  const auditLogs = await getAuditLog(receipt.id)

  const canCancel = (staff.role === 'Admin' || staff.role === 'Supervisor') && receipt.status !== 'Cancelled' && receipt.status !== 'Draft'

  const formatAmount = (amount: number) => {
    return `SLE ${new Intl.NumberFormat('en-SL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{receipt.receipt_number}</h1>
          <p className="text-muted-foreground">
            Receipt Details and Audit Trail
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/receipt/${receipt.receipt_number}`}>
            <Button variant="outline">View/Print Receipt</Button>
          </Link>
          {canCancel && (
            <CancelReceiptDialog 
              receiptId={receipt.id} 
              receiptNumber={receipt.receipt_number}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Receipt Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Receipt Information
              <span className={cn(
                'inline-block px-3 py-1 rounded-full text-xs font-bold uppercase',
                receipt.status === 'Draft' && 'bg-gray-100 text-gray-800',
                (receipt.status === 'Issued' || receipt.status === 'Printed' || receipt.status === 'Emailed' || receipt.status === 'Verified') && 'bg-green-100 text-green-800',
                receipt.status === 'Cancelled' && 'bg-red-100 text-red-800',
                receipt.status === 'Synced' && 'bg-blue-100 text-blue-800'
              )}>
                {receipt.status}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Client Name</span>
                <span className="font-medium">{receipt.customer_name}</span>
              </div>
              {receipt.customer_id && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Member ID</span>
                  <span>{receipt.customer_id}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold">{formatAmount(receipt.amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Payment Method</span>
                <span>{receipt.payment_method}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Issued At</span>
                <span className="text-sm">{formatDate(receipt.issued_at)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Issued By</span>
                <span>{receipt.issuer_name} ({receipt.issuer_role})</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Service Description</p>
              <p className="text-sm bg-muted p-3 rounded">{receipt.service_description}</p>
            </div>
            {receipt.internal_notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Internal Notes</p>
                <p className="text-sm bg-amber-50 text-amber-900 p-3 rounded border border-amber-200">
                  {receipt.internal_notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Trail */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditLogViewer logs={auditLogs} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
