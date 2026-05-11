import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import OrderFilters from "./OrderFilters"

function todayStartSGT(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const dateStr = sgt.toISOString().split("T")[0]
  return new Date(`${dateStr}T00:00:00+08:00`).toISOString()
}

function weekStartSGT(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const day = sgt.getUTCDay()
  const monday = new Date(sgt)
  monday.setUTCDate(sgt.getUTCDate() - ((day + 6) % 7))
  const dateStr = monday.toISOString().split("T")[0]
  return new Date(`${dateStr}T00:00:00+08:00`).toISOString()
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#a16207", label: "Pending" },
  verified: { bg: "#dcfce7", text: "#15803d", label: "Verified" },
  flagged:  { bg: "#fee2e2", text: "#b91c1c", label: "Flagged" },
}

type SearchParams = Promise<{ status?: string; date?: string }>

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { status = "all", date = "today" } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let query = supabase
    .from("delivery_orders")
    .select(`
      id, do_number, status, material_type, quantity, amount, submitted_at, verified_at,
      driver:profiles!delivery_orders_driver_id_fkey(full_name),
      supplier:suppliers(name),
      vehicle:vehicles(plate_number),
      delivery_order_flags(id, reason)
    `)
    .order("submitted_at", { ascending: false })
    .limit(100)

  if (status !== "all") {
    query = query.eq("status", status)
  }

  if (date === "today") {
    query = query.gte("submitted_at", todayStartSGT())
  } else if (date === "week") {
    query = query.gte("submitted_at", weekStartSGT())
  }

  const { data: orders = [] } = await query

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-5" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-xl font-bold text-white">Delivery Orders</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          {orders?.length ?? 0} result{(orders?.length ?? 0) !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <OrderFilters />

      {/* ── List ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 px-4 py-4">
        {!orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <svg className="size-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p className="text-sm text-gray-400 font-medium">No orders found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting the filters above</p>
          </div>
        ) : (
          orders.map((order) => {
            const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
            const driver   = Array.isArray(order.driver)   ? order.driver[0]   : order.driver
            const supplier = Array.isArray(order.supplier) ? order.supplier[0] : order.supplier
            const vehicle  = Array.isArray(order.vehicle)  ? order.vehicle[0]  : order.vehicle
            const flags    = order.delivery_order_flags ?? []
            const time = new Date(order.submitted_at).toLocaleTimeString("en-SG", {
              hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore",
            })
            const dateLabel = new Date(order.submitted_at).toLocaleDateString("en-SG", {
              day: "2-digit", month: "short", timeZone: "Asia/Singapore",
            })

            return (
              <Link key={order.id} href={`/supervisor/orders/${order.id}`}>
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm active:scale-[0.99] transition-transform">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        D.O. #{order.do_number}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {supplier?.name ?? "—"} · {order.material_type} · {order.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: s.bg, color: s.text }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {driver?.full_name ?? "—"} · {vehicle?.plate_number ?? "—"}
                    </span>
                    <span className="text-xs text-gray-400">{dateLabel} {time}</span>
                  </div>
                  {flags.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <svg className="size-3.5 shrink-0" style={{ color: "#dc2626" }} viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span className="text-xs font-medium" style={{ color: "#dc2626" }}>
                        {Array.isArray(flags[0]) ? flags[0][0]?.reason?.replace(/_/g, " ") : (flags[0] as {reason: string})?.reason?.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
