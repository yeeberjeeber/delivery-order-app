import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const next = new URL(request.url).searchParams.get("next") ?? "/driver/login"
  return NextResponse.redirect(new URL(next, request.url))
}
