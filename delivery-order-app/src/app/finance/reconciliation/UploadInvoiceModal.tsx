"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

type Supplier = { id: string; name: string }

type ExtractedInvoice = {
  invoice_number: string | null
  invoice_date: string | null
  total_amount: number | null
  line_items: Array<{
    do_number: string | null
    quantity: number | null
    unit_price: number | null
    amount: number | null
  }>
}

export default function UploadInvoiceModal({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"upload" | "review">("upload")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [supplierId, setSupplierId]       = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate]     = useState("")
  const [totalAmount, setTotalAmount]     = useState("")
  const [lineItems, setLineItems]         = useState<ExtractedInvoice["line_items"]>([{ do_number: "", quantity: null, unit_price: null, amount: null }])
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null)
  const [extracting, setExtracting]       = useState(false)

  function reset() {
    setStep("upload"); setError(""); setSupplierId(""); setInvoiceNumber("")
    setInvoiceDate(""); setTotalAmount(""); setLineItems([{ do_number: "", quantity: null, unit_price: null, amount: null }])
    setPreviewUrl(null); setExtracting(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    setExtracting(true)
    setError("")

    try {
      const reader = new FileReader()
      const b64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res((reader.result as string).split(",")[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })

      const aiRes = await fetch("/api/ai/extract-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, mimeType: file.type }),
      })
      if (aiRes.ok) {
        const { extracted } = await aiRes.json()
        if (extracted) {
          if (extracted.invoice_number) setInvoiceNumber(extracted.invoice_number)
          if (extracted.invoice_date)   setInvoiceDate(extracted.invoice_date)
          if (extracted.total_amount)   setTotalAmount(String(extracted.total_amount))
          if (extracted.line_items?.length) setLineItems(extracted.line_items)
        }
      }
    } catch { /* AI extraction is best-effort */ }
    finally { setExtracting(false) }
  }

  function updateLineItem(i: number, key: string, val: string) {
    setLineItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, [key]: key === "do_number" ? val : (val === "" ? null : Number(val)) } : item
    ))
  }

  function addLineItem() {
    setLineItems(prev => [...prev, { do_number: "", quantity: null, unit_price: null, amount: null }])
  }

  function removeLineItem(i: number) {
    setLineItems(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    if (!supplierId) return setError("Please select a supplier.")
    setLoading(true); setError("")

    const res = await fetch("/api/finance/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier_id: supplierId,
        invoice_number: invoiceNumber || null,
        invoice_date: invoiceDate || null,
        total_amount: totalAmount ? Number(totalAmount) : null,
        line_items: lineItems.filter(l => l.do_number),
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return setError(data.error ?? "Failed to save invoice.")
    }
    const { id } = await res.json()
    setOpen(false); reset()
    router.push(`/finance/reconciliation/${id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl"
        style={{ backgroundColor: "#1a3a5c" }}>
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Upload Invoice
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); reset() } }}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-6 overflow-y-auto"
            style={{ maxHeight: "92vh", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">New Invoice</h2>
              <button onClick={() => { setOpen(false); reset() }}
                className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Photo */}
            <div className="mb-4">
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={handleFileChange} />
              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                  <img src={previewUrl} alt="Invoice" className="w-full max-h-40 object-contain" />
                  {extracting && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <p className="text-xs font-semibold text-gray-500">Extracting with AI…</p>
                    </div>
                  )}
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute top-2 right-2 text-xs bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600">
                    Change
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400">
                  <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span className="text-xs font-medium">Tap to scan invoice (AI auto-fill)</span>
                </button>
              )}
            </div>

            {/* Fields */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Supplier *</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 bg-white outline-none focus:border-blue-400">
                  <option value="">Select supplier…</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Invoice #" value={invoiceNumber} onChange={setInvoiceNumber} placeholder="INV-001" />
                <Field label="Date" type="date" value={invoiceDate} onChange={setInvoiceDate} />
              </div>
              <Field label="Total Amount (S$)" type="number" value={totalAmount} onChange={setTotalAmount} placeholder="0.00" />
            </div>

            {/* Line items */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Line Items (D.O. References)</p>
              <div className="space-y-2">
                {lineItems.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={item.do_number ?? ""} onChange={e => updateLineItem(i, "do_number", e.target.value)}
                        placeholder="D.O. Number"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                      {lineItems.length > 1 && (
                        <button onClick={() => removeLineItem(i)} className="text-gray-400 hover:text-red-500">
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <NumInput label="Qty" val={item.quantity} onChange={v => updateLineItem(i, "quantity", v)} />
                      <NumInput label="Unit Price" val={item.unit_price} onChange={v => updateLineItem(i, "unit_price", v)} />
                      <NumInput label="Amount" val={item.amount} onChange={v => updateLineItem(i, "amount", v)} />
                    </div>
                  </div>
                ))}
                <button onClick={addLineItem}
                  className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-400 hover:border-gray-400">
                  + Add line item
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#1a3a5c" }}>
              {loading ? "Saving…" : "Save & Auto-Match"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400" />
    </div>
  )
}

function NumInput({ label, val, onChange }: { label: string; val: number | null; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <input type="number" value={val ?? ""} onChange={e => onChange(e.target.value)} placeholder="0"
        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400" />
    </div>
  )
}