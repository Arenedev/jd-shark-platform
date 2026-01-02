"use client"

import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useInvestments } from "@/hooks/use-investments"

export default function InvestmentsPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useUserProfile()
  const { investments, loading: investmentsLoading } = useInvestments()

  if (profileLoading || investmentsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const calculateROI = (amount: number, roi: number) => {
    return (Number(amount) * Number(roi)) / 100
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Investments</h1>
            <p className="text-muted-foreground">Track and manage your investments</p>
          </div>
          <Link href="/dashboard/investments/new">
            <Button className="bg-primary hover:bg-primary/90">New Investment</Button>
          </Link>
        </div>

        {investments && investments.length > 0 ? (
          <div className="space-y-4">
            {investments.map((investment: any) => (
              <Card key={investment.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Investment</h3>
                      <p className="text-sm text-muted-foreground">
                        Created on {new Date(investment.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="capitalize bg-primary/10 text-primary hover:bg-primary/10">
                      {investment.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Principal</p>
                      <p className="text-lg font-semibold">₦{Number(investment.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ROI Rate</p>
                      <p className="text-lg font-semibold">{investment.roi_percentage}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Returns</p>
                      <p className="text-lg font-semibold text-green-600">
                        ₦{calculateROI(investment.amount, investment.roi_percentage).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Matures</p>
                      <p className="text-lg font-semibold">{new Date(investment.maturity_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {investment.status === "matured" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                      Investment matured! You can reinvest or withdraw the returns.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">No investments yet</p>
              <Link href="/dashboard/investments/new">
                <Button className="bg-primary hover:bg-primary/90">Create Your First Investment</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
