import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

function monthStartSGT(offset = 0): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  sgt.setUTCMonth(sgt.getUTCMonth() - offset, 1)
  const y = sgt.getUTCFullYear()
  const m = String(sgt.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

type SearchParams = Promise<{ month?: string; supplier_id?: string; status?: string }>

export default async function ExportPage({ searchParams }: { searchParams: SearchParams }) {
  const { month = monthStartSGT(), supplier_id = "", status = "all" } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [suppliersRes, countRes] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("delivery_orders").select("*", { count: "exact", head: true })
      .gte("submitted_at", new Date(`${month}-01T00:00:00+08:00`).toISOString())
      .lt("submitted_at", new Date(`${month}-01T00:00:00+08:00`).toISOString().replace(/\d{4}-\d{2}/, () => {
        const [y, m] = month.split("-").map(Number)
        return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`
      })),
  ])

  const suppliers   = suppliersRes.data ?? []
  const recordCount = countRes.count ?? 0

  const months = Array.from({ length: 6 }, (_, i) => monthStartSGT(i))

  const exportUrl = new URLSearchParams({ month, ...(supplier_id && { supplier_id }), ...(status !== "all" && { status }) })

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-8" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-2xl font-bold text-white">Export Data</h1>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Download D.O. records as CSV</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Month */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Month</label>
          <div className="flex gap-2 flex-wrap">
            {months.map((m) => (
              <Link key={m} href={`/finance/export?month=${m}&supplier_id=${supplier_id}&status=${status}`}
                className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors"
                style={month === m
                  ? { backgroundColor: "#1a3a5c", color: "#fff", borderColor: "#1a3a5c" }
                  : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
                {new Date(`${m}-01`).toLocaleDateString("en-SG", { month: "short", year: "numeric" })}
              </Link>
            ))}
          </div>
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Supplier</label>
          <div className="flex gap-2 flex-wrap">
            {[{ id: "", name: "All Suppliers" }, ...suppliers].map((s) => (
              <Link key={s.id} href={`/finance/export?month=${month}&supplier_id=${s.id}&status=${status}`}
                className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors"
                style={supplier_id === s.id
                  ? { backgroundColor: "#1a3a5c", color: "#fff", borderColor: "#1a3a5c" }
                  : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</label>
          <div className="flex gap-2">
            {["all", "pending", "verified", "flagged"].map((s) => (
              <Link key={s} href={`/finance/export?month=${month}&supplier_id=${supplier_id}&status=${s}`}
                className="px-4 py-2 rounded-xl text-sm font-semibold border capitalize transition-colors"
                style={status === s
                  ? { backgroundColor: "#1a3a5c", color: "#fff", borderColor: "#1a3a5c" }
                  : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
                {s === "all" ? "All" : s}
              </Link>
            ))}
          </div>
        </div>

        {/* Preview + export */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 mt-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {new Date(`${month}-01`).toLocaleDateString("en-SG", { month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">~{recordCount} records</p>
            </div>
            <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#f0fdf4" }}>
              <svg className="size-5" style={{ color: "#16a34a" }} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
          </div>
          <a href={`/api/finance/export?${exportUrl}`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: "#16a34a" }}>
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download CSV
          </a>
          <p className="text-[11px] text-gray-400 text-center mt-2">Opens in Excel, Google Sheets, Numbers</p>
        </div>
      </div>
    </div>
  )
}