"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface QuickActionsProps {
  userId: string
}

export default function QuickActions({ userId }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Get started with common tasks</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/portfolios/new">
          <Button variant="outline" className="w-full justify-start bg-transparent">
            <span className="mr-2">📁</span>
            Create Portfolio
          </Button>
        </Link>
        <Link href="/dashboard/investments/new">
          <Button variant="outline" className="w-full justify-start bg-transparent">
            <span className="mr-2">📈</span>
            Start Investment
          </Button>
        </Link>
        <Link href="/dashboard/portfolios">
          <Button variant="outline" className="w-full justify-start bg-transparent">
            <span className="mr-2">💰</span>
            Add Savings Plan
          </Button>
        </Link>
        <Link href="/dashboard/referrals">
          <Button variant="outline" className="w-full justify-start bg-transparent">
            <span className="mr-2">👥</span>
            Invite Friends
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
