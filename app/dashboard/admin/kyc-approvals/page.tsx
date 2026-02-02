'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/use-user-profile'
import { Loader2, Check, X, Eye } from 'lucide-react'

interface KYCSubmission {
  id: string
  email: string
  full_name: string
  kyc_status: string
  kyc_document_url: string
  nin_or_bvn: string
  phone: string
  country: string
  bank_name: string
  bank_account_number: string
  bank_account_name: string
  created_at: string
}

export default function KYCApprovalsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const { profile, loading: profileLoading } = useUserProfile(userId)
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState<string | null>(null)

  // Check auth and load data
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        setUserId(user.id)

        // Fetch current user profile to check if admin
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (!userProfile?.is_admin) {
          setError('You do not have permission to access this page')
          return
        }

        // Fetch all KYC submissions with pending status
        const { data: kycData, error: kycError } = await supabase
          .from('profiles')
          .select('*')
          .eq('kyc_status', 'pending')
          .order('created_at', { ascending: false })

        if (kycError) {
          console.error('[v0] Error fetching KYC submissions:', kycError)
          setError('Failed to load KYC submissions')
          return
        }

        console.log('[v0] Loaded KYC submissions:', kycData?.length)
        setSubmissions(kycData || [])
      } catch (err) {
        console.error('[v0] Auth check error:', err)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoad()
  }, [router])

  const handleApprove = async (submissionId: string, email: string) => {
    setApproving(submissionId)
    try {
      const supabase = createClient()

      // Update KYC status to approved
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ kyc_status: 'approved' })
        .eq('id', submissionId)

      if (updateError) {
        console.error('[v0] Error approving KYC:', updateError)
        setError('Failed to approve KYC submission')
        return
      }

      console.log('[v0] KYC approved for:', email)

      // Remove from list
      setSubmissions(submissions.filter((sub) => sub.id !== submissionId))

      // Show success message
      alert(`KYC approved for ${email}`)
    } catch (err) {
      console.error('[v0] Error approving KYC:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve KYC')
    } finally {
      setApproving(null)
    }
  }

  const handleReject = async (submissionId: string, email: string) => {
    setApproving(submissionId)
    try {
      const supabase = createClient()

      // Update KYC status to rejected
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ kyc_status: 'rejected' })
        .eq('id', submissionId)

      if (updateError) {
        console.error('[v0] Error rejecting KYC:', updateError)
        setError('Failed to reject KYC submission')
        return
      }

      console.log('[v0] KYC rejected for:', email)

      // Remove from list
      setSubmissions(submissions.filter((sub) => sub.id !== submissionId))

      // Show success message
      alert(`KYC rejected for ${email}`)
    } catch (err) {
      console.error('[v0] Error rejecting KYC:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject KYC')
    } finally {
      setApproving(null)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error && error.includes('permission')) {
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DashboardLayout profile={profile || { id: userId }}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">KYC Approvals</h1>
          <p className="text-muted-foreground">Review and approve pending KYC submissions</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No pending KYC submissions</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{submission.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{submission.email}</p>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">NIN/BVN:</p>
                      <p className="font-medium">{submission.nin_or_bvn}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone:</p>
                      <p className="font-medium">{submission.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Country:</p>
                      <p className="font-medium">{submission.country}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bank:</p>
                      <p className="font-medium">{submission.bank_name}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Bank Account:</p>
                      <p className="font-medium">{submission.bank_account_name}</p>
                      <p className="text-xs text-muted-foreground">{submission.bank_account_number}</p>
                    </div>
                  </div>

                  {submission.kyc_document_url && (
                    <div className="pt-4 border-t">
                      <a
                        href={submission.kyc_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2 text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        View KYC Document
                      </a>
                    </div>
                  )}

                  <div className="pt-4 border-t flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(submission.id, submission.email)}
                      disabled={approving === submission.id}
                      className="gap-2"
                    >
                      {approving === submission.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(submission.id, submission.email)}
                      disabled={approving === submission.id}
                      className="gap-2"
                    >
                      {approving === submission.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
