"use client"

import { useRef } from "react"
import { useRouter, usePathname } from "next/navigation"

const TABS = [
  "/driver/dashboard",
  "/driver/upload",
  "/driver/history",
]

// Only swipe on the top-level tab pages, not on detail pages
const MIN_DISTANCE = 72   // px — far enough to be intentional
const AXIS_RATIO   = 1.8  // horizontal must be this many times greater than vertical

export default function SwipeNav({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const start    = useRef<{ x: number; y: number } | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!start.current) return
    const t  = e.changedTouches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    start.current = null

    if (Math.abs(dx) < MIN_DISTANCE) return
    if (Math.abs(dx) < Math.abs(dy) * AXIS_RATIO) return  // vertical scroll, not swipe

    // Only navigate on exact tab routes — don't swipe on detail/sub-pages
    const idx = TABS.indexOf(pathname)
    if (idx === -1) return

    const target = dx < 0 ? TABS[idx + 1] : TABS[idx - 1]
    if (target) router.push(target)
  }

  return (
    <div className="flex-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  )
}