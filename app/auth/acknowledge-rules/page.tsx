'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'

export default function AcknowledgeRulesPage() {
  const [checked, setChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAcknowledge = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setIsSubmitting(false)
        return
      }

      const { error: updateError } = await supabase
        .from('staff')
        .update({ rules_acknowledged: true })
        .eq('id', user.id)

      if (updateError) {
        setError(updateError.message)
        setIsSubmitting(false)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center border-b pb-6">
          <img src="/logo.png" alt="HOSTech" className="h-14 mx-auto mb-3" />
          <CardTitle className="text-xl text-foreground">System Usage Rules & Agreement</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            You must read and acknowledge these rules before using the system.
          </p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Rules Section */}
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-5 space-y-3">
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">Rules of System Usage</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-[#1a7fc1]/10 flex items-center justify-center text-[#1a7fc1] text-xs font-bold">1</span>
                  <span>Receipts must only be issued for valid, authorized transactions.</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-[#1a7fc1]/10 flex items-center justify-center text-[#1a7fc1] text-xs font-bold">2</span>
                  <span>Receipt numbers are system-generated and must not be altered, modified, or duplicated.</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-[#1a7fc1]/10 flex items-center justify-center text-[#1a7fc1] text-xs font-bold">3</span>
                  <span>Sharing login credentials with anyone is strictly prohibited.</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-[#1a7fc1]/10 flex items-center justify-center text-[#1a7fc1] text-xs font-bold">4</span>
                  <span>All system actions are logged, monitored, and stored permanently.</span>
                </li>
              </ul>
            </div>

            {/* Fraud Warning */}
            <div className="rounded-lg bg-red-50 border border-red-200 p-5 space-y-2">
              <h3 className="font-semibold text-red-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                Fraud Warning
              </h3>
              <p className="text-sm text-red-700 leading-relaxed">
                Any form of receipt manipulation, duplication, or unauthorized cancellation
                will result in <span className="font-semibold">immediate disciplinary action</span>.
                The system maintains a permanent, immutable audit trail that records every action
                taken by every user.
              </p>
            </div>
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="flex items-start gap-3 bg-muted/50 p-4 rounded-lg border">
            <Checkbox
              id="acknowledge"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="acknowledge" className="text-sm text-foreground leading-relaxed cursor-pointer select-none">
              I have read and understand the system usage rules and fraud warning above.
              I acknowledge that all my actions within this system are logged and monitored,
              and I agree to comply with these rules.
            </label>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>
          )}

          <Button
            onClick={handleAcknowledge}
            disabled={!checked || isSubmitting}
            className="w-full bg-[#1a7fc1] hover:bg-[#1a7fc1]/90 text-white"
          >
            {isSubmitting ? 'Processing...' : 'I Acknowledge & Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
