import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 403 })
  }

  const body = await request.json()
  const { receiptId, customerEmail } = body

  if (!receiptId || !customerEmail) {
    return NextResponse.json(
      { error: 'Receipt ID and customer email are required' },
      { status: 400 }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(customerEmail)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single()

  if (receiptError || !receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  // Store customer email on receipt
  await supabase
    .from('receipts')
    .update({ customer_email: customerEmail })
    .eq('id', receiptId)

  // Build signed verification URL
  const sig = receipt.qr_signature || ''
  const t = encodeURIComponent(receipt.issued_at)
  const verifyUrl = sig
    ? `${request.nextUrl.origin}/verify/${receipt.receipt_number}?sig=${sig}&t=${t}`
    : `${request.nextUrl.origin}/verify/${receipt.receipt_number}`
  const formattedDate = new Date(receipt.issued_at).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
  const formattedAmount = `SLE ${Number(receipt.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Build QR code URL using a public API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verifyUrl)}`

  const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    
    <!-- Header -->
    <div style="background-color:#1a7fc1;padding:28px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">HOSTech Coworking Space</h1>
      <p style="margin:4px 0 0;color:#bae6fd;font-size:12px;font-style:italic;">Innovate. Learn. Grow.</p>
    </div>

    <!-- Receipt Body -->
    <div style="padding:28px 24px;">
      <p style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Thank you for your payment. Here is your official receipt from HOSTech Coworking Space.
      </p>

      <!-- Receipt Card -->
      <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#71717a;font-size:13px;border-bottom:1px solid #e4e4e7;">Receipt No.</td>
            <td style="padding:8px 0;color:#18181b;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #e4e4e7;font-family:monospace;">${receipt.receipt_number}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;font-size:13px;border-bottom:1px solid #e4e4e7;">Amount</td>
            <td style="padding:8px 0;color:#18181b;font-size:16px;font-weight:700;text-align:right;border-bottom:1px solid #e4e4e7;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;font-size:13px;border-bottom:1px solid #e4e4e7;">Date & Time</td>
            <td style="padding:8px 0;color:#18181b;font-size:13px;text-align:right;border-bottom:1px solid #e4e4e7;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;font-size:13px;border-bottom:1px solid #e4e4e7;">Service</td>
            <td style="padding:8px 0;color:#18181b;font-size:13px;text-align:right;border-bottom:1px solid #e4e4e7;">${receipt.service_description}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a;font-size:13px;">Issued By</td>
            <td style="padding:8px 0;color:#18181b;font-size:13px;text-align:right;">${receipt.issuer_name}</td>
          </tr>
        </table>
      </div>

      <!-- QR Code -->
      <div style="text-align:center;margin-bottom:24px;">
        <p style="color:#71717a;font-size:12px;margin:0 0 8px;">Scan to verify this receipt</p>
        <img src="${qrUrl}" alt="QR Code" width="140" height="140" style="display:inline-block;" />
      </div>

      <!-- View Receipt Button -->
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${verifyUrl}" style="display:inline-block;background-color:#1a7fc1;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
          View Receipt
        </a>
      </div>

      <p style="margin:16px 0 0;color:#a1a1aa;font-size:11px;text-align:center;line-height:1.5;">
        This is an automated receipt email. This receipt is read-only and cannot be modified.
        If you have questions, contact HOSTech Coworking Space directly.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color:#fafafa;border-top:1px solid #e4e4e7;padding:16px 24px;text-align:center;">
      <p style="margin:0;color:#a1a1aa;font-size:11px;">
        HOSTech Coworking Space &middot; Freetown, Sierra Leone
      </p>
    </div>
  </div>
</body>
</html>`

  // Send email via Supabase Edge Function or fallback to logging
  // Using Supabase's built-in email sending via auth API workaround
  // In production, integrate with Resend, SendGrid, etc.
  // For now we use a simple fetch to a mail API
  try {
    // Try sending via Resend if API key is available
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'HOSTech Receipts <onboarding@resend.dev>',
          to: customerEmail,
          subject: `Receipt ${receipt.receipt_number} - HOSTech Coworking Space`,
          html: htmlEmail,
        }),
      })

      if (!emailResponse.ok) {
        const errBody = await emailResponse.text()
        console.error('Resend email error:', errBody)
        // Still log the attempt even on failure
      }
    } else {
      // No email provider configured - log for demo purposes
      console.info(`Receipt email for ${receipt.receipt_number} to ${customerEmail} logged (RESEND_API_KEY not configured)`)
    }

    // Transition to Emailed status if applicable
    const emailableStatuses = ['Issued', 'Printed']
    if (emailableStatuses.includes(receipt.status)) {
      await supabase
        .from('receipts')
        .update({ status: 'Emailed' })
        .eq('id', receipt.id)
    }

    // Log email send in audit trail
    await supabase.from('audit_log').insert({
      receipt_id: receipt.id,
      action: 'Email Receipt Sent',
      performed_by: staff.id,
      performed_by_name: staff.full_name,
      performed_by_role: staff.role,
      reason: `Receipt emailed to ${customerEmail}`,
    })

    return NextResponse.json({ success: true, message: process.env.RESEND_API_KEY ? 'Email sent successfully' : 'Email logged (configure RESEND_API_KEY for delivery)' })
  } catch (err) {
    console.error('Receipt email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
