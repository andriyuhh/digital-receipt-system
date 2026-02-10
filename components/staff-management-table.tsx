'use client'

import { Input } from "@/components/ui/input"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { PasswordInput, validatePasswordStrength } from '@/components/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { resetStaffPassword, toggleStaffStatus, updateStaffRole } from '@/app/actions/staff'
import { cn } from '@/lib/utils'

interface Staff {
  id: string
  full_name: string
  role: 'Cashier' | 'Supervisor' | 'Admin'
  is_active: boolean
  must_change_password: boolean
  created_at: string
  disabled_at: string | null
}

interface StaffManagementTableProps {
  staff: Staff[]
  currentUserId: string
}

export function StaffManagementTable({ staff, currentUserId }: StaffManagementTableProps) {
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; staffId: string; staffName: string }>({
    open: false,
    staffId: '',
    staffName: ''
  })
  const [changeRoleDialog, setChangeRoleDialog] = useState<{ open: boolean; staffId: string; staffName: string; currentRole: string }>({
    open: false,
    staffId: '',
    staffName: '',
    currentRole: ''
  })
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'Cashier' | 'Supervisor' | 'Admin'>('Cashier')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResetPassword = async () => {
    const strengthError = validatePasswordStrength(newPassword)
    if (strengthError) {
      setError(strengthError)
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    const result = await resetStaffPassword(resetPasswordDialog.staffId, newPassword)
    
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }
    
    setResetPasswordDialog({ open: false, staffId: '', staffName: '' })
    setNewPassword('')
    setIsLoading(false)
  }

  const handleChangeRole = async () => {
    setIsLoading(true)
    setError(null)
    
    const result = await updateStaffRole(changeRoleDialog.staffId, newRole)
    
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }
    
    setChangeRoleDialog({ open: false, staffId: '', staffName: '', currentRole: '' })
    setIsLoading(false)
  }

  const handleToggleStatus = async (staffId: string, activate: boolean) => {
    const result = await toggleStaffStatus(staffId, activate)
    if (result.error) {
      alert(result.error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Staff Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Password Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No staff accounts found
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((s) => (
                  <TableRow key={s.id} className={cn(!s.is_active && 'opacity-60')}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                        s.role === 'Admin' && 'bg-primary/10 text-primary',
                        s.role === 'Supervisor' && 'bg-blue-500/10 text-blue-600',
                        s.role === 'Cashier' && 'bg-muted text-muted-foreground'
                      )}>
                        {s.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                        s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      )}>
                        {s.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.must_change_password && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Must Change
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(s.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={s.id === currentUserId}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setResetPasswordDialog({
                                open: true,
                                staffId: s.id,
                                staffName: s.full_name
                              })
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setNewRole(s.role)
                              setChangeRoleDialog({
                                open: true,
                                staffId: s.id,
                                staffName: s.full_name,
                                currentRole: s.role
                              })
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(s.id, !s.is_active)}
                            className={s.is_active ? 'text-destructive' : 'text-green-600'}
                          >
                            {s.is_active ? (
                              <>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-2"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="m15 9-6 6" />
                                  <path d="m9 9 6 6" />
                                </svg>
                                Suspend Account
                              </>
                            ) : (
                              <>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-2"
                                >
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                  <path d="m9 11 3 3L22 4" />
                                </svg>
                                Activate Account
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => {
        setResetPasswordDialog({ ...resetPasswordDialog, open })
        setNewPassword('')
        setError(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new temporary password for {resetPasswordDialog.staffName}. They will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <PasswordInput
                id="newPassword"
                placeholder="Min 8 characters"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                showStrength
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetPasswordDialog({ open: false, staffId: '', staffName: '' })}>
                Cancel
              </Button>
              <Button onClick={handleResetPassword} disabled={isLoading} className="bg-[#1a7fc1] hover:bg-[#1a7fc1]/90">
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={changeRoleDialog.open} onOpenChange={(open) => {
        setChangeRoleDialog({ ...changeRoleDialog, open })
        setError(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for {changeRoleDialog.staffName}. Current role: {changeRoleDialog.currentRole}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="role">New Role</Label>
              <Select value={newRole} onValueChange={(value: 'Cashier' | 'Supervisor' | 'Admin') => setNewRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cashier">Cashier</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setChangeRoleDialog({ open: false, staffId: '', staffName: '', currentRole: '' })}>
                Cancel
              </Button>
              <Button onClick={handleChangeRole} disabled={isLoading} className="bg-[#1a7fc1] hover:bg-[#1a7fc1]/90">
                {isLoading ? 'Updating...' : 'Update Role'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
