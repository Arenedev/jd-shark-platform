"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, Check, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [newAssociate, setNewAssociate] = useState<any>(null)
  const [kycSubmissions, setKycSubmissions] = useState<any[]>([])
  const [kycLoading, setKycLoading] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  })

  // Load KYC submissions when component mounts
  useEffect(() => {
    loadKycSubmissions()
  }, [])

  const loadKycSubmissions = async () => {
    setKycLoading(true)
    try {
      const response = await fetch("/api/admin/kyc-submissions")
      const data = await response.json()
      if (response.ok) {
        setKycSubmissions(data.submissions || [])
      } else {
        console.error("[v0] Failed to load KYC submissions:", data.error)
      }
    } catch (err) {
      console.error("[v0] Error loading KYC submissions:", err)
    } finally {
      setKycLoading(false)
    }
  }

  const handleApproveKyc = async (userId: string) => {
    setApprovalLoading(userId)
    try {
      const response = await fetch("/api/admin/approve-kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: "approved" }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to approve KYC: ${data.error}`)
        return
      }

      alert("KYC approved successfully")
      loadKycSubmissions()
    } catch (err) {
      console.error("[v0] Error approving KYC:", err)
      alert("Error approving KYC")
    } finally {
      setApprovalLoading(null)
    }
  }

  const handleRejectKyc = async (userId: string) => {
    setApprovalLoading(userId)
    try {
      const response = await fetch("/api/admin/approve-kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: "rejected" }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Failed to reject KYC: ${data.error}`)
        return
      }

      alert("KYC rejected successfully")
      loadKycSubmissions()
    } catch (err) {
      console.error("[v0] Error rejecting KYC:", err)
      alert("Error rejecting KYC")
    } finally {
      setApprovalLoading(null)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const response = await fetch("/api/admin/create-associate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create associate account")
        return
      }

      setSuccess(true)
      setNewAssociate(data.user)
      setFormData({ email: "", password: "", fullName: "", phone: "" })

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(false)
        setNewAssociate(null)
      }, 5000)
    } catch (err) {
      console.error("[v0] Error creating associate:", err)
      setError("An error occurred while creating the associate account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage system operations and user accounts</p>
        </div>

        <Tabs defaultValue="create-associate" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="create-associate">Create Associate</TabsTrigger>
            <TabsTrigger value="kyc-approval">KYC Approvals</TabsTrigger>
          </TabsList>

          <TabsContent value="create-associate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Associate Account</CardTitle>
                <CardDescription>
                  Create a new associate account without requiring a referral code. Associates can then use their unique
                  referral code to refer other associates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && newAssociate && (
                  <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-400">
                      Associate account created successfully!
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+234..."
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Associate Account"
                    )}
                  </Button>
                </form>

                {newAssociate && (
                  <div className="mt-6 space-y-3 border-t pt-6">
                    <h3 className="font-semibold text-foreground">New Associate Details</h3>
                    <div className="space-y-2 rounded-lg bg-muted p-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Name:</span>
                        <p className="font-medium text-foreground">{newAssociate.fullName}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <p className="font-medium text-foreground">{newAssociate.email}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Account Type:</span>
                        <p className="font-medium text-foreground capitalize">{newAssociate.baseStructure}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Referral Code:</span>
                        <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
                          {newAssociate.referralCode}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc-approval" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>KYC Approval Management</CardTitle>
                <CardDescription>Review and approve pending KYC submissions from users</CardDescription>
              </CardHeader>
              <CardContent>
                {kycLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : kycSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No pending KYC submissions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {kycSubmissions.map((submission: any) => (
                      <Card key={submission.id} className="border">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Name</p>
                              <p className="font-medium">{submission.full_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Email</p>
                              <p className="font-medium">{submission.email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">NIN/BVN</p>
                              <p className="font-medium">{submission.nin_or_bvn || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Phone</p>
                              <p className="font-medium">{submission.phone || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Bank Account</p>
                              <p className="font-medium">{submission.bank_account_number || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <p className="font-medium capitalize">{submission.kyc_status}</p>
                            </div>
                          </div>
                          {submission.kyc_document_url && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground">Document</p>
                              <a
                                href={submission.kyc_document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View Document
                              </a>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApproveKyc(submission.id)}
                              disabled={approvalLoading === submission.id}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {approvalLoading === submission.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <Check className="mr-2 h-4 w-4" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleRejectKyc(submission.id)}
                              disabled={approvalLoading === submission.id}
                              variant="outline"
                              className="flex-1"
                            >
                              {approvalLoading === submission.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <X className="mr-2 h-4 w-4" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
