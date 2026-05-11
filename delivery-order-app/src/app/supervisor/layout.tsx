import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SupervisorNav from "./SupervisorNav"

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["supervisor", "admin"].includes(profile.role)) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-[72px]">
      {children}
      <SupervisorNav />
    </div>
  )
}
