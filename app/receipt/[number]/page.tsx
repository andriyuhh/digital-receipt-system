import { notFound } from 'next/navigation'
import { getReceiptByNumber } from '@/app/actions/receipts'
import { ReceiptDisplay } from '@/components/receipt-display'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const { number } = await params
  const receipt = await getReceiptByNumber(number)

  if (!receipt) {
    notFound()
  }

  const headersList = await headers()
  const host = headersList.get('host') || ''
  const proto = headersList.get('x-forwarded-proto') || 'https'
  const baseUrl = `${proto}://${host}`

  // Check if user is Admin (can reprint at any time)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let canReprint = false
  if (user) {
    const { data: staff } = await supabase
      .from('staff')
      .select('role')
      .eq('id', user.id)
      .single()
    canReprint = staff?.role === 'Admin'
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Receipt {receipt.receipt_number}</h1>
            <p className="text-muted-foreground">
              Issued on {new Date(receipt.issued_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="customer">Customer Copy</TabsTrigger>
            <TabsTrigger value="office">Office Copy</TabsTrigger>
          </TabsList>
          <TabsContent value="customer" className="mt-6">
            <ReceiptDisplay 
              receipt={receipt} 
              variant="customer" 
              baseUrl={baseUrl}
              canReprint={canReprint}
            />
          </TabsContent>
          <TabsContent value="office" className="mt-6">
            <ReceiptDisplay 
              receipt={receipt} 
              variant="office" 
              baseUrl={baseUrl}
              canReprint={canReprint}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
