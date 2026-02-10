'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Staff } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DashboardNavProps {
  staff: Staff
}

export function DashboardNav({ staff }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Issue Receipt' },
    { href: '/dashboard/receipts', label: 'All Receipts' },
    ...(staff.role === 'Admin' || staff.role === 'Supervisor'
      ? [
          { href: '/dashboard/admin', label: 'Dashboard' },
          { href: '/dashboard/reports', label: 'Reports' },
        ]
      : []),
    ...(staff.role === 'Admin'
      ? [{ href: '/dashboard/staff', label: 'Staff' }]
      : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="mr-4 flex">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="HOSTech" className="h-8 w-auto" />
            <span className="font-semibold text-[#1a7fc1] hidden sm:inline">Receipt System</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'transition-colors hover:text-foreground/80',
                pathname === item.href
                  ? 'text-foreground'
                  : 'text-foreground/60'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden ml-auto mr-3 p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileMenuOpen ? (
              <><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></>
            ) : (
              <><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></>
            )}
          </svg>
        </button>

        {/* Desktop User Info */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{staff.full_name}</span>
            <span className="mx-2">|</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              staff.role === 'Admin' && 'bg-[#1a7fc1]/10 text-[#1a7fc1]',
              staff.role === 'Supervisor' && 'bg-blue-500/10 text-blue-600',
              staff.role === 'Cashier' && 'bg-muted text-muted-foreground'
            )}>
              {staff.role}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block py-2 px-3 rounded-md text-sm transition-colors',
                pathname === item.href
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t pt-3 mt-2">
            <div className="flex items-center justify-between px-3">
              <div className="text-sm">
                <span className="font-medium text-foreground">{staff.full_name}</span>
                <span className={cn(
                  'ml-2 px-2 py-0.5 rounded-full text-xs',
                  staff.role === 'Admin' && 'bg-[#1a7fc1]/10 text-[#1a7fc1]',
                  staff.role === 'Supervisor' && 'bg-blue-500/10 text-blue-600',
                  staff.role === 'Cashier' && 'bg-muted text-muted-foreground'
                )}>
                  {staff.role}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
