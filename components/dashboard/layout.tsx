"use client"

import type React from "react"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import Image from "next/image"
import { Menu, X } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
  profile: any
}

export default function DashboardLayout({ children, profile }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    setLoading(true)
    localStorage.removeItem("isAuthenticated")
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar for Desktop */}
      <aside className="fixed left-0 top-0 w-64 h-screen bg-card border-r border-border overflow-y-auto hidden md:block animate-fade-in">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="JD SHARK Logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain animate-fade-in"
            />
            <span className="font-bold text-lg text-primary">SHARK</span>
          </div>
        </div>

        <nav className="p-6 space-y-2">
          <NavLink href="/dashboard" label="Dashboard" icon="📊" isActive={pathname === "/dashboard"} />
          <NavLink href="/dashboard/wallet" label="Wallet" icon="💳" isActive={pathname.includes("/wallet")} />
          <NavLink
            href="/dashboard/portfolios"
            label="Portfolios"
            icon="📁"
            isActive={pathname.includes("/portfolios")}
          />
          <NavLink
            href="/dashboard/investments"
            label="Investments"
            icon="📈"
            isActive={pathname.includes("/investments")}
          />
          <NavLink href="/dashboard/referrals" label="Referrals" icon="👥" isActive={pathname.includes("/referrals")} />
          <NavLink href="/dashboard/settings" label="Settings" icon="⚙️" isActive={pathname.includes("/settings")} />
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            onClick={handleLogout}
            disabled={loading}
            variant="outline"
            className="w-full justify-center bg-transparent hover:bg-secondary/10 transition-colors"
          >
            {loading ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </aside>

      {/* Mobile Header with Hamburger Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-50 animate-fade-in-down">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="JD SHARK Logo" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-bold text-primary">SHARK</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-accent/10 rounded-lg transition-all duration-300"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-accent animate-rotate-in" />
            ) : (
              <Menu className="w-6 h-6 text-accent animate-rotate-in" />
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <nav className="border-t border-border bg-card/95 backdrop-blur-sm p-4 space-y-2 animate-slide-down">
            <NavLink
              href="/dashboard"
              label="Dashboard"
              icon="📊"
              isActive={pathname === "/dashboard"}
              onClick={() => setMobileMenuOpen(false)}
            />
            <NavLink
              href="/dashboard/wallet"
              label="Wallet"
              icon="💳"
              isActive={pathname.includes("/wallet")}
              onClick={() => setMobileMenuOpen(false)}
            />
            <NavLink
              href="/dashboard/portfolios"
              label="Portfolios"
              icon="📁"
              isActive={pathname.includes("/portfolios")}
              onClick={() => setMobileMenuOpen(false)}
            />
            <NavLink
              href="/dashboard/investments"
              label="Investments"
              icon="📈"
              isActive={pathname.includes("/investments")}
              onClick={() => setMobileMenuOpen(false)}
            />
            <NavLink
              href="/dashboard/referrals"
              label="Referrals"
              icon="👥"
              isActive={pathname.includes("/referrals")}
              onClick={() => setMobileMenuOpen(false)}
            />
            <NavLink
              href="/dashboard/settings"
              label="Settings"
              icon="⚙️"
              isActive={pathname.includes("/settings")}
              onClick={() => setMobileMenuOpen(false)}
            />
            <Button
              onClick={() => {
                handleLogout()
                setMobileMenuOpen(false)
              }}
              disabled={loading}
              variant="outline"
              className="w-full justify-center bg-transparent hover:bg-secondary/10 transition-colors mt-4"
            >
              {loading ? "Signing out..." : "Sign Out"}
            </Button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="md:ml-64 pt-20 md:pt-0 p-4 md:p-6 lg:p-8 animate-fade-in-up">{children}</main>
    </div>
  )
}

function NavLink({
  href,
  label,
  icon,
  isActive,
  onClick,
}: {
  href: string
  label: string
  icon: string
  isActive: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
        isActive
          ? "bg-accent/20 text-accent border-l-2 border-accent"
          : "text-foreground hover:bg-accent/10 hover:text-accent"
      }`}
    >
      <span className="group-hover:scale-110 transition-transform">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
