import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = Promise<{ id: string }>

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const patch: Record<string, unknown> = {}

  const VALID_ROLES = ["driver", "supervisor", "finance", "admin"]
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    patch.role = body.role
  }

  if (body.is_active !== undefined) {
    patch.is_active = Boolean(body.is_active)
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("profiles").update(patch as any).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "update_user",
    entity_type: "profile",
    entity_id: id,
    metadata: patch as Record<string, string | boolean>,
  })

  return NextResponse.json({ ok: true })
}