import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import FinanceNav from "./FinanceNav"

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["finance", "admin"].includes(profile.role)) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-18">
      {children}
      <FinanceNav />
    </div>
  )
}
