"use client"

import { useRouter } from "next/navigation"

type Supplier = { id: string; name: string }

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function buildYears(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current; y >= current - 3; y--) years.push(y)
  return years
}

export default function ExportFilters({
  month,
  supplierId,
  status,
  suppliers,
}: {
  month: string        // "YYYY-MM"
  supplierId: string
  status: string
  suppliers: Supplier[]
}) {
  const router = useRouter()
  const [yearStr, monthStr] = month.split("-")
  const selectedYear  = Number(yearStr)
  const selectedMonth = Number(monthStr)

  function navigate(newYear: number, newMonth: number, newSupplier: string, newStatus: string) {
    const mm = String(newMonth).padStart(2, "0")
    const params = new URLSearchParams({ month: `${newYear}-${mm}`, status: newStatus })
    if (newSupplier) params.set("supplier_id", newSupplier)
    router.push(`/finance/export?${params.toString()}`)
  }

  return (
    <div className="px-4 mt-6 space-y-4">
      {/* Month + Year */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Month</label>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => navigate(selectedYear, Number(e.target.value), supplierId, status)}
              className="w-full appearance-none rounded-xl border border-gray-200 pl-3 pr-8 py-2.5 text-sm text-gray-800 bg-white outline-none focus:border-blue-400">
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <Caret />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Year</label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => navigate(Number(e.target.value), selectedMonth, supplierId, status)}
              className="w-full appearance-none rounded-xl border border-gray-200 pl-3 pr-8 py-2.5 text-sm text-gray-800 bg-white outline-none focus:border-blue-400">
              {buildYears().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Caret />
          </div>
        </div>
      </div>

      {/* Supplier */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Supplier</label>
        <div className="relative">
          <select
            value={supplierId}
            onChange={e => navigate(selectedYear, selectedMonth, e.target.value, status)}
            className="w-full appearance-none rounded-xl border border-gray-200 pl-3 pr-8 py-2.5 text-sm text-gray-800 bg-white outline-none focus:border-blue-400">
            <option value="">All suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Caret />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</label>
        <div className="flex gap-2">
          {[
            { key: "all",      label: "All" },
            { key: "pending",  label: "Pending" },
            { key: "verified", label: "Verified" },
            { key: "flagged",  label: "Flagged" },
          ].map(({ key, label }) => (
            <button key={key}
              onClick={() => navigate(selectedYear, selectedMonth, supplierId, key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors"
              style={status === key
                ? { backgroundColor: "#1a3a5c", color: "#fff", borderColor: "#1a3a5c" }
                : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Caret() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <svg className="size-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  )
}