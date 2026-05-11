import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DriverNav from "./DriverNav"

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/driver/login")

  return (
    <div className="min-h-svh flex flex-col" style={{ backgroundColor: "#f5f7fa" }}>
      <div className="flex-1 pb-[72px]">{children}</div>
      <DriverNav />
    </div>
  )
}
