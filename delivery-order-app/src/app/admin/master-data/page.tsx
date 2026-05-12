import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import MasterDataClient from "./MasterDataClient"

export default async function MasterDataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [suppliersRes, vehiclesRes, projectsRes] = await Promise.all([
    supabase.from("suppliers").select("id, name, contact_name, contact_phone, is_active").order("name"),
    supabase.from("vehicles").select("id, plate_number, vehicle_type, is_active").order("plate_number"),
    supabase.from("projects").select("id, name, code, is_active").order("name"),
  ])

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-8" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-2xl font-bold text-white">Master Data</h1>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Suppliers, vehicles, projects</p>
      </div>
      <MasterDataClient
        suppliers={suppliersRes.data ?? []}
        vehicles={vehiclesRes.data ?? []}
        projects={projectsRes.data ?? []}
      />
    </div>
  )
}