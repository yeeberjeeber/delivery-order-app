"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function RealtimeRefresh({
  table,
  pollIntervalMs = 30_000,
}: {
  table: string
  filter?: string  // kept for API compatibility but not passed to subscription
  pollIntervalMs?: number
}) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to all changes — no row-level filter because filtered
    // postgres_changes requires matching RLS policies on the Realtime service.
    // The server component re-queries with the correct user filter on refresh anyway.
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => router.refresh()
      )
      .subscribe()

    // Polling fallback in case the websocket connection isn't established
    const timer = setInterval(() => router.refresh(), pollIntervalMs)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [table, router, pollIntervalMs])

  return null
}