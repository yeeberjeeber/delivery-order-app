import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

// Today's start in SGT (UTC+8)
function todayStartSGT(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const dateStr = sgt.toISOString().split("T")[0]
  return new Date(`${dateStr}T00:00:00+08:00`).toISOString()
}

const STATUS = {
  pending:  { label: "Pending",  bg: "#fef9c3", text: "#a16207" },
  verified: { label: "Verified", bg: "#dcfce7", text: "#15803d" },
  flagged:  { label: "Flagged",  bg: "#fee2e2", text: "#b91c1c" },
}

export default async function DriverDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/driver/login")

  const [profileRes, ordersRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("delivery_orders")
      .select("id, do_number, status, material_type, quantity, submitted_at, suppliers(name), vehicles(plate_number)")
      .eq("driver_id", user.id)
      .gte("submitted_at", todayStartSGT())
      .order("submitted_at", { ascending: false }),
  ])

  const orders = ordersRes.data ?? []
  const firstName = profileRes.data?.full_name?.split(" ")[0] ?? "Driver"

  const stats = {
    total:    orders.length,
    pending:  orders.filter(o => o.status === "pending").length,
    verified: orders.filter(o => o.status === "verified").length,
    flagged:  orders.filter(o => o.status === "flagged").length,
  }

  const hour = new Date().getUTCHours() + 8 // SGT
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-8" style={{ backgroundColor: "#1a3a5c" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm mb-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{greeting}</p>
            <h1 className="text-2xl font-bold text-white">{firstName}</h1>
          </div>
          <form action="/api/auth/sign-out?next=/driver/login" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl mt-1"
              style={{ color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* ── Stats card ─────────────────────────────────────────────────── */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <StatCell label="Total"    value={stats.total} />
          <StatCell label="Pending"  value={stats.pending}  color="#f59e0b" />
          <StatCell label="Verified" value={stats.verified} color="#22c55e" />
          <StatCell label="Flagged"  value={stats.flagged}  color="#ef4444" />
        </div>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <div className="px-4 mt-5">
        <Link
          href="/driver/upload"
          className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl text-white font-semibold text-base active:scale-[0.98] transition-transform"
          style={{ backgroundColor: "#1a3a5c", boxShadow: "0 4px 14px rgba(26,58,92,0.3)" }}
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Capture Delivery Order
        </Link>
      </div>

      {/* ── Today's uploads ────────────────────────────────────────────── */}
      <div className="px-4 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Today&apos;s Uploads ({stats.total})
        </p>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <svg className="size-14 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1"/>
              <path d="M16 8h4l3 5v3h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <p className="text-sm text-gray-400 font-medium">No deliveries yet today</p>
            <p className="text-xs text-gray-400 mt-1">Tap the button above to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {orders.map((order) => {
              const s = STATUS[order.status as keyof typeof STATUS] ?? STATUS.pending
              const time = new Date(order.submitted_at).toLocaleTimeString("en-SG", {
                hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore",
              })
              const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers
              const vehicle  = Array.isArray(order.vehicles)  ? order.vehicles[0]  : order.vehicles

              return (
                <div key={order.id}
                  className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">D.O. #{order.do_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {supplier?.name ?? "—"} · {order.material_type} · {order.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: s.bg, color: s.text }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{vehicle?.plate_number ?? "—"}</span>
                    <span className="text-xs text-gray-400">{time}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCell({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 border-r border-gray-100 last:border-r-0">
      <span className="text-2xl font-bold" style={{ color: color ?? "#1a3a5c" }}>{value}</span>
      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
    </div>
  )
}
