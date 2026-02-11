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
import { Textarea } from '@/components/ui/textarea'
import { resetStaffPassword, toggleStaffStatus, updateStaffRole, softDeleteStaff, updateStaffName } from '@/app/actions/staff'
import { cn } from '@/lib/utils'

interface Staff {
  id: string
  full_name: string
  role: 'Cashier' | 'Supervisor' | 'Admin'
  is_active: boolean
  is_deleted?: boolean
  must_change_password: boolean
  created_at: string
  disabled_at: string | null
  deleted_at?: string | null
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
  const [editNameDialog, setEditNameDialog] = useState<{ open: boolean; staffId: string; staffName: string }>({
    open: false,
    staffId: '',
    staffName: ''
  })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; staffId: string; staffName: string }>({
    open: false,
    staffId: '',
    staffName: ''
  })
  const [editedName, setEditedName] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
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

  const handleEditName = async () => {
    if (!editedName.trim()) {
      setError('Name cannot be empty')
      return
    }
    setIsLoading(true)
    setError(null)

    const result = await updateStaffName(editNameDialog.staffId, editedName.trim())
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    setEditNameDialog({ open: false, staffId: '', staffName: '' })
    setEditedName('')
    setIsLoading(false)
  }

  const handleSoftDelete = async () => {
    setIsLoading(true)
    setError(null)

    const result = await softDeleteStaff(deleteDialog.staffId)
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    setDeleteDialog({ open: false, staffId: '', staffName: '' })
    setIsLoading(false)
  }

  const filteredStaff = showDeleted ? staff : staff.filter(s => !s.is_deleted)

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Staff Accounts</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="show-deleted" className="text-muted-foreground cursor-pointer">Show deleted</label>
            <input
              id="show-deleted"
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded"
            />
          </div>
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
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No staff accounts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((s) => (
                  <TableRow key={s.id} className={cn(!s.is_active && 'opacity-60', s.is_deleted && 'opacity-40 line-through')}>
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
                        s.is_deleted ? 'bg-muted text-muted-foreground' :
                        s.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {s.is_deleted ? 'Deleted' : s.is_active ? 'Active' : 'Suspended'}
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
                          <Button variant="ghost" size="sm" disabled={s.id === currentUserId || !!s.is_deleted}>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setEditedName(s.full_name)
                              setEditNameDialog({
                                open: true,
                                staffId: s.id,
                                staffName: s.full_name
                              })
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            Edit Name
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteDialog({
                                open: true,
                                staffId: s.id,
                                staffName: s.full_name
                              })
                            }}
                            className="text-destructive"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            Delete Account
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

      {/* Edit Name Dialog */}
      <Dialog open={editNameDialog.open} onOpenChange={(open) => {
        setEditNameDialog({ ...editNameDialog, open })
        setError(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Name</DialogTitle>
            <DialogDescription>
              Update the display name for {editNameDialog.staffName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Full Name</Label>
              <Input
                id="editName"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditNameDialog({ open: false, staffId: '', staffName: '' })}>
                Cancel
              </Button>
              <Button onClick={handleEditName} disabled={isLoading} className="bg-[#1a7fc1] hover:bg-[#1a7fc1]/90">
                {isLoading ? 'Saving...' : 'Save Name'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        setDeleteDialog({ ...deleteDialog, open })
        setError(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Staff Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the account for <strong>{deleteDialog.staffName}</strong>?
              This will permanently disable their access. The record is retained for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive leading-relaxed">
                <strong>This action will:</strong><br />
                - Permanently disable the staff account<br />
                - Prevent all future logins<br />
                - Retain the record for audit trail integrity
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialog({ open: false, staffId: '', staffName: '' })}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleSoftDelete} disabled={isLoading}>
                {isLoading ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </>
  )
  }
