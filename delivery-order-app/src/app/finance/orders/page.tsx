import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import OrderFilters from "./OrderFilters"

function currentMonthSGT(): string {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const y = sgt.getUTCFullYear()
  const m = String(sgt.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

const SGT = 8 * 60 * 60 * 1000

function dateRange(month: string, day: number): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number)
  if (day > 0) {
    const from = new Date(Date.UTC(y, m - 1, day,     0, 0, 0) - SGT).toISOString()
    const to   = new Date(Date.UTC(y, m - 1, day + 1, 0, 0, 0) - SGT).toISOString()
    return { from, to }
  }
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  return {
    from: new Date(Date.UTC(y,     m - 1,      1, 0, 0, 0) - SGT).toISOString(),
    to:   new Date(Date.UTC(nextY, nextM - 1,  1, 0, 0, 0) - SGT).toISOString(),
  }
}

type SearchParams = Promise<{ supplier?: string; month?: string; day?: string }>

export default async function FinanceOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { supplier = "", month: rawMonth, day: rawDay } = await searchParams
  const month = rawMonth ?? currentMonthSGT()
  const day   = Math.max(0, Math.min(31, Number(rawDay ?? 0) || 0))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const suppliersRes = await supabase
    .from("suppliers").select("id, name").eq("is_active", true).order("name")

  const { from, to } = dateRange(month, day)

  let query = supabase
    .from("delivery_orders")
    .select(`
      id, do_number, status, material_type, quantity, amount, submitted_at, verified_at,
      driver:profiles!delivery_orders_driver_id_fkey(full_name),
      supervisor:profiles!delivery_orders_supervisor_id_fkey(full_name),
      supplier:suppliers(id, name),
      vehicle:vehicles(plate_number)
    `)
    .eq("status", "verified")
    .gte("verified_at", from)
    .lt("verified_at", to)
    .order("verified_at", { ascending: false })
    .limit(500)

  if (supplier) query = query.eq("supplier_id", supplier)

  const { data: orders = [] } = await query

  const fmtSGD = (v: number) =>
    v.toLocaleString("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 })

  const suppliers = suppliersRes.data ?? []

  const totalAmount = (orders ?? []).reduce((sum, o) => sum + (o.amount ?? 0), 0)

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="px-5 pt-14 pb-5" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-xl font-bold text-white">Verified D.O.s</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          {orders?.length ?? 0} order{(orders?.length ?? 0) !== 1 ? "s" : ""}
          {totalAmount > 0 && ` · ${fmtSGD(totalAmount)} total`}
        </p>
      </div>

      <OrderFilters month={month} day={day} supplier={supplier} suppliers={suppliers} />

      {/* List */}
      <div className="flex flex-col gap-2.5 px-4 py-4">
        {!orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <svg className="size-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p className="text-sm text-gray-400 font-medium">No verified orders found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different month or supplier</p>
          </div>
        ) : (
          orders.map((order) => {
            const driver   = Array.isArray(order.driver)     ? order.driver[0]     : order.driver
            const supv     = Array.isArray(order.supervisor) ? order.supervisor[0] : order.supervisor
            const supplier = Array.isArray(order.supplier)   ? order.supplier[0]   : order.supplier
            const vehicle  = Array.isArray(order.vehicle)    ? order.vehicle[0]    : order.vehicle

            const verifiedAt = order.verified_at
              ? new Date(order.verified_at).toLocaleDateString("en-SG", {
                  day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Singapore",
                })
              : "—"

            return (
              <Link key={order.id} href={`/finance/orders/${order.id}`}>
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
                    {order.amount != null && (
                      <span className="shrink-0 text-sm font-bold" style={{ color: "#1a3a5c" }}>
                        {fmtSGD(order.amount)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 truncate">
                      {driver?.full_name ?? "—"} · {vehicle?.plate_number ?? "—"}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{verifiedAt}</span>
                  </div>
                  {supv?.full_name && (
                    <p className="text-xs mt-1.5" style={{ color: "#6b7280" }}>
                      Verified by {supv.full_name}
                    </p>
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