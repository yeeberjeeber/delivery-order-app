import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import UserMenu from "@/components/UserMenu"

function todayStartSGT(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const dateStr = sgt.toISOString().split("T")[0]
  return new Date(`${dateStr}T00:00:00+08:00`).toISOString()
}

const STATUS_STYLE = {
  pending:  { bg: "#fef9c3", text: "#a16207", label: "Pending" },
  verified: { bg: "#dcfce7", text: "#15803d", label: "Verified" },
  flagged:  { bg: "#fee2e2", text: "#b91c1c", label: "Flagged" },
} as const

export default async function SupervisorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const todayStart = todayStartSGT()

  const [
    profileRes,
    pendingCountRes,
    verifiedTodayRes,
    flaggedCountRes,
    totalTodayRes,
    pendingQueueRes,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("delivery_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("delivery_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "verified")
      .gte("verified_at", todayStart),
    supabase
      .from("delivery_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "flagged"),
    supabase
      .from("delivery_orders")
      .select("*", { count: "exact", head: true })
      .gte("submitted_at", todayStart),
    supabase
      .from("delivery_orders")
      .select(`
        id, do_number, status, material_type, quantity, submitted_at,
        driver:profiles!delivery_orders_driver_id_fkey(full_name),
        supplier:suppliers(name),
        vehicle:vehicles(plate_number)
      `)
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })
      .limit(10),
  ])

  const firstName = profileRes.data?.full_name?.split(" ")[0] ?? "Supervisor"
  const pending   = pendingCountRes.count ?? 0
  const verified  = verifiedTodayRes.count ?? 0
  const flagged   = flaggedCountRes.count ?? 0
  const total     = totalTodayRes.count ?? 0
  const queue     = pendingQueueRes.data ?? []

  const hour = new Date().getUTCHours() + 8
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-8" style={{ backgroundColor: "#1a3a5c" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm mb-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{greeting}</p>
            <h1 className="text-2xl font-bold text-white">{firstName}</h1>
            <p className="text-xs mt-1 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
              Supervisor Dashboard
            </p>
          </div>
          <UserMenu
            name={firstName}
            profileHref="/supervisor/profile"
            signOutHref="/api/auth/sign-out?next=/login"
          />
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────────── */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <KpiCell label="Review"   value={pending}  color="#f59e0b" />
          <KpiCell label="Ver. Today" value={verified} color="#22c55e" />
          <KpiCell label="Flagged"  value={flagged}  color="#ef4444" />
          <KpiCell label="Today"    value={total}    />
        </div>
      </div>

      {/* ── Needs Review ───────────────────────────────────────────────── */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Needs Review ({pending})
          </p>
          <Link href="/supervisor/orders?status=pending"
            className="text-xs font-semibold" style={{ color: "#1a3a5c" }}>
            View all →
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-300">
            <svg className="size-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className="text-sm text-gray-400 font-medium">All caught up</p>
            <p className="text-xs text-gray-400 mt-1">No pending orders to review</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {queue.map((order) => {
              const driver   = Array.isArray(order.driver)   ? order.driver[0]   : order.driver
              const supplier = Array.isArray(order.supplier) ? order.supplier[0] : order.supplier
              const vehicle  = Array.isArray(order.vehicle)  ? order.vehicle[0]  : order.vehicle
              const time = new Date(order.submitted_at).toLocaleTimeString("en-SG", {
                hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore",
              })

              return (
                <Link key={order.id} href={`/supervisor/orders/${order.id}`}>
                  <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm active:scale-[0.99] transition-transform">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">D.O. #{order.do_number}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {supplier?.name ?? "—"} · {order.material_type} · {order.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: STATUS_STYLE.pending.bg, color: STATUS_STYLE.pending.text }}>
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {driver?.full_name ?? "—"} · {vehicle?.plate_number ?? "—"}
                      </span>
                      <span className="text-xs text-gray-400">{time}</span>
                    </div>
                  </div>
                </Link>
              )
            })}

            {pending > 10 && (
              <Link href="/supervisor/orders?status=pending"
                className="flex items-center justify-center py-3 text-sm font-semibold rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-gray-300">
                +{pending - 10} more pending orders
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Quick links ────────────────────────────────────────────────── */}
      <div className="px-4 mt-6 mb-4 grid grid-cols-2 gap-3">
        <Link href="/supervisor/orders"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm">
          <div className="size-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#eff6ff" }}>
            <svg className="size-5" style={{ color: "#1a3a5c" }} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">All Orders</p>
            <p className="text-xs text-gray-400">{total} today</p>
          </div>
        </Link>

        <Link href="/supervisor/orders?status=flagged"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm">
          <div className="size-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#fef2f2" }}>
            <svg className="size-5" style={{ color: "#dc2626" }} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Flagged</p>
            <p className="text-xs text-gray-400">{flagged} total</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

function KpiCell({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 border-r border-gray-100 last:border-r-0">
      <span className="text-2xl font-bold" style={{ color: color ?? "#1a3a5c" }}>{value}</span>
      <span className="text-[10px] text-gray-400 mt-0.5 text-center leading-tight">{label}</span>
    </div>
  )
}
