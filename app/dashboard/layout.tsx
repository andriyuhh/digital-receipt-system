import React from "react"
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard-nav'
import { AutoLogoutWrapper } from '@/components/auto-logout-wrapper'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!staff) {
    redirect('/auth/login')
  }

  // Check if password change is required
  if (staff.must_change_password) {
    redirect('/auth/change-password')
  }

  // Check if rules acknowledgment is required
  if (!staff.rules_acknowledged) {
    redirect('/auth/acknowledge-rules')
  }

  return (
    <AutoLogoutWrapper>
      <div className="min-h-screen bg-muted/30">
        <DashboardNav staff={staff} />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </AutoLogoutWrapper>
  )
}
