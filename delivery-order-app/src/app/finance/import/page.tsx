import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import FinanceImportClient from "./FinanceImportClient"

export default async function FinanceImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Pass lookup data to client for live validation in the preview table
  const [suppliersRes, driversRes, vehiclesRes] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "driver").eq("is_active", true).order("full_name"),
    supabase.from("vehicles").select("id, plate_number").eq("is_active", true).order("plate_number"),
  ])

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-14 pb-5" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-xl font-bold text-white">Import D.O. Records</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          Bulk upload historical delivery orders via CSV
        </p>
      </div>
      <FinanceImportClient
        suppliers={(suppliersRes.data ?? []).map(s => ({ id: s.id, name: s.name }))}
        drivers={(driversRes.data ?? []).map(d => ({ id: d.id, name: d.full_name }))}
        vehicles={(vehiclesRes.data ?? []).map(v => ({ id: v.id, name: v.plate_number }))}
      />
    </div>
  )
}