"use client"

import { useState, useRef } from "react"

type Tab = "suppliers" | "vehicles" | "projects"
type ParsedRow = Record<string, string>
type ImportResult = { inserted: number; skipped: number; errors: string[] }

const TEMPLATES: Record<Tab, { headers: string[]; example: string[]; required: string[] }> = {
  suppliers: {
    headers:  ["name", "contact_name", "contact_phone"],
    example:  ["ABC Supplies Pte Ltd", "John Tan", "+6591234567"],
    required: ["name"],
  },
  vehicles: {
    headers:  ["plate_number", "vehicle_type"],
    example:  ["SBA1234A", "lorry"],
    required: ["plate_number"],
  },
  projects: {
    headers:  ["name", "code"],
    example:  ["Marina Bay Project", "PRJ-001"],
    required: ["name"],
  },
}

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 1) return { headers: [], rows: [] }
  const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim())
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = splitLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? "").trim()]))
  })
  return { headers, rows }
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

function downloadTemplate(tab: Tab) {
  const t = TEMPLATES[tab]
  const csv = [t.headers.join(","), t.example.join(",")].join("\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  a.download = `${tab}-template.csv`
  a.click()
}

export default function AdminImportClient() {
  const [tab, setTab]       = useState<Tab>("suppliers")
  const [rows, setRows]     = useState<ParsedRow[]>([])
  const [rowErrs, setRowErrs] = useState<Set<number>>(new Set())
  const [parseErr, setParseErr] = useState("")
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() { setRows([]); setRowErrs(new Set()); setParseErr(""); setResult(null) }

  function handleTabChange(t: Tab) { setTab(t); reset() }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    reset()
    const reader = new FileReader()
    reader.onload = () => {
      const { headers, rows: parsed } = parseCSV(reader.result as string)
      const tmpl = TEMPLATES[tab]
      const missing = tmpl.required.filter(r => !headers.includes(r))
      if (missing.length > 0) {
        setParseErr(`Missing required columns: ${missing.join(", ")}`)
        return
      }
      // Validate required fields per row
      const errs = new Set<number>()
      parsed.forEach((r, i) => {
        if (tmpl.required.some(col => !r[col]?.trim())) errs.add(i)
      })
      setRows(parsed)
      setRowErrs(errs)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleImport() {
    const validRows = rows.filter((_, i) => !rowErrs.has(i))
    if (validRows.length === 0) return
    setImporting(true); setResult(null)
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: tab, rows: validRows }),
      })
      const data = await res.json()
      if (!res.ok) { setParseErr(data.error ?? "Import failed"); return }
      setResult(data)
      setRows([]); setRowErrs(new Set())
    } finally { setImporting(false) }
  }

  const tmpl     = TEMPLATES[tab]
  const validCount = rows.length - rowErrs.size

  return (
    <div className="px-4 mt-4 pb-8 flex flex-col gap-4">

      {/* Tabs */}
      <div className="flex gap-2">
        {(["suppliers", "vehicles", "projects"] as Tab[]).map(t => (
          <button key={t} onClick={() => handleTabChange(t)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border capitalize transition-colors"
            style={tab === t
              ? { backgroundColor: "#1a3a5c", color: "#fff", borderColor: "#1a3a5c" }
              : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Template download */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">CSV Template</p>
        <div className="overflow-x-auto mb-3">
          <table className="text-xs w-full">
            <thead>
              <tr>
                {tmpl.headers.map(h => (
                  <th key={h} className="text-left px-2 py-1.5 font-semibold text-gray-500 bg-gray-50 rounded">
                    {h}{tmpl.required.includes(h) && <span className="text-red-500 ml-0.5">*</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-gray-400">
                {tmpl.example.map((v, i) => <td key={i} className="px-2 py-1.5 italic">{v}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <button onClick={() => downloadTemplate(tab)}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download template
        </button>
      </div>

      {/* Upload */}
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      {rows.length === 0 ? (
        <button onClick={() => fileRef.current?.click()}
          className="w-full h-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-gray-300">
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-xs font-semibold">Tap to upload CSV</span>
        </button>
      ) : null}

      {parseErr && (
        <div className="rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100">{parseErr}</div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl px-4 py-4 bg-green-50 border border-green-100">
          <p className="text-sm font-semibold text-green-800 mb-1">Import complete</p>
          <p className="text-xs text-green-700">{result.inserted} inserted · {result.skipped} skipped (already exist)</p>
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
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
              {rowErrs.size > 0 && <span className="text-red-500 ml-2">({rowErrs.size} invalid)</span>}
            </p>
            <button onClick={() => fileRef.current?.click()}
              className="text-xs text-blue-600 font-semibold">Replace</button>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold w-10">#</th>
                  {tmpl.headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold">{h}</th>
                  ))}
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => {
                  const hasErr = rowErrs.has(i)
                  return (
                    <tr key={i} className={hasErr ? "bg-red-50" : ""}>
                      <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                      {tmpl.headers.map(h => (
                        <td key={h} className={`px-3 py-2 ${!row[h]?.trim() && tmpl.required.includes(h) ? "text-red-500 font-semibold" : "text-gray-700"}`}>
                          {row[h] || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {hasErr
                          ? <span className="text-red-500 font-semibold">Missing required</span>
                          : <span className="text-green-600 font-semibold">✓ Ready</span>}
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
          </div>
        </div>
      )}
    </div>
  )
}