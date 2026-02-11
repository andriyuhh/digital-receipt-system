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
  deleted_at: string | null
  deleted_by: string | null
  theme_preference: 'light' | 'dark' | 'system'
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
  discount_code_id: string | null
  discount_code: string | null
  discount_type: string | null
  discount_value: number
  discount_amount: number
  original_amount: number
  service_type: string | null
  service_details: ServiceDetails | null
}

export type ServiceType = 'workspace' | 'meeting_room' | 'conference_room' | 'printing' | 'custom'

export interface DiscountCode {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_usage: number | null
  current_usage: number
  is_active: boolean
  expires_at: string | null
  created_by: string | null
  created_at: string
}

export interface ServiceConfig {
  id: string
  service_type: string
  duration: string | null
  package_name: string | null
  member_type: string | null
  base_price: number
  free_allowance: number
  extra_rate: number
  is_active: boolean
  updated_at: string
  updated_by: string | null
}

export interface ServiceLineItem {
  service_type: ServiceType
  description: string
  duration?: string
  package_name?: string
  member_type?: string
  quantity?: number
  free_allowance?: number
  free_used?: number
  extra_units?: number
  unit_price: number
  subtotal: number
  room_booking_id?: string
}

export interface ServiceDetails {
  line_items: ServiceLineItem[]
  subtotal: number
  discount_amount: number
  total: number
}

export interface RoomBooking {
  id: string
  room_type: 'meeting_room' | 'conference_room'
  room_name: string
  booking_date: string
  start_time: string
  end_time: string
  booked_by: string | null
  receipt_id: string | null
  customer_name: string | null
  status: 'confirmed' | 'cancelled'
  created_at: string
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
