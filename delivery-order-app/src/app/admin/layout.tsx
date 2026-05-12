import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminNav from "./AdminNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") redirect("/login")

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 pb-18">{children}</main>
      <AdminNav />
    </div>
  )
}