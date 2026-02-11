import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RoomAvailabilityTracker } from '@/components/room-availability-tracker'

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!staff) redirect('/auth/login')

  return (
    <div className="space-y-6">
      <RoomAvailabilityTracker />
    </div>
  )
}
