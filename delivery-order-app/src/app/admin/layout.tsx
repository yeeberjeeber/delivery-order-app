import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminNav from "./AdminNav"
import UserMenu from "@/components/UserMenu"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") redirect("/login")

  const firstName = profile.full_name?.split(" ")[0] ?? "Admin"

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="fixed top-4 right-4 z-50">
        <UserMenu name={firstName} profileHref="/admin/profile" signOutHref="/api/auth/sign-out?next=/login" />
      </div>
      <main className="flex-1 pb-18">{children}</main>
      <AdminNav />
    </div>
  )
}