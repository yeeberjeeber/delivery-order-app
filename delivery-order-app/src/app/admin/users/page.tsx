import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import UsersClient from "./UsersClient"

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-8" style={{ backgroundColor: "#1a3a5c" }}>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Manage roles and access</p>
      </div>
      <UsersClient users={users ?? []} />
    </div>
  )
}