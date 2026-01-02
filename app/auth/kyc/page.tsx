"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"

export default function KYCPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nin_or_bvn: "",
    phone: "",
    country: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocumentFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!documentFile) {
      setError("Please upload a valid ID document")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Upload document to storage
      const fileName = `${user.id}-${Date.now()}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(`kyc/${fileName}`, documentFile)

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("kyc-documents").getPublicUrl(`kyc/${fileName}`)

      // Update profile with KYC info
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          nin_or_bvn: formData.nin_or_bvn,
          phone: formData.phone,
          country: formData.country,
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number,
          bank_account_name: formData.bank_account_name,
          kyc_document_url: publicUrl,
          kyc_status: "pending",
        })
        .eq("id", user.id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "KYC submission failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">KYC Submitted</CardTitle>
            <CardDescription>Your KYC documents have been submitted for verification</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your documents will be reviewed within 24 hours. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">KYC Verification</CardTitle>
          <CardDescription>Complete your Know Your Customer verification to unlock all features</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nin_or_bvn">NIN / BVN</Label>
                  <Input
                    id="nin_or_bvn"
                    name="nin_or_bvn"
                    placeholder="Your NIN or BVN"
                    value={formData.nin_or_bvn}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+234 XXX XXXX XXXX"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  placeholder="Nigeria"
                  value={formData.country}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Bank Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Bank Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    name="bank_name"
                    placeholder="Your Bank"
                    value={formData.bank_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    name="bank_account_number"
                    placeholder="0123456789"
                    value={formData.bank_account_number}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bank_account_name">Account Name</Label>
                <Input
                  id="bank_account_name"
                  name="bank_account_name"
                  placeholder="Your Full Name as on Bank Account"
                  value={formData.bank_account_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Document Upload */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">ID Document</h3>
              <div>
                <Label htmlFor="document">Upload ID Document (PDF or Image)</Label>
                <Input
                  id="document"
                  name="document"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  required
                />
                {documentFile && <p className="text-sm text-green-600 mt-2">File selected: {documentFile.name}</p>}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Submitting...
                </>
              ) : (
                "Submit KYC"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
