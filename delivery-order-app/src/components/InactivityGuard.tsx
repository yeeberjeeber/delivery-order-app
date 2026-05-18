"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const STORAGE_KEY = "lastActiveAt"
const CHECK_INTERVAL_MS = 60_000 // check every 60s

export default function InactivityGuard({
  timeoutMs,
  loginHref,
}: {
  timeoutMs: number
  loginHref: string
}) {
  const router    = useRouter()
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function signOutAndRedirect() {
      await supabase.auth.signOut()
      router.replace(loginHref)
    }

    function isExpired() {
      const last = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10)
      return last > 0 && Date.now() - last > timeoutMs
    }

    function recordActivity() {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    }

    function checkAndAct() {
      if (isExpired()) signOutAndRedirect()
    }

    // Seed timestamp if missing (first visit)
    if (!localStorage.getItem(STORAGE_KEY)) recordActivity()

    // Immediately check in case they're returning after a long absence
    checkAndAct()

    // Update timestamp on any user interaction
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const
    events.forEach(e => window.addEventListener(e, recordActivity, { passive: true }))

    // Check when the tab becomes visible again (handles background tabs)
    function onVisibilityChange() {
      if (!document.hidden) checkAndAct()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    // Periodic check as a backstop
    timerRef.current = setInterval(checkAndAct, CHECK_INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      events.forEach(e => window.removeEventListener(e, recordActivity))
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [timeoutMs, loginHref, router])

  return null
}