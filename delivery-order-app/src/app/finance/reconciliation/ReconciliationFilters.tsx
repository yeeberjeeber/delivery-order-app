"use client"

type Supplier = { id: string; name: string }

const STATUS_TABS = [
  { key: "all",         label: "All" },
  { key: "pending",     label: "Pending" },
  { key: "matched",     label: "Matched" },
  { key: "discrepancy", label: "Discrepancy" },
  { key: "unmatched",   label: "Unmatched" },
  { key: "approved",    label: "Approved" },
]

export default function ReconciliationFilters({
  status,
  supplier,
  suppliers,
}: {
  status: string
  supplier: string
  suppliers: Supplier[]
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3">
      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map(({ key, label }) => (
          <a key={key}
            href={`/finance/reconciliation?status=${key}${supplier ? `&supplier=${supplier}` : ""}`}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            style={status === key
              ? { backgroundColor: "#1a3a5c", color: "#fff" }
              : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
            {label}
          </a>
        ))}
      </div>
      {/* Supplier filter */}
      <select
        value={supplier}
        onChange={e => {
          const url = new URL(window.location.href)
          url.searchParams.set("supplier", e.target.value)
          window.location.href = url.toString()
        }}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 bg-white outline-none">
        <option value="">All suppliers</option>
        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  )
}