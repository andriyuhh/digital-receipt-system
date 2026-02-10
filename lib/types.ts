export interface Staff {
  id: string
  full_name: string
  role: 'Cashier' | 'Supervisor' | 'Admin'
  is_active: boolean
  must_change_password: boolean
  disabled_at: string | null
  disabled_by: string | null
  rules_acknowledged: boolean
  created_at: string
}

export type ReceiptStatus = 'Draft' | 'Issued' | 'Printed' | 'Emailed' | 'Verified' | 'Cancelled' | 'Synced'

// Valid state transitions
export const VALID_TRANSITIONS: Record<ReceiptStatus, ReceiptStatus[]> = {
  Draft: ['Issued', 'Cancelled'],
  Issued: ['Printed', 'Emailed', 'Verified', 'Cancelled'],
  Printed: ['Emailed', 'Verified', 'Cancelled'],
  Emailed: ['Verified', 'Cancelled'],
  Verified: ['Cancelled'],
  Cancelled: [],
  Synced: ['Issued', 'Cancelled'],
}

export interface Receipt {
  id: string
  receipt_number: string
  status: ReceiptStatus
  customer_name: string
  customer_id: string | null
  service_description: string
  amount: number
  payment_method: 'Cash' | 'Card' | 'Bank Transfer' | 'Mobile Payment'
  issuer_id: string
  issuer_name: string
  issuer_role: string
  internal_notes: string | null
  customer_email: string | null
  customer_phone: string | null
  qr_signature: string | null
  issued_at: string
  is_locked: boolean
}

export interface AuditLog {
  id: string
  receipt_id: string
  action: string
  old_status: string | null
  new_status: string | null
  performed_by: string
  performed_by_name: string
  performed_by_role: string
  reason: string | null
  created_at: string
}

export interface ReceiptCounter {
  id: number
  current_year: number
  current_number: number
}
