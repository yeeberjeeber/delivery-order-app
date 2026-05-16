"use client"

import { useState, useMemo } from "react"

type Order = {
  id: string
  do_number: string
  status: string
  material_type: string
  quantity: number | null
  submitted_at: string
  suppliers: { name: string } | { name: string }[] | null
  vehicles:  { plate_number: string } | { plate_number: string }[] | null
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#a16207", label: "Pending" },
  verified: { bg: "#dcfce7", text: "#15803d", label: "Verified" },
  flagged:  { bg: "#fee2e2", text: "#b91c1c", label: "Flagged" },
}

function sgtDateLabel(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString("en-SG", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    timeZone: "Asia/Singapore",
  })
}

function sgtMonthKey(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString("en-SG", { year: "numeric", month: "long", timeZone: "Asia/Singapore" })
}

function sgtDateKey(isoString: string): string {
  const d = new Date(isoString)
  // YYYY-MM-DD in SGT — used for grouping
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }) // en-CA gives YYYY-MM-DD
}

export default function HistoryClient({ orders }: { orders: Order[] }) {
  // Derive available months from data
  const months = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const o of orders) {
      const m = sgtMonthKey(o.submitted_at)
      if (!seen.has(m)) { seen.add(m); list.push(m) }
    }
    return list // already sorted newest-first since orders are ordered desc
  }, [orders])

  const [selectedMonth, setSelectedMonth] = useState<string>(months[0] ?? "")

  // Filter + group by date
  const grouped = useMemo(() => {
    const filtered = orders.filter(o => sgtMonthKey(o.submitted_at) === selectedMonth)
    const map = new Map<string, { label: string; orders: Order[] }>()
    for (const o of filtered) {
      const key = sgtDateKey(o.submitted_at)
      if (!map.has(key)) map.set(key, { label: sgtDateLabel(o.submitted_at), orders: [] })
      map.get(key)!.orders.push(o)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [orders, selectedMonth])

  const totalForMonth = grouped.reduce((s, [, g]) => s + g.orders.length, 0)

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="px-5 pt-14 pb-5" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-xl font-bold text-white">Submission History</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          {totalForMonth} order{totalForMonth !== 1 ? "s" : ""} in {selectedMonth || "—"}
        </p>
      </div>

      {/* Month selector */}
      {months.length > 0 && (
        <div className="px-4 pt-4 pb-2 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {months.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={selectedMonth === m
                  ? { backgroundColor: "#1a3a5c", color: "#fff" }
                  : { backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb" }
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-3 pb-8 flex flex-col gap-5">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <svg className="size-14 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <p className="text-sm text-gray-400 font-medium">No submissions yet</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <p className="text-sm text-gray-400">No orders in {selectedMonth}</p>
          </div>
        ) : (
          grouped.map(([, group]) => (
            <div key={group.label}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {group.label}
                </p>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 shrink-0">{group.orders.length} order{group.orders.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Orders */}
              <div className="flex flex-col gap-2">
                {group.orders.map(order => {
                  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
                  const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers
                  const vehicle  = Array.isArray(order.vehicles)  ? order.vehicles[0]  : order.vehicles
                  const time = new Date(order.submitted_at).toLocaleTimeString("en-SG", {
                    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore",
                  })

                  return (
                    <div key={order.id}
                      className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">D.O. #{order.do_number}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {supplier?.name ?? "—"} · {order.material_type} · {order.quantity ?? "—"}
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
            </div>
          ))
        )}
      </div>
    </div>
  )
}