import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

function monthStartSGT(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const y = sgt.getUTCFullYear()
  const m = String(sgt.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01T00:00:00+08:00`
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const monthStart = monthStartSGT()

  const [
    usersRes,
    activeDriversRes,
    dosRes,
    suppliersRes,
    pendingInvoicesRes,
    recentAuditRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "driver").eq("is_active", true),
    supabase.from("delivery_orders").select("id", { count: "exact", head: true }).gte("submitted_at", monthStart),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("supplier_invoices").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("audit_log").select("action, entity_type, created_at, user:profiles!audit_log_user_id_fkey(full_name)").order("created_at", { ascending: false }).limit(10),
  ])

  const totalUsers      = usersRes.count ?? 0
  const activeDrivers   = activeDriversRes.count ?? 0
  const dosThisMonth    = dosRes.count ?? 0
  const activeSuppliers = suppliersRes.count ?? 0
  const pendingInvoices = pendingInvoicesRes.count ?? 0
  const recentAudit     = recentAuditRes.data ?? []

  const kpis = [
    { label: "Active Users",     value: totalUsers,      color: "#1a3a5c" },
    { label: "Active Drivers",   value: activeDrivers,   color: "#0284c7" },
    { label: "D.O.s This Month", value: dosThisMonth,    color: "#7c3aed" },
    { label: "Active Suppliers", value: activeSuppliers, color: "#0891b2" },
  ]

  const quickLinks = [
    { href: "/admin/users",       label: "Manage Users",       desc: "Roles & activation" },
    { href: "/admin/master-data", label: "Master Data",        desc: "Suppliers, vehicles, projects" },
    { href: "/finance/reconciliation", label: "Finance View",  desc: "Invoice reconciliation" },
    { href: "/finance/export",    label: "Export D.O.s",       desc: "Download CSV reports" },
  ]

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-8" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-2xl font-bold text-white">Admin</h1>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>System management</p>
      </div>

      {/* KPI strip */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4">
              <p className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invoices alert */}
      {pendingInvoices > 0 && (
        <Link href="/finance/reconciliation"
          className="mx-4 mt-4 flex items-center gap-3 rounded-2xl px-4 py-3.5 border"
          style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
          <div className="size-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#fef3c7" }}>
            <svg className="size-4" style={{ color: "#d97706" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#92400e" }}>{pendingInvoices} invoice{pendingInvoices !== 1 ? "s" : ""} pending review</p>
            <p className="text-xs" style={{ color: "#a16207" }}>Tap to go to Finance Reconciliation</p>
          </div>
          <svg className="size-4 shrink-0" style={{ color: "#d97706" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      )}

      {/* Quick links */}
      <div className="px-4 mt-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
        {quickLinks.map(l => (
          <Link key={l.href} href={l.href}
            className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{l.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{l.desc}</p>
            </div>
            <svg className="size-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        ))}
      </div>

      {/* Audit log */}
      <div className="mx-4 mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Activity</p>
        </div>
        {recentAudit.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-400 text-center">No activity yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentAudit.map((log, i) => {
              const actor = Array.isArray(log.user) ? log.user[0] : log.user
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                    style={{ backgroundColor: "#1a3a5c" }}>
                    {actor?.full_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{actor?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-400 truncate">{log.action.replace(/_/g, " ")} · {log.entity_type}</p>
                  </div>
                  <p className="text-[11px] text-gray-400 shrink-0">
                    {new Date(log.created_at).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}