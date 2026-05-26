import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminImportClient from "./AdminImportClient"

export default async function AdminImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-14 pb-5" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-xl font-bold text-white">Import Data</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          Bulk upload suppliers, vehicles & projects via CSV
        </p>
      </div>
      <AdminImportClient />
    </div>
  )
}