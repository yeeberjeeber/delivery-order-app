import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = Promise<{ table: string }>

const ALLOWED_TABLES = ["suppliers", "vehicles", "projects"] as const
type AllowedTable = typeof ALLOWED_TABLES[number]

const TABLE_REQUIRED: Record<AllowedTable, string> = {
  suppliers: "name",
  vehicles:  "plate_number",
  projects:  "name",
}

function isAllowed(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable)
}

async function getAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") return null
  return user
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { table } = await params
  const supabase = await createClient()

  const user = await getAdmin(supabase)
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!isAllowed(table)) return NextResponse.json({ error: "Invalid table" }, { status: 400 })

  const body = await request.json()
  const required = TABLE_REQUIRED[table]
  if (!body[required]) return NextResponse.json({ error: `${required} is required` }, { status: 400 })

  const insertData: Record<string, unknown> = { ...body, is_active: true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.from(table).insert(insertData as any).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: `create_${table.slice(0, -1)}`,
    entity_type: table,
    entity_id: data.id,
    metadata: body,
  })

  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { table } = await params
  const supabase = await createClient()

  const user = await getAdmin(supabase)
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!isAllowed(table)) return NextResponse.json({ error: "Invalid table" }, { status: 400 })

  const { id, ...patch } = await request.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { error } = await supabase.from(table).update(patch).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: `update_${table.slice(0, -1)}`,
    entity_type: table,
    entity_id: id,
    metadata: patch,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { table } = await params
  const supabase = await createClient()

  const user = await getAdmin(supabase)
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!isAllowed(table)) return NextResponse.json({ error: "Invalid table" }, { status: 400 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { error } = await supabase.from(table).delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: `delete_${table.slice(0, -1)}`,
    entity_type: table,
    entity_id: id,
    metadata: {},
  })

  return NextResponse.json({ ok: true })
}