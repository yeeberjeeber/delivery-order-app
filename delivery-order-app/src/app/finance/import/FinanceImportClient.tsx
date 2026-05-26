"use client"

import { useState, useRef } from "react"

type ParsedRow  = Record<string, string>
type RowError   = { row: number; reason: string }
type ImportResult = { inserted: number; skipped: number; rowErrors: RowError[] }
type Lookup     = { id: string; name: string }

const HEADERS = [
  "do_number", "supplier_name", "material_type", "quantity",
  "unit_price", "amount", "driver_name", "vehicle_plate",
  "submitted_at", "verified_at", "status", "remarks",
]
const REQUIRED = ["do_number", "supplier_name", "material_type", "quantity"]
const EXAMPLE  = [
  "DO-001", "ABC Supplies Pte Ltd", "Sand", "100",
  "25.00", "2500.00", "John Driver", "SBA1234A",
  "2024-01-15", "2024-01-15", "verified", "",
]

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim())
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = splitLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? "").trim()]))
  })
}

function splitLine(line: string): string[] {
  const result: string[] = []
  let current = ""; let inQ = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQ && line[i + 1] === '"') { current += '"'; i++ }
      else inQ = !inQ
    } else if (line[i] === "," && !inQ) { result.push(current); current = "" }
    else current += line[i]
  }
  result.push(current)
  return result
}

function downloadTemplate() {
  const csv = [HEADERS.join(","), EXAMPLE.join(",")].join("\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  a.download = "delivery-orders-template.csv"
  a.click()
}

function rowValidate(row: ParsedRow, suppliers: Lookup[], drivers: Lookup[], vehicles: Lookup[]) {
  const errors: string[] = []
  if (!row.do_number?.trim())   errors.push("do_number required")
  if (!row.supplier_name?.trim()) errors.push("supplier_name required")
  else {
    const found = suppliers.some(s => s.name.toLowerCase() === row.supplier_name.trim().toLowerCase())
    if (!found) errors.push(`Supplier "${row.supplier_name.trim()}" not found`)
  }
  if (!row.material_type?.trim()) errors.push("material_type required")
  if (!row.quantity?.trim() || isNaN(Number(row.quantity))) errors.push("quantity must be a number")
  return errors
}

export default function FinanceImportClient({
  suppliers,
  drivers,
  vehicles,
}: {
  suppliers: Lookup[]
  drivers:   Lookup[]
  vehicles:  Lookup[]
}) {
  const [rows, setRows]     = useState<ParsedRow[]>([])
  const [parseErr, setParseErr] = useState("")
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() { setRows([]); setParseErr(""); setResult(null) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    reset()
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCSV(reader.result as string)
      if (parsed.length === 0) { setParseErr("No data rows found. Check the file format."); return }
      setRows(parsed)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleImport() {
    setImporting(true); setResult(null)
    try {
      const res = await fetch("/api/finance/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) { setParseErr(data.error ?? "Import failed"); return }
      setResult(data)
      setRows([])
    } finally { setImporting(false) }
  }

  // Per-row client validation for preview
  const rowValidations = rows.map(r => rowValidate(r, suppliers, drivers, vehicles))
  const validCount     = rowValidations.filter(e => e.length === 0).length

  const PREVIEW_COLS = ["do_number", "supplier_name", "material_type", "quantity", "amount", "submitted_at", "status"]

  return (
    <div className="px-4 mt-4 pb-8 flex flex-col gap-4">

      {/* Template */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">CSV Columns</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {HEADERS.map(h => (
            <span key={h} className="text-[11px] px-2 py-1 rounded-lg font-mono"
              style={REQUIRED.includes(h)
                ? { backgroundColor: "#fee2e2", color: "#b91c1c" }
                : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
              {h}{REQUIRED.includes(h) ? " *" : ""}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mb-3">
          <span className="text-red-500">Red = required.</span> Dates: YYYY-MM-DD. Status defaults to "verified".
          supplier_name must exactly match an existing supplier.
        </p>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download template
        </button>
      </div>

      {/* Upload */}
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      {rows.length === 0 && (
        <button onClick={() => fileRef.current?.click()}
          className="w-full h-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-gray-300">
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-xs font-semibold">Tap to upload CSV</span>
        </button>
      )}

      {parseErr && (
        <div className="rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100">{parseErr}</div>
      )}

      {result && (
        <div className="rounded-xl px-4 py-4 bg-green-50 border border-green-100">
          <p className="text-sm font-semibold text-green-800 mb-1">Import complete</p>
          <p className="text-xs text-green-700">{result.inserted} inserted · {result.skipped} skipped</p>
          {result.rowErrors.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.rowErrors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">Row {e.row}: {e.reason}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Preview — {rows.length} rows
              {(rows.length - validCount) > 0 && (
                <span className="text-red-500 ml-2">({rows.length - validCount} with errors)</span>
              )}
            </p>
            <button onClick={() => fileRef.current?.click()}
              className="text-xs text-blue-600 font-semibold">Replace</button>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-gray-400 w-8">#</th>
                  {PREVIEW_COLS.map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => {
                  const errs = rowValidations[i]
                  const hasErr = errs.length > 0
                  return (
                    <tr key={i} className={hasErr ? "bg-red-50" : ""}>
                      <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                      {PREVIEW_COLS.map(h => (
                        <td key={h} className={`px-3 py-2 whitespace-nowrap ${!row[h]?.trim() && REQUIRED.includes(h) ? "text-red-500 font-semibold" : "text-gray-700"}`}>
                          {row[h] || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {hasErr
                          ? <span className="text-red-500 font-medium">{errs[0]}</span>
                          : <span className="text-green-600 font-semibold">✓</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-4 border-t border-gray-50">
            <button onClick={handleImport} disabled={importing || validCount === 0}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#1a3a5c" }}>
              {importing ? "Importing…" : `Import ${validCount} row${validCount !== 1 ? "s" : ""}`}
            </button>
            {rows.length - validCount > 0 && (
              <p className="text-xs text-center text-gray-400 mt-2">
                {rows.length - validCount} row{rows.length - validCount !== 1 ? "s" : ""} with errors will be skipped
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}