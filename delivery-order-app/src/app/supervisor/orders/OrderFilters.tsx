"use client"

import { useRouter, useSearchParams } from "next/navigation"

const STATUS_TABS = [
  { value: "all",      label: "All" },
  { value: "pending",  label: "Reopen" },
  { value: "verified", label: "Verified" },
  { value: "flagged",  label: "Flagged" },
]

const DATE_OPTS = [
  { value: "today", label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "all",   label: "All Time" },
]

const DATE_LABEL: Record<string, string> = {
  all:      "Submitted",
  pending:  "Reopened",
  verified: "Verified",
  flagged:  "Flagged",
}

export default function OrderFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const status = params.get("status") ?? "all"
  const date   = params.get("date")   ?? "today"

  function setFilter(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    p.set(key, value)
    router.push(`/supervisor/orders?${p.toString()}`)
  }

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3">
      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter("status", tab.value)}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            style={
              status === tab.value
                ? { backgroundColor: "#1a3a5c", color: "#fff" }
                : { backgroundColor: "#f3f4f6", color: "#6b7280" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date pills */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-gray-400 shrink-0">
          {DATE_LABEL[status] ?? "Submitted"} date:
        </span>
        {DATE_OPTS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter("date", opt.value)}
            className="shrink-0 text-xs font-medium px-3 py-1 rounded-full border transition-colors"
            style={
              date === opt.value
                ? { borderColor: "#1a3a5c", color: "#1a3a5c", backgroundColor: "#eff6ff" }
                : { borderColor: "#e5e7eb", color: "#9ca3af", backgroundColor: "transparent" }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
