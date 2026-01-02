"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface WalletOverviewProps {
  wallet: any
  profile: any
}

export default function WalletOverview({ wallet, profile }: WalletOverviewProps) {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle>Your Wallet</CardTitle>
        <CardDescription>Manage your funds and transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-8">
          <p className="text-muted-foreground mb-2">Total Balance</p>
          <p className="text-4xl font-bold text-primary">₦{(wallet?.balance || 0).toLocaleString()}</p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Funded</p>
              <p className="text-lg font-semibold text-foreground">₦{(wallet?.total_funded || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Withdrawn</p>
              <p className="text-lg font-semibold text-foreground">
                ₦{(wallet?.total_withdrawn || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/wallet-funding">
            <Button className="w-full bg-primary hover:bg-primary/90">Fund Wallet</Button>
          </Link>
          <Link href="/dashboard/withdrawals">
            <Button variant="outline" className="w-full bg-transparent">
              Withdraw
            </Button>
          </Link>
        </div>
        {/* </CHANGE> */}

        {profile?.kyc_status !== "approved" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Complete KYC verification to unlock withdrawal features.{" "}
              <Link href="/auth/kyc" className="underline font-semibold">
                Complete KYC
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
