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

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()   // month is 1-based; day 0 = last day of prev month
}

export default function OrderFilters({
  month,
  day,
  supplier,
  suppliers,
}: {
  month: string      // "YYYY-MM"
  day: number        // 0 = all days, 1-31 = specific day
  supplier: string
  suppliers: Supplier[]
}) {
  const router = useRouter()
  const [yearStr, monthStr] = month.split("-")
  const selectedYear  = Number(yearStr)
  const selectedMonth = Number(monthStr)
  const maxDay        = daysInMonth(selectedYear, selectedMonth)

  function navigate(newYear: number, newMonth: number, newDay: number, newSupplier: string) {
    const mm = String(newMonth).padStart(2, "0")
    const params = new URLSearchParams({ month: `${newYear}-${mm}` })
    if (newDay > 0)    params.set("day", String(newDay))
    if (newSupplier)   params.set("supplier", newSupplier)
    router.push(`/finance/orders?${params.toString()}`)
  }

  // If the selected day exceeds the days in the newly chosen month, reset to 0
  const safeDay = day > maxDay ? 0 : day

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-2.5">
      {/* Day / Month / Year row */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Day</p>
          <div className="relative">
            <select
              value={safeDay}
              onChange={e => navigate(selectedYear, selectedMonth, Number(e.target.value), supplier)}
              className="w-full appearance-none rounded-xl border border-gray-200 pl-3 pr-7 py-2.5 text-sm text-gray-800 bg-white outline-none focus:border-blue-400">
              <option value={0}>All</option>
              {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <Caret />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Month</p>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => navigate(selectedYear, Number(e.target.value), 0, supplier)}
              className="w-full appearance-none rounded-xl border border-gray-200 pl-3 pr-7 py-2.5 text-sm text-gray-800 bg-white outline-none focus:border-blue-400">
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <Caret />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Year</p>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => navigate(Number(e.target.value), selectedMonth, 0, supplier)}
              className="w-full appearance-none rounded-xl border border-gray-200 pl-3 pr-7 py-2.5 text-sm text-gray-800 bg-white outline-none focus:border-blue-400">
              {buildYears().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Caret />
          </div>
        </div>
      </div>

      {/* Supplier dropdown */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Supplier</p>
        <div className="relative">
          <select
            value={supplier}
            onChange={e => navigate(selectedYear, selectedMonth, safeDay, e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 pl-3 pr-8 py-2.5 text-sm text-gray-800 bg-white outline-none focus:border-blue-400">
            <option value="">All suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Caret />
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