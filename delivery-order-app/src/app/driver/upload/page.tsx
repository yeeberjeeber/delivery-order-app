import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import UploadForm from "./UploadForm"

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/driver/login")

  const [vehiclesRes, suppliersRes, projectsRes, supervisorsRes] = await Promise.all([
    supabase
      .from("driver_vehicle_assignments")
      .select("vehicles(id, plate_number)")
      .eq("driver_id", user.id),
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("projects").select("id, code, name").eq("is_active", true).order("code"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "supervisor")
      .eq("is_active", true)
      .order("full_name"),
  ])

  const vehicles = (vehiclesRes.data ?? [])
    .map((a) => a.vehicles)
    .filter((v): v is { id: string; plate_number: string } => v !== null)

  return (
    <UploadForm
      vehicles={vehicles}
      suppliers={suppliersRes.data ?? []}
      projects={projectsRes.data ?? []}
      supervisors={supervisorsRes.data ?? []}
    />
  )
}
