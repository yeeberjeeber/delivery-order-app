"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const FLAG_REASONS = [
  { value: "quantity_mismatch",  label: "Quantity mismatch" },
  { value: "photo_unclear",      label: "Photo unclear or unreadable" },
  { value: "wrong_do_number",    label: "Wrong D.O. number" },
  { value: "missing_info",       label: "Missing required information" },
  { value: "suspicious_entry",   label: "Suspicious entry" },
  { value: "other",              label: "Other" },
]

type Props = {
  orderId: string
  status: string
}

export default function OrderActions({ orderId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  async function callApi(path: string, body?: object) {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/delivery-orders/${orderId}/${path}`, {
        method: "PATCH",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Action failed. Please try again.")
        setLoading(false)
        return false
      }
      return true
    } catch {
      setError("Network error. Please try again.")
      setLoading(false)
      return false
    }
  }

  async function handleVerify() {
    if (!confirm("Mark this D.O. as verified?")) return
    const ok = await callApi("verify")
    if (ok) router.refresh()
  }

  async function handleFlag() {
    if (!reason) return
    const ok = await callApi("flag", { reason, notes: notes || undefined })
    if (ok) {
      setShowFlagModal(false)
      setReason("")
      setNotes("")
      router.refresh()
    }
  }

  async function handleReopen() {
    if (!confirm("Re-open this D.O. for review?")) return
    const ok = await callApi("reopen")
    if (ok) router.refresh()
  }

  const btnBase = "flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"

  return (
    <>
      {error && (
        <div className="mx-4 mb-3 rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100">
          {error}
        </div>
      )}

      <div className="px-4 pb-6 flex gap-3">
        {/* Pending → can Verify or Flag */}
        {status === "pending" && (
          <>
            <button
              onClick={handleVerify}
              disabled={loading}
              className={`${btnBase} flex-1 text-white`}
              style={{ backgroundColor: "#16a34a" }}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Verify
            </button>
            <button
              onClick={() => setShowFlagModal(true)}
              disabled={loading}
              className={`${btnBase} flex-1`}
              style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Flag
            </button>
          </>
        )}

        {/* Verified → can Flag or Re-open */}
        {status === "verified" && (
          <>
            <button
              onClick={() => setShowFlagModal(true)}
              disabled={loading}
              className={`${btnBase} flex-1`}
              style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              Flag Issue
            </button>
            <button
              onClick={handleReopen}
              disabled={loading}
              className={`${btnBase} flex-1`}
              style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
            >
              Re-open
            </button>
          </>
        )}

        {/* Flagged → can Verify or Re-open */}
        {status === "flagged" && (
          <>
            <button
              onClick={handleVerify}
              disabled={loading}
              className={`${btnBase} flex-1 text-white`}
              style={{ backgroundColor: "#16a34a" }}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Verify Anyway
            </button>
            <button
              onClick={handleReopen}
              disabled={loading}
              className={`${btnBase} flex-1`}
              style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
            >
              Re-open
            </button>
          </>
        )}
      </div>

      {/* ── Flag Modal ─────────────────────────────────────────────────── */}
      {showFlagModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowFlagModal(false) }}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-6 pb-8"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Flag this D.O.</h2>
              <button onClick={() => setShowFlagModal(false)}
                className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Reason *
            </label>
            <div className="flex flex-col gap-2 mb-4">
              {FLAG_REASONS.map((r) => (
                <label key={r.value}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors"
                  style={reason === r.value
                    ? { borderColor: "#1a3a5c", backgroundColor: "#eff6ff" }
                    : { borderColor: "#e5e7eb", backgroundColor: "#fff" }
                  }>
                  <input
                    type="radio"
                    name="flag_reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="sr-only"
                  />
                  <div className="size-4 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: reason === r.value ? "#1a3a5c" : "#d1d5db" }}>
                    {reason === r.value && (
                      <div className="size-2 rounded-full" style={{ backgroundColor: "#1a3a5c" }} />
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{r.label}</span>
                </label>
              ))}
            </div>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 resize-none outline-none focus:border-blue-400"
            />

            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handleFlag}
              disabled={!reason || loading}
              className="mt-4 w-full h-12 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#dc2626" }}
            >
              {loading ? "Submitting…" : "Submit Flag"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
