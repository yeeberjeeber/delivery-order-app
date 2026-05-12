import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { autoMatchInvoice } from "../../route"

type Params = Promise<{ id: string }>

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["finance", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await autoMatchInvoice(supabase, id)
  return NextResponse.json({ ok: true })
}