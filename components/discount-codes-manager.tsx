'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { getDiscountCodes, createDiscountCode, toggleDiscountCode, deleteDiscountCode } from '@/app/actions/discounts'
import type { DiscountCode } from '@/lib/types'
import { format } from 'date-fns'

export function DiscountCodesManager() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [codeName, setCodeName] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUsage, setMaxUsage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const loadCodes = async () => {
    try {
      const data = await getDiscountCodes()
      setCodes(data || [])
    } catch {
      toast.error('Failed to load discount codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCodes()
  }, [])

  const handleCreate = async () => {
    if (!codeName.trim()) {
      toast.error('Code name is required')
      return
    }
    if (!discountValue || Number(discountValue) <= 0) {
      toast.error('Discount value must be greater than 0')
      return
    }
    if (discountType === 'percentage' && Number(discountValue) > 100) {
      toast.error('Percentage discount cannot exceed 100%')
      return
    }

    setCreating(true)
    try {
      await createDiscountCode({
        code: codeName,
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_usage: maxUsage ? Number(maxUsage) : null,
        expires_at: expiresAt || null,
      })
      toast.success(`Discount code "${codeName.toUpperCase()}" created`)
      setDialogOpen(false)
      resetForm()
      loadCodes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create discount code')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleDiscountCode(id, isActive)
      setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active: isActive } : c))
      toast.success(`Discount code ${isActive ? 'activated' : 'deactivated'}`)
    } catch {
      toast.error('Failed to update discount code')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDiscountCode(id)
      setCodes(prev => prev.filter(c => c.id !== id))
      toast.success('Discount code deleted')
    } catch {
      toast.error('Failed to delete discount code')
    }
  }

  const resetForm = () => {
    setCodeName('')
    setDiscountType('percentage')
    setDiscountValue('')
    setMaxUsage('')
    setExpiresAt('')
  }

  const isExpired = (code: DiscountCode) =>
    code.expires_at && new Date(code.expires_at) < new Date()

  const isMaxedOut = (code: DiscountCode) =>
    code.max_usage !== null && code.current_usage >= code.max_usage

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Discount Codes</CardTitle>
          <CardDescription>Create and manage discount codes for receipts</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              New Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Discount Code</DialogTitle>
              <DialogDescription>Set up a new discount code for staff to apply on receipts.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code-name">Code Name</Label>
                <Input
                  id="code-name"
                  placeholder="e.g. STUDENT10, PROMO25"
                  value={codeName}
                  onChange={(e) => setCodeName(e.target.value.toUpperCase())}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (Le)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount-value">
                    Value {discountType === 'percentage' ? '(%)' : '(Le)'}
                  </Label>
                  <Input
                    id="discount-value"
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? '100' : undefined}
                    placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-usage">Max Usage (optional)</Label>
                  <Input
                    id="max-usage"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={maxUsage}
                    onChange={(e) => setMaxUsage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires-at">Expiry Date (optional)</Label>
                  <Input
                    id="expires-at"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Code'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading discount codes...</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No discount codes created yet. Click &quot;New Code&quot; to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-semibold">{code.code}</TableCell>
                    <TableCell className="capitalize">{code.discount_type}</TableCell>
                    <TableCell>
                      {code.discount_type === 'percentage'
                        ? `${code.discount_value}%`
                        : `Le ${code.discount_value.toLocaleString()}`}
                    </TableCell>
                    <TableCell>
                      {code.current_usage}{code.max_usage !== null ? ` / ${code.max_usage}` : ' / --'}
                    </TableCell>
                    <TableCell>
                      {code.expires_at
                        ? format(new Date(code.expires_at), 'MMM d, yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {isExpired(code) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : isMaxedOut(code) ? (
                        <Badge variant="secondary">Maxed Out</Badge>
                      ) : code.is_active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={code.is_active}
                        onCheckedChange={(checked) => handleToggle(code.id, checked)}
                        disabled={!!isExpired(code) || !!isMaxedOut(code)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Discount Code</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the code &quot;{code.code}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(code.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
