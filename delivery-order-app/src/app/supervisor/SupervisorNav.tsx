"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  {
    href: "/supervisor/dashboard",
    label: "Home",
    icon: (active: boolean) => (
      <svg className="size-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/supervisor/orders",
    label: "Orders",
    icon: (active: boolean) => (
      <svg className="size-6" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
]

export default function SupervisorNav() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-gray-200 flex items-center justify-around px-4 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {NAV.map(({ href, label, icon }) => {
        const active = path.startsWith(href)
        return (
          <Link key={href} href={href}
            className="flex flex-col items-center gap-1 py-2 px-6"
            style={{ color: active ? "#1a3a5c" : "#9ca3af" }}>
            {icon(active)}
            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
