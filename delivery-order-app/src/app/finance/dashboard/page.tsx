import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import UserMenu from "@/components/UserMenu"

function monthStartSGT(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const y = sgt.getUTCFullYear()
  const m = String(sgt.getUTCMonth() + 1).padStart(2, "0")
  return new Date(`${y}-${m}-01T00:00:00+08:00`).toISOString()
}

const MATCH_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  matched:     { bg: "#dcfce7", text: "#15803d", label: "Matched" },
  discrepancy: { bg: "#fef9c3", text: "#a16207", label: "Discrepancy" },
  unmatched:   { bg: "#fee2e2", text: "#b91c1c", label: "Unmatched" },
  pending:     { bg: "#f3f4f6", text: "#6b7280", label: "Pending" },
}

export default async function FinanceDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const monthStart = monthStartSGT()

  const [profileRes, invoiceStatsRes, lineItemStatsRes, recentInvoicesRes, doAmountRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),

    supabase.from("supplier_invoices").select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),

    supabase.from("invoice_line_items").select("match_status"),

    supabase.from("supplier_invoices")
      .select("id, invoice_number, status, total_amount, created_at, supplier:suppliers(name), invoice_line_items(match_status)")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase.from("delivery_orders")
      .select("amount")
      .eq("status", "verified")
      .gte("submitted_at", monthStart),
  ])

  const firstName    = profileRes.data?.full_name?.split(" ")[0] ?? "Finance"
  const invoiceCount = invoiceStatsRes.count ?? 0
  const lineItems    = lineItemStatsRes.data ?? []
  const matched      = lineItems.filter(l => l.match_status === "matched").length
  const discrepancy  = lineItems.filter(l => l.match_status === "discrepancy").length
  const unmatched    = lineItems.filter(l => l.match_status === "unmatched").length
  const recentInvoices = recentInvoicesRes.data ?? []

  const verifiedAmount = (doAmountRes.data ?? []).reduce((s, o) => s + (o.amount ?? 0), 0)

  const hour = new Date().getUTCHours() + 8
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const fmtSGD = (v: number) =>
    v.toLocaleString("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 })

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="px-5 pt-14 pb-8" style={{ backgroundColor: "#1a3a5c" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm mb-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{greeting}</p>
            <h1 className="text-2xl font-bold text-white">{firstName}</h1>
            <p className="text-xs mt-1 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
              Finance Dashboard · {new Date().toLocaleDateString("en-SG", { month: "long", year: "numeric", timeZone: "Asia/Singapore" })}
            </p>
          </div>
          <UserMenu
            name={firstName}
            profileHref="/finance/profile"
            signOutHref="/api/auth/sign-out?next=/login"
          />
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <KpiCell label="Invoices"     value={String(invoiceCount)} />
          <KpiCell label="Matched"      value={String(matched)}     color="#22c55e" />
          <KpiCell label="Discrepancy"  value={String(discrepancy)} color="#f59e0b" />
          <KpiCell label="Unmatched"    value={String(unmatched)}   color="#ef4444" />
        </div>
      </div>

      {/* Verified DO amount */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Verified DO Value This Month</p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#1a3a5c" }}>{fmtSGD(verifiedAmount)}</p>
          </div>
          <div className="size-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
            <svg className="size-6" style={{ color: "#1a3a5c" }} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <Link href="/finance/reconciliation"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm">
          <div className="size-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
            <svg className="size-5" style={{ color: "#1a3a5c" }} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Invoices</p>
            <p className="text-xs text-gray-400">Reconcile DOs</p>
          </div>
        </Link>
        <Link href="/finance/export"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm">
          <div className="size-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#f0fdf4" }}>
            <svg className="size-5" style={{ color: "#16a34a" }} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Export</p>
            <p className="text-xs text-gray-400">CSV / Excel</p>
          </div>
        </Link>
      </div>

      {/* Recent invoices */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Invoices</p>
          <Link href="/finance/reconciliation" className="text-xs font-semibold" style={{ color: "#1a3a5c" }}>
            View all →
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-300">
            <svg className="size-10 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-sm text-gray-400">No invoices uploaded yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recentInvoices.map((inv) => {
              const supplier = Array.isArray(inv.supplier) ? inv.supplier[0] : inv.supplier
              const items    = (inv.invoice_line_items ?? []) as Array<{ match_status: string }>
              const hasDisc  = items.some(i => i.match_status === "discrepancy")
              const hasUnm   = items.some(i => i.match_status === "unmatched")
              const badge    = hasUnm ? MATCH_STYLE.unmatched : hasDisc ? MATCH_STYLE.discrepancy : items.length > 0 ? MATCH_STYLE.matched : MATCH_STYLE.pending

              return (
                <Link key={inv.id} href={`/finance/reconciliation/${inv.id}`}>
                  <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {inv.invoice_number ?? "No invoice #"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{supplier?.name ?? "—"}</p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: badge.bg, color: badge.text }}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{items.length} line item{items.length !== 1 ? "s" : ""}</span>
                      <span className="text-sm font-semibold" style={{ color: "#1a3a5c" }}>
                        {inv.total_amount != null ? fmtSGD(inv.total_amount) : "—"}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 border-r border-gray-100 last:border-r-0">
      <span className="text-2xl font-bold" style={{ color: color ?? "#1a3a5c" }}>{value}</span>
      <span className="text-[10px] text-gray-400 mt-0.5 text-center leading-tight">{label}</span>
    </div>
  )
}