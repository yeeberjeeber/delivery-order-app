"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"

const TABS = [
  "/driver/dashboard",
  "/driver/upload",
  "/driver/history",
]

const COMMIT_THRESHOLD = 80   // px needed to trigger navigation
const EDGE_RESISTANCE  = 0.2  // factor applied when swiping past the first/last tab

export default function SwipeNav({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [offset,    setOffset]    = useState(0)
  const [animating, setAnimating] = useState(false)

  const containerRef  = useRef<HTMLDivElement>(null)
  const startXY       = useRef<{ x: number; y: number } | null>(null)
  const swipeDir      = useRef<"horizontal" | "vertical" | null>(null)
  const currentOffset = useRef(0)  // mirrors state so touchend can read latest value

  const idx = TABS.indexOf(pathname)

  // Keep ref in sync with state
  useEffect(() => { currentOffset.current = offset }, [offset])

  const commit = useCallback((finalOffset: number) => {
    const target =
      finalOffset < -COMMIT_THRESHOLD ? TABS[idx + 1] :
      finalOffset >  COMMIT_THRESHOLD ? TABS[idx - 1] :
      null

    if (target) {
      const exitTo = finalOffset < 0 ? -window.innerWidth : window.innerWidth
      setAnimating(true)
      setOffset(exitTo)
      setTimeout(() => {
        setOffset(0)
        setAnimating(false)
        router.push(target)
      }, 200)
    } else {
      setAnimating(true)
      setOffset(0)
      setTimeout(() => setAnimating(false), 250)
    }
  }, [idx, router])

  // Attach touch listeners as non-passive so we can preventDefault on horizontal swipes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (idx === -1) return
      const t = e.touches[0]
      startXY.current  = { x: t.clientX, y: t.clientY }
      swipeDir.current = null
      setAnimating(false)
    }

    function onTouchMove(e: TouchEvent) {
      if (!startXY.current || idx === -1) return
      const t  = e.touches[0]
      const dx = t.clientX - startXY.current.x
      const dy = t.clientY - startXY.current.y

      // Wait until movement is clear enough to determine direction
      if (!swipeDir.current) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        swipeDir.current = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical"
      }

      if (swipeDir.current !== "horizontal") return

      // Prevent the page from scrolling vertically while swiping horizontally
      e.preventDefault()

      // Apply rubber-band resistance at the edges
      let d = dx
      if (dx > 0 && idx === 0)                  d = dx * EDGE_RESISTANCE
      if (dx < 0 && idx === TABS.length - 1)    d = dx * EDGE_RESISTANCE

      setOffset(d)
    }

    function onTouchEnd() {
      if (!startXY.current || swipeDir.current !== "horizontal") {
        startXY.current  = null
        swipeDir.current = null
        return
      }
      startXY.current  = null
      swipeDir.current = null
      commit(currentOffset.current)
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove",  onTouchMove,  { passive: false })
    el.addEventListener("touchend",   onTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove",  onTouchMove)
      el.removeEventListener("touchend",   onTouchEnd)
    }
  }, [idx, commit])

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      <div
        style={{
          transform:  `translateX(${offset}px)`,
          transition: animating ? "transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  )
}