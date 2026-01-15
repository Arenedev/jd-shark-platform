"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  CheckCircle,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  DollarSign,
  Wallet,
  Menu,
  X,
} from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
  profile?: any
}

export default function AdminLayout({ children, profile }: AdminLayoutProps) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    setLoading(true)
    localStorage.removeItem("jdshark_admin_session")
    window.location.href = "/admin/login"
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Manage Users", icon: Users },
    { href: "/admin/kyc", label: "KYC Verification", icon: CheckCircle },
    { href: "/admin/deposits", label: "Deposits", icon: DollarSign },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
    { href: "/admin/investments", label: "Investments", icon: TrendingUp },
    { href: "/admin/reports", label: "Reports", icon: FileText },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 w-64 h-screen bg-card border-r border-border overflow-y-auto hidden lg:block">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              JD
            </div>
            <span className="font-bold text-primary">SHARK</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Admin Panel</p>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-accent/10 hover:text-accent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            onClick={handleLogout}
            disabled={loading}
            variant="outline"
            className="w-full justify-center bg-transparent text-sm"
          >
            {loading ? (
              "Signing out..."
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </>
            )}
          </Button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              JD
            </div>
            <div>
              <span className="font-bold text-primary">SHARK</span>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-accent" /> : <Menu className="w-6 h-6 text-accent" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-border bg-card p-4 space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-accent/10 hover:text-accent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
            <Button
              onClick={() => {
                handleLogout()
                setMobileMenuOpen(false)
              }}
              disabled={loading}
              variant="outline"
              className="w-full justify-center bg-transparent mt-4 text-sm"
            >
              {loading ? (
                "Signing out..."
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </>
              )}
            </Button>
          </nav>
        )}
      </div>

      <main className="lg:ml-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}
