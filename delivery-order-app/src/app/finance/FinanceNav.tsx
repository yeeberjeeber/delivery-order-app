"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  {
    href: "/finance/dashboard",
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
    href: "/finance/reconciliation",
    label: "Invoices",
    icon: (active: boolean) => (
      <svg className="size-6" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: "/finance/export",
    label: "Export",
    icon: (active: boolean) => (
      <svg className="size-6" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
  },
]

export default function FinanceNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-18 bg-white border-t border-gray-200 flex items-center justify-around px-4 z-40"
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