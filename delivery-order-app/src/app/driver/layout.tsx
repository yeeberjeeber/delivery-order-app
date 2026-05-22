import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DriverNav from "./DriverNav"
import SwipeNav from "./SwipeNav"
import UserMenu from "@/components/UserMenu"
import OfflineBanner from "@/components/OfflineBanner"
import InactivityGuard from "@/components/InactivityGuard"

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/driver/login")

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
  const firstName = profile?.full_name?.split(" ")[0] ?? "Driver"

  return (
    <>
      <InactivityGuard timeoutMs={SEVEN_DAYS} loginHref="/driver/login" />
      <OfflineBanner />
      <div className="fixed top-4 right-4 z-50">
        <UserMenu name={firstName} profileHref="/driver/profile" signOutHref="/api/auth/sign-out?next=/driver/login" />
      </div>
      <div className="min-h-svh flex flex-col pb-18" style={{ backgroundColor: "#f5f7fa" }}>
        <SwipeNav>{children}</SwipeNav>
        <DriverNav />
      </div>
    </>
  )
}
