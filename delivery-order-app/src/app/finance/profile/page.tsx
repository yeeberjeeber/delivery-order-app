import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import ProfileEditForm from "@/components/ProfileEditForm"

export default async function FinanceProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, role")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-14 pb-5 flex items-center gap-3" style={{ backgroundColor: "#1a3a5c" }}>
        <Link href="/finance/dashboard"
          className="size-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
          <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">Edit Profile</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Update your details</p>
        </div>
      </div>
      <ProfileEditForm profile={profile} backHref="/finance/dashboard" />
    </div>
  )
}
