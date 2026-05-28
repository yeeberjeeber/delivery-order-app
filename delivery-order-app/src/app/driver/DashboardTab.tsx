"use client"

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

type Props = {
  firstName: string
  greeting: string
  stats: { total: number; pending: number; verified: number; flagged: number }
  orders: Order[]
  onGoToUpload: () => void
}

const STATUS = {
  pending:  { label: "Pending",  bg: "#fef9c3", text: "#a16207" },
  verified: { label: "Verified", bg: "#dcfce7", text: "#15803d" },
  flagged:  { label: "Flagged",  bg: "#fee2e2", text: "#b91c1c" },
}

export default function DashboardTab({ firstName, greeting, stats, orders, onGoToUpload }: Props) {
  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="px-5 pt-14 pb-8" style={{ backgroundColor: "#1a3a5c" }}>
        <p className="text-sm mb-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{greeting}</p>
        <h1 className="text-2xl font-bold text-white">{firstName}</h1>
      </div>

      {/* Stats card */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <StatCell label="Total"    value={stats.total} />
          <StatCell label="Pending"  value={stats.pending}  color="#f59e0b" />
          <StatCell label="Verified" value={stats.verified} color="#22c55e" />
          <StatCell label="Flagged"  value={stats.flagged}  color="#ef4444" />
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 mt-5">
        <button
          onClick={onGoToUpload}
          className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl text-white font-semibold text-base active:scale-[0.98] transition-transform"
          style={{ backgroundColor: "#1a3a5c", boxShadow: "0 4px 14px rgba(26,58,92,0.3)" }}
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Capture Delivery Order
        </button>
      </div>

      {/* Today's uploads */}
      <div className="px-4 mt-6 pb-8">
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
            {orders.map(order => {
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