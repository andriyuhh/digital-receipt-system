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

  const { data: admin } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!admin || admin.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { staffName, staffEmail, tempPassword, loginUrl } = body

  if (!staffName || !staffEmail || !tempPassword) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const resolvedLoginUrl = loginUrl || `${request.nextUrl.origin}/auth/login`

  const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    
    <!-- Header -->
    <div style="background-color:#1a7fc1;padding:28px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Welcome to HOSTech Coworking Space</h1>
      <p style="margin:4px 0 0;color:#bae6fd;font-size:12px;font-style:italic;">Innovate. Learn. Grow.</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px;color:#18181b;font-size:16px;font-weight:600;">
        Hello ${staffName},
      </p>
      <p style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.6;">
        Your staff account for the HOSTech Coworking Space Receipt System has been created.
        Please use the credentials below to log in and change your password immediately.
      </p>

      <!-- Credentials Card -->
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:13px;">Email</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600;text-align:right;font-family:monospace;">${staffEmail}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:13px;">Temporary Password</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600;text-align:right;font-family:monospace;">${tempPassword}</td>
          </tr>
        </table>
      </div>

      <!-- Login Button -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${resolvedLoginUrl}" style="display:inline-block;background-color:#1a7fc1;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
          Log In Now
        </a>
      </div>

      <p style="margin:0 0 8px;color:#dc2626;font-size:13px;font-weight:600;">
        Important: You must change your password on first login.
      </p>

      <!-- Rules Section -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 12px;color:#991b1b;font-size:14px;font-weight:700;">
          System Usage Rules
        </p>
        <ul style="margin:0;padding-left:18px;color:#3f3f46;font-size:13px;line-height:2;">
          <li>Receipts must only be issued for valid transactions.</li>
          <li>Receipt numbers are system-generated and must not be altered.</li>
          <li>Sharing login credentials is strictly prohibited.</li>
          <li>All actions are logged and monitored.</li>
        </ul>
      </div>

      <!-- Fraud Warning -->
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:700;">
          Fraud Warning
        </p>
        <p style="margin:0;color:#78350f;font-size:13px;line-height:1.6;">
          Any form of receipt manipulation, duplication, or unauthorized cancellation
          will result in disciplinary action. The system maintains a permanent audit trail.
          Staff must acknowledge these rules on first login before using the system.
        </p>
      </div>
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

  try {
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
          to: staffEmail,
          subject: 'Welcome to HOSTech Coworking Space - Your Account Details',
          html: htmlEmail,
        }),
      })

      if (!emailResponse.ok) {
        const errBody = await emailResponse.text()
        console.error('Resend onboarding error:', errBody)
      }
    } else {
      console.info(`Onboarding email for ${staffEmail} logged (RESEND_API_KEY not configured)`)
    }

    // Log in audit trail
    await supabase.from('audit_log').insert({
      action: 'Onboarding Email Sent',
      performed_by: admin.id,
      performed_by_name: admin.full_name,
      performed_by_role: admin.role,
      reason: `Onboarding email sent to ${staffName} (${staffEmail})`,
    })

    return NextResponse.json({
      success: true,
      message: process.env.RESEND_API_KEY
        ? 'Onboarding email sent'
        : 'Onboarding email logged (configure RESEND_API_KEY for delivery)',
    })
  } catch (err) {
    console.error('Onboarding email error:', err)
    return NextResponse.json({ error: 'Failed to send onboarding email' }, { status: 500 })
  }
}
