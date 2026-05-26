import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import UploadInvoiceModal from "./UploadInvoiceModal"
import ReconciliationFilters from "./ReconciliationFilters"

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: "#f3f4f6", text: "#6b7280", label: "Pending" },
  matched:     { bg: "#dcfce7", text: "#15803d", label: "Matched" },
  discrepancy: { bg: "#fef9c3", text: "#a16207", label: "Discrepancy" },
  unmatched:   { bg: "#fee2e2", text: "#b91c1c", label: "Unmatched" },
  approved:    { bg: "#dbeafe", text: "#1d4ed8", label: "Approved" },
}

type SearchParams = Promise<{ supplier?: string; status?: string }>

export default async function ReconciliationPage({ searchParams }: { searchParams: SearchParams }) {
  const { supplier = "", status = "all" } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [suppliersRes, invoicesRes] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("supplier_invoices")
      .select("id, invoice_number, invoice_date, total_amount, status, created_at, supplier:suppliers(id, name), invoice_line_items(id, match_status)")
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  const suppliers = suppliersRes.data ?? []
  let invoices = invoicesRes.data ?? []

  if (supplier) invoices = invoices.filter(inv => {
    const s = Array.isArray(inv.supplier) ? inv.supplier[0] : inv.supplier
    return s?.id === supplier
  })

  // Derive effective match status from line items
  function effectiveStatus(inv: typeof invoices[0]) {
    if (inv.status === "approved") return "approved"
    const items = (inv.invoice_line_items ?? []) as Array<{ match_status: string }>
    if (items.length === 0) return "pending"
    if (items.some(i => i.match_status === "unmatched"))   return "unmatched"
    if (items.some(i => i.match_status === "discrepancy")) return "discrepancy"
    if (items.every(i => i.match_status === "matched"))    return "matched"
    return "pending"
  }

  if (status !== "all") invoices = invoices.filter(inv => effectiveStatus(inv) === status)

  const fmtSGD = (v: number) =>
    v.toLocaleString("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 })

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-5 pt-14 pb-5" style={{ backgroundColor: "#1a3a5c" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Invoice Reconciliation</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
          <UploadInvoiceModal suppliers={suppliers} />
        </div>
      </div>

      <ReconciliationFilters status={status} supplier={supplier} suppliers={suppliers} />

      {/* Invoice list */}
      <div className="flex flex-col gap-2.5 px-4 py-4">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <svg className="size-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm text-gray-400 font-medium">No invoices found</p>
          </div>
        ) : (
          invoices.map((inv) => {
            const s       = Array.isArray(inv.supplier) ? inv.supplier[0] : inv.supplier
            const items   = (inv.invoice_line_items ?? []) as Array<{ id: string; match_status: string }>
            const effStat = effectiveStatus(inv)
            const badge   = STATUS_STYLE[effStat] ?? STATUS_STYLE.pending
            const matched = items.filter(i => i.match_status === "matched").length
            const dateStr = inv.invoice_date
              ? new Date(inv.invoice_date).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })
              : "No date"

            return (
              <Link key={inv.id} href={`/finance/reconciliation/${inv.id}`}>
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm active:scale-[0.99] transition-transform">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {inv.invoice_number ?? "No invoice #"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{s?.name ?? "—"} · {dateStr}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: badge.bg, color: badge.text }}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {matched}/{items.length} lines matched
                    </span>
                    <span className="text-sm font-bold" style={{ color: "#1a3a5c" }}>
                      {inv.total_amount != null ? fmtSGD(inv.total_amount) : "—"}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}