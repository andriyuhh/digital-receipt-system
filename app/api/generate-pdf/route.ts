import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifySignature } from '@/lib/qr-signature'

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const receiptId = url.searchParams.get('receiptId')
  const receiptNumber = url.searchParams.get('number')
  const sig = url.searchParams.get('sig')
  const t = url.searchParams.get('t')

  let receipt: Record<string, unknown> | null = null
  let staffName: string | null = null

  // Auth path 1: Signed URL (public access from WhatsApp/QR)
  if (receiptNumber && sig && t) {
    const isValid = verifySignature(receiptNumber, decodeURIComponent(t), sig)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
    const serviceClient = getServiceSupabase()
    const { data } = await serviceClient
      .from('receipts')
      .select('*')
      .eq('receipt_number', receiptNumber)
      .single()
    receipt = data
    staffName = null // No staff for public access
  }
  // Auth path 2: Authenticated staff access (from dashboard)
  else if (receiptId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
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
    staffName = staff.full_name

    const { data } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single()
    receipt = data

    // Log audit
    if (receipt) {
      await supabase.from('audit_log').insert({
        receipt_id: receipt.id as string,
        action: 'PDF Generated',
        old_status: receipt.status as string,
        new_status: receipt.status as string,
        performed_by: staff.id,
        performed_by_name: staff.full_name,
        performed_by_role: staff.role,
        reason: `PDF receipt generated for ${receipt.receipt_number}`,
      })
    }
  } else {
    return NextResponse.json({ error: 'Receipt ID or signed number required' }, { status: 400 })
  }

  if (!receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  const origin = url.origin
  const rcptSig = (receipt.qr_signature as string) || ''
  const rcptT = encodeURIComponent(receipt.issued_at as string)
  const verifyUrl = rcptSig
    ? `${origin}/verify/${receipt.receipt_number}?sig=${rcptSig}&t=${rcptT}`
    : `${origin}/verify/${receipt.receipt_number}`

  const formatAmount = (amount: number) =>
    `SLE ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`

  const discountBlock = receipt.discount_code && Number(receipt.discount_amount) > 0
    ? `<tr>
        <td style="padding:6px 12px;color:#71717a;font-size:11px;">Original Amount</td>
        <td style="padding:6px 12px;text-align:right;font-size:11px;color:#18181b;">${formatAmount(Number(receipt.original_amount) || (receipt.amount as number))}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;color:#16a34a;font-size:11px;">Discount (${receipt.discount_code})</td>
        <td style="padding:6px 12px;text-align:right;font-size:11px;color:#16a34a;font-weight:600;">-${formatAmount(Number(receipt.discount_amount))}</td>
      </tr>`
    : ''

  let serviceBlock = ''
  if (receipt.service_details && typeof receipt.service_details === 'object') {
    const details = receipt.service_details as { line_items?: Array<{ description: string; subtotal: number }> }
    if (details.line_items && details.line_items.length > 1) {
      serviceBlock = details.line_items.map((item) =>
        `<tr>
          <td style="padding:4px 12px;color:#71717a;font-size:10px;">${item.description}</td>
          <td style="padding:4px 12px;text-align:right;font-size:10px;color:#18181b;">${formatAmount(item.subtotal)}</td>
        </tr>`
      ).join('')
      serviceBlock = `<tr><td colspan="2" style="padding:8px 12px 4px;font-size:10px;font-weight:600;color:#3f3f46;text-transform:uppercase;letter-spacing:0.5px;">Service Breakdown</td></tr>${serviceBlock}<tr><td colspan="2"><hr style="border:none;border-top:1px dashed #e4e4e7;margin:4px 0;"/></td></tr>`
    }
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${receipt.receipt_number} - HOSTech Receipt</title>
  <style>
    @page { size: A5 portrait; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      width: 148mm; min-height: 210mm; margin: 0 auto; padding: 0;
      background: #fff; color: #18181b; position: relative;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .watermark {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 48px; color: rgba(26, 127, 193, 0.06);
      font-weight: 900; pointer-events: none; z-index: 0;
      white-space: nowrap; letter-spacing: 6px; text-transform: uppercase;
    }
    .content { position: relative; z-index: 1; padding: 24px; }
    .header { text-align: center; padding: 20px 0 16px; border-bottom: 2px solid #1a7fc1; margin-bottom: 16px; }
    .biz-name { font-size: 22px; font-weight: 800; color: #1a7fc1; letter-spacing: 1px; }
    .biz-tagline { font-size: 11px; color: #71717a; margin-top: 2px; }
    .biz-location { font-size: 10px; color: #a1a1aa; margin-top: 2px; }
    .rcpt-num { text-align: center; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px; color: #18181b; margin: 12px 0 4px; }
    .badge { display: inline-block; padding: 3px 14px; border-radius: 999px; font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; background: #dbeafe; color: #1d4ed8; }
    .detail-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .detail-table td { padding: 7px 12px; font-size: 11px; border-bottom: 1px solid #f4f4f5; }
    .detail-table .lbl { color: #71717a; }
    .detail-table .val { text-align: right; font-weight: 500; color: #18181b; }
    .amount-box { text-align: center; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 16px; margin: 12px 0; }
    .amount-label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #71717a; }
    .amount-value { font-size: 28px; font-weight: 800; color: #1a7fc1; margin: 4px 0; }
    .payment-method { font-size: 10px; color: #a1a1aa; }
    .qr-section { text-align: center; margin: 16px 0 8px; }
    .qr-hint { font-size: 9px; color: #a1a1aa; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
    .qr-url { font-size: 7px; color: #a1a1aa; word-break: break-all; margin-top: 4px; }
    .footer { text-align: center; border-top: 1px solid #e4e4e7; padding-top: 12px; margin-top: 12px; }
    .footer p { font-size: 9px; color: #a1a1aa; margin: 2px 0; }
    .thank-you { font-size: 12px; font-weight: 700; color: #18181b; letter-spacing: 1px; margin-bottom: 4px; }
    .no-print-btn { position: fixed; bottom: 20px; right: 20px; z-index: 100; }
    .no-print-btn button { background: #1a7fc1; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .no-print-btn button:hover { background: #1565a0; }
    @media print { .no-print-btn { display: none !important; } }
  </style>
</head>
<body>
  <div class="watermark">Official Receipt</div>
  <div class="content">
    <div class="header">
      <div class="biz-name">HOSTech</div>
      <div class="biz-tagline">Coworking Space</div>
      <div class="biz-location">Freetown, Sierra Leone</div>
    </div>

    <div class="rcpt-num">${receipt.receipt_number}</div>
    <div style="text-align:center;margin:6px 0 12px;">
      <span class="badge">${receipt.status}</span>
    </div>

    <table class="detail-table">
      <tr><td class="lbl">Client</td><td class="val">${receipt.customer_name}</td></tr>
      ${receipt.customer_id ? `<tr><td class="lbl">Member ID</td><td class="val">${receipt.customer_id}</td></tr>` : ''}
      <tr><td class="lbl">Service</td><td class="val">${receipt.service_description}</td></tr>
      <tr><td class="lbl">Date</td><td class="val">${formatDate(receipt.issued_at as string)}</td></tr>
      <tr><td class="lbl">Time</td><td class="val">${formatTime(receipt.issued_at as string)}</td></tr>
      <tr><td class="lbl">Payment</td><td class="val">${receipt.payment_method}</td></tr>
      <tr><td class="lbl">Issued By</td><td class="val">${receipt.issuer_name}</td></tr>
    </table>

    ${serviceBlock ? `<table class="detail-table">${serviceBlock}</table>` : ''}

    <div class="amount-box">
      ${discountBlock ? `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">${discountBlock}</table>` : ''}
      <div class="amount-label">Total Amount</div>
      <div class="amount-value">${formatAmount(receipt.amount as number)}</div>
      <div class="payment-method">${receipt.payment_method}</div>
    </div>

    <div class="qr-section">
      <div class="qr-hint">Scan to Verify Receipt</div>
      <img src="${qrUrl}" width="120" height="120" alt="QR Code" style="display:inline-block;" crossorigin="anonymous" />
      <div class="qr-url">${verifyUrl}</div>
    </div>

    <div class="footer">
      <p class="thank-you">Thank You!</p>
      <p>HOSTech Coworking Space</p>
      <p>Computer-generated receipt &bull; No signature required</p>
    </div>
  </div>

  <div class="no-print-btn">
    <button onclick="window.print()">Save as PDF / Print</button>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
