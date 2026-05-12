import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import InvoiceMatchActions from "./InvoiceMatchActions"

type PageProps = { params: Promise<{ id: string }> }

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: "#f3f4f6", text: "#6b7280", label: "Pending" },
  approved:    { bg: "#dbeafe", text: "#1d4ed8", label: "Approved" },
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: invoice } = await supabase
    .from("supplier_invoices")
    .select("id, invoice_number, invoice_date, invoice_month, total_amount, status, pdf_url, supplier:suppliers(id, name), uploader:profiles!supplier_invoices_uploaded_by_fkey(full_name), invoice_line_items(id, do_number, quantity, unit_price, amount, match_status, matched_do_id, discrepancy_notes)")
    .eq("id", id)
    .single()

  if (!invoice) notFound()

  const supplier  = Array.isArray(invoice.supplier)  ? invoice.supplier[0]  : invoice.supplier
  const uploader  = Array.isArray(invoice.uploader)  ? invoice.uploader[0]  : invoice.uploader
  const lineItems = (invoice.invoice_line_items ?? []) as Array<{
    id: string; do_number: string; quantity: number | null; unit_price: number | null
    amount: number | null; match_status: string; matched_do_id: string | null; discrepancy_notes: string | null
  }>

  const matched     = lineItems.filter(i => i.match_status === "matched").length
  const discrepancy = lineItems.filter(i => i.match_status === "discrepancy").length
  const unmatched   = lineItems.filter(i => i.match_status === "unmatched").length
  const badge       = STATUS_STYLE[invoice.status] ?? STATUS_STYLE.pending

  const fmtSGD = (v: number) =>
    v.toLocaleString("en-SG", { style: "currency", currency: "SGD" })

  const exportUrl = `/api/finance/export?invoice_id=${id}`

  return (
    <div className="flex flex-col pb-6">
      {/* Header */}
      <div className="px-5 pt-14 pb-5" style={{ backgroundColor: "#1a3a5c" }}>
        <div className="flex items-center gap-3">
          <Link href="/finance/reconciliation"
            className="size-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
            <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">
              {invoice.invoice_number ?? "Invoice"}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              {supplier?.name ?? "—"}
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: badge.bg, color: badge.text }}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="px-4 -mt-3">
        <div className="grid grid-cols-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <StatCell label="Lines"       value={lineItems.length} />
          <StatCell label="Matched"     value={matched}     color="#22c55e" />
          <StatCell label="Discrepancy" value={discrepancy} color="#f59e0b" />
          <StatCell label="Unmatched"   value={unmatched}   color="#ef4444" />
        </div>
      </div>

      {/* Invoice details card */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoice Details</p>
        </div>
        <div className="divide-y divide-gray-50">
          <Row label="Supplier"       value={supplier?.name ?? "—"} />
          {invoice.invoice_number && <Row label="Invoice #"   value={invoice.invoice_number} />}
          {invoice.invoice_date   && <Row label="Date"        value={new Date(invoice.invoice_date).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })} />}
          {invoice.total_amount != null && <Row label="Total Amount" value={fmtSGD(invoice.total_amount)} highlight />}
          <Row label="Uploaded by"    value={uploader?.full_name ?? "—"} />
        </div>
      </div>

      {/* PDF link */}
      {invoice.pdf_url && (
        <div className="mx-4 mt-3">
          <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 underline underline-offset-2">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            View Invoice Document
          </a>
        </div>
      )}

      {/* Export */}
      <div className="px-4 mt-4">
        <a href={exportUrl}
          className="flex items-center justify-center gap-2 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Reconciliation CSV
        </a>
      </div>

      {/* Line items + actions */}
      <div className="mt-4">
        <div className="px-4 mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Line Items</p>
        </div>
        <InvoiceMatchActions
          invoiceId={invoice.id}
          status={invoice.status}
          lineItems={lineItems}
        />
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-xs text-gray-400 shrink-0 w-24">{label}</span>
      <span className={`text-sm text-right flex-1 ${highlight ? "font-bold text-gray-900" : "text-gray-700"}`}>{value}</span>
    </div>
  )
}

function StatCell({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 border-r border-gray-100 last:border-r-0">
      <span className="text-xl font-bold" style={{ color: color ?? "#1a3a5c" }}>{value}</span>
      <span className="text-[10px] text-gray-400 mt-0.5 text-center leading-tight">{label}</span>
    </div>
  )
}