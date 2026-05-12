import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return ""
  const s = String(v)
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\r\n")
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["finance", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const invoiceId  = searchParams.get("invoice_id")
  const month      = searchParams.get("month")
  const supplierId = searchParams.get("supplier_id")
  const status     = searchParams.get("status")

  // Per-invoice reconciliation export
  if (invoiceId) {
    const { data: invoice } = await supabase
      .from("supplier_invoices")
      .select("invoice_number, invoice_date, supplier:suppliers(name), invoice_line_items(do_number, quantity, unit_price, amount, match_status, discrepancy_notes)")
      .eq("id", invoiceId)
      .single()

    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const supplier = Array.isArray(invoice.supplier) ? invoice.supplier[0] : invoice.supplier
    const items = (invoice.invoice_line_items ?? []) as Array<{
      do_number: string; quantity: number | null; unit_price: number | null
      amount: number | null; match_status: string; discrepancy_notes: string | null
    }>

    const headers = ["Invoice #", "Invoice Date", "Supplier", "D.O. Number", "Qty", "Unit Price (SGD)", "Amount (SGD)", "Match Status", "Notes"]
    const rows = items.map(i => [
      invoice.invoice_number ?? "",
      invoice.invoice_date ?? "",
      supplier?.name ?? "",
      i.do_number,
      i.quantity != null ? String(i.quantity) : "",
      i.unit_price != null ? i.unit_price.toFixed(2) : "",
      i.amount != null ? i.amount.toFixed(2) : "",
      i.match_status,
      i.discrepancy_notes ?? "",
    ])

    const csv = toCsv(headers, rows)
    const filename = `reconciliation-${invoice.invoice_number ?? invoiceId}.csv`
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  // General D.O. export with month/supplier/status filters
  if (!month) return NextResponse.json({ error: "month or invoice_id required" }, { status: 400 })

  const [y, m] = month.split("-").map(Number)
  const monthStart = new Date(`${month}-01T00:00:00+08:00`).toISOString()
  const nextMonth  = m === 12
    ? new Date(`${y + 1}-01-01T00:00:00+08:00`).toISOString()
    : new Date(`${y}-${String(m + 1).padStart(2, "0")}-01T00:00:00+08:00`).toISOString()

  let query = supabase
    .from("delivery_orders")
    .select("do_number, submitted_at, status, supplier:suppliers(name), driver:profiles!delivery_orders_driver_id_fkey(full_name), project_name, material_type, quantity, unit, vehicle_plate, verified_at, verifier:profiles!delivery_orders_verified_by_fkey(full_name)")
    .gte("submitted_at", monthStart)
    .lt("submitted_at", nextMonth)
    .order("submitted_at", { ascending: false })

  if (supplierId) query = query.eq("supplier_id", supplierId)
  if (status && status !== "all") query = query.eq("status", status)

  const { data: orders, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = ["D.O. Number", "Date", "Status", "Supplier", "Driver", "Project", "Material", "Qty", "Unit", "Vehicle", "Verified At", "Verified By"]
  const rows = (orders ?? []).map((o) => {
    const supplier = Array.isArray(o.supplier) ? o.supplier[0] : o.supplier
    const driver   = Array.isArray(o.driver)   ? o.driver[0]   : o.driver
    const verifier = Array.isArray(o.verifier) ? o.verifier[0] : o.verifier
    return [
      o.do_number ?? "",
      o.submitted_at ? new Date(o.submitted_at).toLocaleDateString("en-SG") : "",
      o.status ?? "",
      supplier?.name ?? "",
      driver?.full_name ?? "",
      o.project_name ?? "",
      o.material_type ?? "",
      o.quantity != null ? String(o.quantity) : "",
      o.unit ?? "",
      o.vehicle_plate ?? "",
      o.verified_at ? new Date(o.verified_at).toLocaleDateString("en-SG") : "",
      verifier?.full_name ?? "",
    ]
  })

  const csv = toCsv(headers, rows)
  const filename = `delivery-orders-${month}${supplierId ? `-${supplierId.slice(0, 8)}` : ""}.csv`
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}