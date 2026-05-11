import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const doNumber = searchParams.get("do_number")?.trim()

  if (!doNumber) {
    return NextResponse.json({ isDuplicate: false })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("delivery_orders")
    .select("id, do_number, submitted_at, status, supplier:suppliers(name)")
    .eq("do_number", doNumber)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    isDuplicate: !!data,
    existingOrder: data ?? null,
  })
}
