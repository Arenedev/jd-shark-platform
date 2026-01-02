"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface WithdrawalConfirmationModalProps {
  isOpen: boolean
  amount: number
  accountNumber: string
  bankName: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function WithdrawalConfirmationModal({
  isOpen,
  amount,
  accountNumber,
  bankName,
  onConfirm,
  onCancel,
  isLoading = false,
}: WithdrawalConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Confirm Withdrawal</DialogTitle>
          <DialogDescription>Please review the withdrawal details below</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2 border-b border-border pb-4">
            <p className="text-sm text-muted-foreground">Amount to Withdraw</p>
            <p className="text-2xl font-bold text-secondary">₦{amount.toLocaleString()}</p>
          </div>
          <div className="space-y-2 border-b border-border pb-4">
            <p className="text-sm text-muted-foreground">Bank Account</p>
            <p className="font-semibold text-foreground">{bankName}</p>
            <p className="text-sm text-muted-foreground">{accountNumber}</p>
          </div>
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              The withdrawal will be processed within 24-48 hours to your registered bank account.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="bg-primary hover:bg-primary/90">
            {isLoading ? "Processing..." : "Confirm Withdrawal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
