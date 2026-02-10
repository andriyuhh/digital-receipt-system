import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  
  // Check if system has been initialized (any staff exists)
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .limit(1)
  
  // If no staff exists, redirect to setup
  if (!staff || staff.length === 0) {
    redirect('/setup')
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/auth/login')
  }
}
