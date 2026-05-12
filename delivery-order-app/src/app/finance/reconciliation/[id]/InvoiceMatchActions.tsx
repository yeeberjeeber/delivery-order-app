"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type LineItem = {
  id: string
  do_number: string
  quantity: number | null
  unit_price: number | null
  amount: number | null
  match_status: string
  matched_do_id: string | null
  discrepancy_notes: string | null
}

export default function InvoiceMatchActions({
  invoiceId,
  status,
  lineItems,
}: {
  invoiceId: string
  status: string
  lineItems: LineItem[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [manualDo, setManualDo] = useState<Record<string, string>>({})

  async function autoMatch() {
    setLoading("auto"); setError("")
    const res = await fetch(`/api/finance/invoices/${invoiceId}/auto-match`, { method: "POST" })
    setLoading(null)
    if (!res.ok) { setError("Auto-match failed."); return }
    router.refresh()
  }

  async function manualMatch(itemId: string) {
    const doNumber = manualDo[itemId]?.trim()
    if (!doNumber) return
    setLoading(itemId); setError("")
    const res = await fetch(`/api/finance/invoices/${invoiceId}/line-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ do_number: doNumber }),
    })
    setLoading(null)
    if (!res.ok) { setError("Match failed."); return }
    setManualDo(prev => ({ ...prev, [itemId]: "" }))
    router.refresh()
  }

  async function approveInvoice() {
    setLoading("approve"); setError("")
    const res = await fetch(`/api/finance/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    })
    setLoading(null)
    if (!res.ok) { setError("Approval failed."); return }
    router.refresh()
  }

  const MATCH_COLOR: Record<string, string> = {
    matched: "#15803d", discrepancy: "#a16207", unmatched: "#b91c1c", pending: "#6b7280",
  }
  const MATCH_BG: Record<string, string> = {
    matched: "#dcfce7", discrepancy: "#fef9c3", unmatched: "#fee2e2", pending: "#f3f4f6",
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="mx-4 rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100">{error}</div>
      )}

      {/* Action buttons */}
      {status !== "approved" && (
        <div className="px-4 flex gap-3">
          <button onClick={autoMatch} disabled={loading === "auto"}
            className="flex-1 h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#1a3a5c" }}>
            {loading === "auto" ? "Matching…" : "Auto-Match All"}
          </button>
          <button onClick={approveInvoice} disabled={loading === "approve"}
            className="flex-1 h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#16a34a" }}>
            {loading === "approve" ? "Saving…" : "Approve Invoice"}
          </button>
        </div>
      )}

      {/* Line items */}
      <div className="px-4 flex flex-col gap-3">
        {lineItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-900">D.O. #{item.do_number}</p>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: MATCH_BG[item.match_status] ?? MATCH_BG.pending, color: MATCH_COLOR[item.match_status] ?? MATCH_COLOR.pending }}>
                {item.match_status.charAt(0).toUpperCase() + item.match_status.slice(1)}
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-50 px-0">
              <Cell label="Qty"        value={item.quantity != null ? String(item.quantity) : "—"} />
              <Cell label="Unit Price" value={item.unit_price != null ? `S$${item.unit_price.toFixed(2)}` : "—"} />
              <Cell label="Amount"     value={item.amount != null ? `S$${item.amount.toFixed(2)}` : "—"} />
            </div>
            {item.discrepancy_notes && (
              <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
                ⚠ {item.discrepancy_notes}
              </p>
            )}
            {item.match_status !== "matched" && status !== "approved" && (
              <div className="px-4 py-3 border-t border-gray-50 flex gap-2">
                <input
                  value={manualDo[item.id] ?? ""}
                  onChange={e => setManualDo(prev => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="Enter D.O. number to link"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
                <button onClick={() => manualMatch(item.id)} disabled={loading === item.id}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#1a3a5c" }}>
                  {loading === item.id ? "…" : "Link"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center py-3">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-gray-800 mt-0.5">{value}</span>
    </div>
  )
}