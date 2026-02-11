'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { getRoomBookings, createRoomBooking, cancelRoomBooking } from '@/app/actions/bookings'
import type { RoomBooking } from '@/lib/types'
import { format, addDays, parseISO } from 'date-fns'

const ROOMS = [
  { name: 'Meeting Room A', type: 'meeting_room', capacity: 6 },
  { name: 'Meeting Room B', type: 'meeting_room', capacity: 8 },
  { name: 'Conference Room', type: 'conference_room', capacity: 20 },
]

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
]

export function RoomAvailabilityTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [bookings, setBookings] = useState<RoomBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)

  // Form state
  const [selectedRoom, setSelectedRoom] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [bookedByName, setBookedByName] = useState('')
  const [bookedByMemberId, setBookedByMemberId] = useState('')
  const [purpose, setPurpose] = useState('')

  const loadBookings = async () => {
    setLoading(true)
    try {
      const data = await getRoomBookings(selectedDate)
      setBookings(data as RoomBooking[])
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  const isSlotBooked = (roomName: string, time: string) => {
    return bookings.find(
      b => b.room_name === roomName &&
        b.status !== 'cancelled' &&
        b.start_time <= time &&
        b.end_time > time
    )
  }

  const handleBook = async () => {
    if (!selectedRoom || !startTime || !endTime || !bookedByName.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    if (startTime >= endTime) {
      toast.error('End time must be after start time')
      return
    }

    setCreating(true)
    try {
      const room = ROOMS.find(r => r.name === selectedRoom)
      await createRoomBooking({
        room_type: room?.type || 'meeting_room',
        room_name: selectedRoom,
        booking_date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        booked_by_name: bookedByName.trim(),
        booked_by_member_id: bookedByMemberId || null,
        purpose: purpose || null,
      })
      toast.success(`Room booked: ${selectedRoom} ${startTime}-${endTime}`)
      setBookingDialogOpen(false)
      resetForm()
      loadBookings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setCreating(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelBookingId) return
    try {
      await cancelRoomBooking(cancelBookingId, 'Cancelled by staff')
      toast.success('Booking cancelled')
      setCancelDialogOpen(false)
      setCancelBookingId(null)
      loadBookings()
    } catch {
      toast.error('Failed to cancel booking')
    }
  }

  const resetForm = () => {
    setSelectedRoom('')
    setStartTime('')
    setEndTime('')
    setBookedByName('')
    setBookedByMemberId('')
    setPurpose('')
  }

  const navigateDate = (days: number) => {
    const current = parseISO(selectedDate)
    const newDate = addDays(current, days)
    setSelectedDate(format(newDate, 'yyyy-MM-dd'))
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Header with date navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Room Availability</h2>
          <p className="text-sm text-muted-foreground">View and book meeting and conference rooms</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateDate(-1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            {!isToday && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                Today
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateDate(1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Button>
          <Button size="sm" onClick={() => setBookingDialogOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Book Room
          </Button>
        </div>
      </div>

      {/* Room grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading room availability...</div>
      ) : (
        <div className="space-y-4">
          {ROOMS.map((room) => (
            <Card key={room.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{room.name}</CardTitle>
                    <CardDescription>Capacity: {room.capacity} people</CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">{room.type.replace('_', ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map((time) => {
                    const booking = isSlotBooked(room.name, time)
                    const isBooked = !!booking

                    return (
                      <button
                        key={time}
                        className={`flex flex-col items-center rounded-lg border px-3 py-2 text-xs transition-colors ${
                          isBooked
                            ? 'bg-destructive/10 border-destructive/30 text-destructive cursor-pointer'
                            : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (isBooked && booking) {
                            setCancelBookingId(booking.id)
                            setCancelDialogOpen(true)
                          } else {
                            setSelectedRoom(room.name)
                            setStartTime(time)
                            // Auto-set end time to next hour
                            const nextIdx = TIME_SLOTS.indexOf(time) + 1
                            if (nextIdx < TIME_SLOTS.length) {
                              setEndTime(TIME_SLOTS[nextIdx])
                            }
                            setBookingDialogOpen(true)
                          }
                        }}
                        title={isBooked && booking ? `${booking.booked_by_name}${booking.purpose ? ` - ${booking.purpose}` : ''}` : 'Available - click to book'}
                      >
                        <span className="font-mono font-medium">{time}</span>
                        <span className="mt-0.5">{isBooked ? 'Booked' : 'Open'}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Today's bookings list */}
                {bookings.filter(b => b.room_name === room.name && b.status !== 'cancelled').length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bookings</h4>
                    {bookings
                      .filter(b => b.room_name === room.name && b.status !== 'cancelled')
                      .map((b) => (
                        <div key={b.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/50 p-2">
                          <div>
                            <span className="font-mono font-medium">{b.start_time}-{b.end_time}</span>
                            <span className="mx-2 text-muted-foreground">|</span>
                            <span>{b.booked_by_name}</span>
                            {b.purpose && <span className="text-muted-foreground ml-1">({b.purpose})</span>}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-destructive hover:text-destructive text-xs"
                            onClick={() => {
                              setCancelBookingId(b.id)
                              setCancelDialogOpen(true)
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Book Room Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={(open) => { setBookingDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book a Room</DialogTitle>
            <DialogDescription>
              Reserve a meeting or conference room for {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Room *</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {ROOMS.map(room => (
                    <SelectItem key={room.name} value={room.name}>
                      {room.name} (up to {room.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Select value={startTime} onValueChange={(v) => { setStartTime(v); if (endTime && endTime <= v) setEndTime('') }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="End" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.filter(t => t > startTime).map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    <SelectItem value="19:00">19:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booked-by">Booked By *</Label>
                <Input
                  id="booked-by"
                  placeholder="Client or member name"
                  value={bookedByName}
                  onChange={(e) => setBookedByName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-id">Member ID</Label>
                <Input
                  id="member-id"
                  placeholder="Optional"
                  value={bookedByMemberId}
                  onChange={(e) => setBookedByMemberId(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-purpose">Purpose</Label>
              <Input
                id="booking-purpose"
                placeholder="e.g. Team meeting, client presentation..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBookingDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleBook} disabled={creating}>
              {creating ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this room booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelBookingId(null)}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
