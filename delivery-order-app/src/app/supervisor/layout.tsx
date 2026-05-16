import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SupervisorNav from "./SupervisorNav"
import UserMenu from "@/components/UserMenu"

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  if (!profile || !["supervisor", "admin"].includes(profile.role)) {
    redirect("/login")
  }

  const firstName = profile.full_name?.split(" ")[0] ?? "Supervisor"

  return (
    <div className="min-h-screen bg-gray-50 pb-18">
      <div className="fixed top-4 right-4 z-50">
        <UserMenu name={firstName} profileHref="/supervisor/profile" signOutHref="/api/auth/sign-out?next=/login" />
      </div>
      {children}
      <SupervisorNav />
    </div>
  )
}
