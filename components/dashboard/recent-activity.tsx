"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RecentActivityProps {
  transactions: any[]
}

export default function RecentActivity({ transactions }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions && transactions.length > 0 ? (
            transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between pb-4 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-foreground capitalize">{tx.type}</p>
                  <p className="text-sm text-muted-foreground">{tx.description || "Transaction"}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.type === "deposit" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "deposit" ? "+" : "-"}₦{Math.abs(tx.amount).toLocaleString()}
                  </p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">No transactions yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
