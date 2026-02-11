'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getRoomBookings(date?: string) {
  const supabase = await createClient()

  const targetDate = date || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('room_bookings')
    .select('*')
    .eq('booking_date', targetDate)
    .order('start_time', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getBookingsRange(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('room_bookings')
    .select('*')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .neq('status', 'cancelled')
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function createRoomBooking(data: {
  room_type: string
  room_name: string
  booking_date: string
  start_time: string
  end_time: string
  booked_by_name: string
  receipt_id?: string | null
}) {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.user.id)
    .single()

  if (!staff) throw new Error('Staff record not found')

  // Check for overlapping bookings
  const { data: overlaps } = await supabase
    .from('room_bookings')
    .select('*')
    .eq('room_name', data.room_name)
    .eq('booking_date', data.booking_date)
    .neq('status', 'cancelled')
    .lt('start_time', data.end_time)
    .gt('end_time', data.start_time)

  if (overlaps && overlaps.length > 0) {
    throw new Error(`Room ${data.room_name} is already booked during that time.`)
  }

  const { data: booking, error } = await supabase
    .from('room_bookings')
    .insert({
      room_type: data.room_type,
      room_name: data.room_name,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      customer_name: data.booked_by_name,
      booked_by: staff.id,
      receipt_id: data.receipt_id || null,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Log to audit
  await supabase.from('audit_log').insert({
    action: 'ROOM_BOOKED',
    performed_by: staff.id,
    performed_by_name: staff.full_name,
    performed_by_role: staff.role,
    reason: `Booked ${data.room_name} on ${data.booking_date} ${data.start_time}-${data.end_time} for ${data.booked_by_name}`,
  })

  revalidatePath('/dashboard/rooms')
  return booking
}

export async function cancelRoomBooking(bookingId: string, reason: string) {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.user.id)
    .single()

  if (!staff) throw new Error('Staff record not found')

  const { error } = await supabase
    .from('room_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) throw new Error(error.message)

  await supabase.from('audit_log').insert({
    action: 'ROOM_BOOKING_CANCELLED',
    performed_by: staff.id,
    performed_by_name: staff.full_name,
    performed_by_role: staff.role,
    reason: `Cancelled booking ${bookingId}: ${reason}`,
  })

  revalidatePath('/dashboard/rooms')
}
