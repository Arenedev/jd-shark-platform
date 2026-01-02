"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

interface AdminLayoutProps {
  children: React.ReactNode
  profile: any
}

export default function AdminLayout({ children, profile }: AdminLayoutProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-64 h-screen bg-card border-r border-border overflow-y-auto hidden md:block">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              JD
            </div>
            <span className="font-bold text-primary">SHARK</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Admin Panel</p>
        </div>

        <nav className="p-6 space-y-2">
          <AdminNavLink href="/admin" label="Dashboard" icon="📊" />
          <AdminNavLink href="/admin/users" label="Manage Users" icon="👥" />
          <AdminNavLink href="/admin/kyc" label="KYC Verification" icon="✓" />
          <AdminNavLink href="/admin/investments" label="Investments" icon="📈" />
          <AdminNavLink href="/admin/reports" label="Reports" icon="📋" />
          <AdminNavLink href="/admin/settings" label="Settings" icon="⚙️" />
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            onClick={handleLogout}
            disabled={loading}
            variant="outline"
            className="w-full justify-center bg-transparent"
          >
            {loading ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-6 lg:p-8">{children}</main>
    </div>
  )
}

function AdminNavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
