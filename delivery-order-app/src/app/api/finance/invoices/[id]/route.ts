import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = Promise<{ id: string }>

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["finance", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { status } = await request.json()
  if (!status) return NextResponse.json({ error: "status required" }, { status: 400 })

  const { error } = await supabase
    .from("supplier_invoices")
    .update({ status, approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: `invoice_${status}`,
    entity_type: "supplier_invoice",
    entity_id: id,
    metadata: { status },
  })

  return NextResponse.json({ ok: true })
}