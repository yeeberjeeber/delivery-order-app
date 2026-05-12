import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { full_name, phone, password } = await request.json()

  if (full_name !== undefined || phone !== undefined) {
    const patch: Record<string, string | null> = {}
    if (full_name !== undefined) patch.full_name = full_name
    if (phone !== undefined) patch.phone = phone || null

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
