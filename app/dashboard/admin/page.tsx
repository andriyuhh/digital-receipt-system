import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, detectMissingReceipts } from '@/app/actions/receipts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user?.id)
    .single()

  if (!staff || (staff.role !== 'Admin' && staff.role !== 'Supervisor')) {
    redirect('/dashboard')
  }

  const stats = await getDashboardStats()
  const missingReceipts = await detectMissingReceipts()

  const formatAmount = (amount: number) => {
    return `SLE ${new Intl.NumberFormat('en-SL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }

  const hasAlerts = missingReceipts.gaps.length > 0 || missingReceipts.unsyncedOffline.length > 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all receipt activity and staff performance
        </p>
      </div>

      {/* Missing Receipt Alerts */}
      {hasAlerts && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
              Missing Receipt Alerts - Supervisor Review Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingReceipts.gaps.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 mb-2">
                  Receipt Number Gaps Detected ({missingReceipts.gaps.length})
                </h3>
                <div className="rounded-md border border-red-200 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-red-100/50">
                        <TableHead className="text-red-800">Missing Receipt</TableHead>
                        <TableHead className="text-red-800">Between</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missingReceipts.gaps.slice(0, 20).map((gap) => (
                        <TableRow key={gap.expected}>
                          <TableCell className="font-mono font-bold text-red-700">
                            {gap.expected}
                          </TableCell>
                          <TableCell className="text-sm text-red-600">
                            After {gap.after}, Before {gap.before}
                          </TableCell>
                        </TableRow>
                      ))}
                      {missingReceipts.gaps.length > 20 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-red-600 text-sm">
                            ...and {missingReceipts.gaps.length - 20} more gaps
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {missingReceipts.unsyncedOffline.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 mb-2">
                  Unsynced Offline Receipts ({'>'}24h) ({missingReceipts.unsyncedOffline.length})
                </h3>
                <div className="rounded-md border border-red-200 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-red-100/50">
                        <TableHead className="text-red-800">Receipt Number</TableHead>
                        <TableHead className="text-red-800">Issued By</TableHead>
                        <TableHead className="text-red-800">Issued At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missingReceipts.unsyncedOffline.map((r) => (
                        <TableRow key={r.receipt_number}>
                          <TableCell className="font-mono font-medium">{r.receipt_number}</TableCell>
                          <TableCell>{r.issuer_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(r.issued_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReceipts}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeReceipts}</div>
            <p className="text-xs text-muted-foreground">Issued / Printed / Emailed / Verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelledReceipts}</div>
            <p className="text-xs text-muted-foreground">Voided receipts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <div className="h-4 w-4 rounded-full bg-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.draftReceipts}</div>
            <p className="text-xs text-muted-foreground">Unconfirmed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">From active receipts</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Receipts by Staff Member</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Receipts Issued</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.receiptsByStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No staff records found
                  </TableCell>
                </TableRow>
              ) : (
                stats.receiptsByStaff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        s.role === 'Admin' ? 'bg-primary/10 text-primary' :
                        s.role === 'Supervisor' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {s.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{s.receiptCount}</TableCell>
                    <TableCell className="text-right">{formatAmount(s.totalAmount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
