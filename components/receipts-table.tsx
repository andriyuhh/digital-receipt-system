'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CancelReceiptDialog } from '@/components/cancel-receipt-dialog'
import type { Receipt, Staff } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ReceiptsTableProps {
  receipts: Receipt[]
  staffList: Staff[]
  currentStaff: Staff | null
}

export function ReceiptsTable({ receipts, staffList, currentStaff }: ReceiptsTableProps) {
  const [search, setSearch] = useState('')
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const canCancel = currentStaff?.role === 'Admin' || currentStaff?.role === 'Supervisor'

  const filteredReceipts = receipts.filter((receipt) => {
    // Search filter
    if (search && !receipt.receipt_number.toLowerCase().includes(search.toLowerCase())) {
      return false
    }

    // Staff filter
    if (staffFilter !== 'all' && receipt.issuer_id !== staffFilter) {
      return false
    }

    // Status filter
    if (statusFilter !== 'all' && receipt.status !== statusFilter) {
      return false
    }

    // Date filter
    if (dateFrom) {
      const receiptDate = new Date(receipt.issued_at)
      const fromDate = new Date(dateFrom)
      if (receiptDate < fromDate) return false
    }
    if (dateTo) {
      const receiptDate = new Date(receipt.issued_at)
      const toDate = new Date(dateTo + 'T23:59:59')
      if (receiptDate > toDate) return false
    }

    return true
  })

  const formatAmount = (amount: number) => {
    return `SLE ${new Intl.NumberFormat('en-SL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1 min-w-0 sm:min-w-[200px]">
          <Input
            placeholder="Search receipt number (HOS-*)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staffList.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Issued">Issued</SelectItem>
            <SelectItem value="Printed">Printed</SelectItem>
            <SelectItem value="Emailed">Emailed</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="Synced">Synced</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredReceipts.length} of {receipts.length} receipts
      </p>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReceipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No receipts found
                </TableCell>
              </TableRow>
            ) : (
              filteredReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-mono font-medium">
                    {receipt.receipt_number}
                  </TableCell>
                  <TableCell>{receipt.customer_name}</TableCell>
                  <TableCell>{formatAmount(receipt.amount)}</TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                      receipt.status === 'Draft' && 'bg-gray-100 text-gray-800',
                      (receipt.status === 'Issued' || receipt.status === 'Printed' || receipt.status === 'Emailed' || receipt.status === 'Verified') && 'bg-green-100 text-green-800',
                      receipt.status === 'Cancelled' && 'bg-red-100 text-red-800',
                      receipt.status === 'Synced' && 'bg-blue-100 text-blue-800'
                    )}>
                      {receipt.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {receipt.issuer_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(receipt.issued_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/receipt/${receipt.receipt_number}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      {canCancel && receipt.status !== 'Cancelled' && receipt.status !== 'Draft' && (
                        <CancelReceiptDialog 
                          receiptId={receipt.id} 
                          receiptNumber={receipt.receipt_number}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
