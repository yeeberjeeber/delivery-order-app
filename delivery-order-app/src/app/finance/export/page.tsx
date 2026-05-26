import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ExportFilters from "./ExportFilters"

function currentMonthSGT(): string {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const y = sgt.getUTCFullYear()
  const m = String(sgt.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

type SearchParams = Promise<{ month?: string; supplier_id?: string; status?: string }>

export default async function ExportPage({ searchParams }: { searchParams: SearchParams }) {
  const { month: rawMonth, supplier_id = "", status = "all" } = await searchParams
  const month = rawMonth ?? currentMonthSGT()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [suppliersRes, countRes] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    (() => {
      const [y, m] = month.split("-").map(Number)
      const from = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0) - 8 * 60 * 60 * 1000).toISOString()
      const nextM = m === 12 ? 1 : m + 1
      const nextY = m === 12 ? y + 1 : y
      const to   = new Date(Date.UTC(nextY, nextM - 1, 1, 0, 0, 0) - 8 * 60 * 60 * 1000).toISOString()
      let q = supabase
        .from("delivery_orders")
        .select("*", { count: "exact", head: true })
        .gte("submitted_at", from)
        .lt("submitted_at", to)
      if (status !== "all") q = q.eq("status", status)
      if (supplier_id)      q = q.eq("supplier_id", supplier_id)
      return q
    })(),
  ])

  const suppliers   = suppliersRes.data ?? []
  const recordCount = countRes.count ?? 0

  const exportUrl = new URLSearchParams({
    month,
    ...(supplier_id && { supplier_id }),
    ...(status !== "all" && { status }),
  })

  const monthLabel = new Date(`${month}-01`).toLocaleDateString("en-SG", {
    month: "long", year: "numeric",
  })

  return (
    <div className="flex flex-col pb-8">
      <div className="px-5 pt-14 pb-8" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-2xl font-bold text-white">Export Data</h1>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Download D.O. records as CSV</p>
      </div>

      <ExportFilters
        month={month}
        supplierId={supplier_id}
        status={status}
        suppliers={suppliers}
      />

      {/* Preview + download */}
      <div className="mx-4 mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">{monthLabel}</p>
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
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download CSV
        </a>
        <p className="text-[11px] text-gray-400 text-center mt-2">Opens in Excel, Google Sheets, Numbers</p>
      </div>
    </div>
  )
}