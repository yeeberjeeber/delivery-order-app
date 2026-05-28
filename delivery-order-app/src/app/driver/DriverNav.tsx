"use client"

import { useState, useEffect } from "react"

const TABS = ["/driver/dashboard", "/driver/upload", "/driver/history"]

const NAV = [
  {
    href: "/driver/dashboard",
    label: "Home",
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/driver/upload",
    label: "Upload",
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    ),
  },
  {
    href: "/driver/history",
    label: "History",
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
]

export default function DriverNav() {
  const [activeIdx, setActiveIdx] = useState(() => {
    if (typeof window === "undefined") return 0
    return Math.max(0, TABS.indexOf(window.location.pathname))
  })

  useEffect(() => {
    const update = () => {
      const idx = TABS.indexOf(window.location.pathname)
      if (idx !== -1) setActiveIdx(idx)
    }
    window.addEventListener("driver-tab-change", update)
    window.addEventListener("popstate", update)
    return () => {
      window.removeEventListener("driver-tab-change", update)
      window.removeEventListener("popstate", update)
    }
  }, [])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.06)" }}>
      <div className="flex max-w-sm mx-auto">
        {NAV.map(({ href, label, icon }, idx) => {
          const active = activeIdx === idx
          return (
            <button key={href}
              onClick={() => {
                window.history.replaceState(null, "", href)
                window.dispatchEvent(new Event("driver-tab-change"))
              }}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors"
              style={{ color: active ? "#1a3a5c" : "#9ca3af" }}>
              {icon}
              <span className="text-xs font-semibold">{label}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#1a3a5c" }} />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}