import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["finance", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { supplier_id, invoice_number, invoice_date, total_amount, pdf_url, line_items = [] } = await request.json()
  if (!supplier_id) return NextResponse.json({ error: "supplier_id required" }, { status: 400 })

  const invoiceMonth = invoice_date ? invoice_date.slice(0, 7) : null

  const { data: invoice, error: invErr } = await supabase
    .from("supplier_invoices")
    .insert({
      supplier_id,
      invoice_number: invoice_number ?? null,
      invoice_date: invoice_date ?? null,
      invoice_month: invoiceMonth,
      total_amount: total_amount ?? null,
      pdf_url: pdf_url ?? null,
      uploaded_by: user.id,
      status: "pending",
    })
    .select("id")
    .single()

  if (invErr || !invoice) {
    console.error("[invoices POST]", invErr)
    return NextResponse.json({ error: invErr?.message ?? "Insert failed" }, { status: 500 })
  }

  // Insert line items
  if (line_items.length > 0) {
    const rows = line_items
      .filter((l: { do_number?: string }) => l.do_number)
      .map((l: { do_number: string; quantity?: number; unit_price?: number; amount?: number }) => ({
        invoice_id: invoice.id,
        do_number: l.do_number,
        quantity: l.quantity ?? null,
        unit_price: l.unit_price ?? null,
        amount: l.amount ?? null,
        match_status: "pending",
      }))

    if (rows.length > 0) {
      await supabase.from("invoice_line_items").insert(rows)
    }
  }

  // Auto-match immediately after creation
  await autoMatchInvoice(supabase, invoice.id)

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "upload_invoice",
    entity_type: "supplier_invoice",
    entity_id: invoice.id,
    metadata: { supplier_id, invoice_number },
  })

  return NextResponse.json({ id: invoice.id }, { status: 201 })
}

// Shared auto-match logic
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function autoMatchInvoice(supabase: any, invoiceId: string) {
  const { data: items } = await supabase
    .from("invoice_line_items")
    .select("id, do_number, quantity")
    .eq("invoice_id", invoiceId)

  if (!items?.length) return

  for (const item of items) {
    const { data: dos } = await supabase
      .from("delivery_orders")
      .select("id, quantity")
      .eq("do_number", item.do_number)
      .limit(1)

    const doRecord = dos?.[0]
    if (!doRecord) {
      await supabase.from("invoice_line_items").update({ match_status: "unmatched" }).eq("id", item.id)
      continue
    }

    const qtyDiff = item.quantity != null && doRecord.quantity != null
      ? Math.abs(item.quantity - doRecord.quantity) / doRecord.quantity
      : 0

    const matchStatus = qtyDiff > 0.05 ? "discrepancy" : "matched"
    const notes = matchStatus === "discrepancy"
      ? `Quantity mismatch: invoice ${item.quantity}, D.O. ${doRecord.quantity}`
      : null

    await supabase.from("invoice_line_items").update({
      match_status: matchStatus,
      matched_do_id: doRecord.id,
      discrepancy_notes: notes,
    }).eq("id", item.id)
  }
}