import nodemailer from "nodemailer"

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@jdshark.com"

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("Email service not configured - emails will not be sent")
    return null
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })

  return transporter
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const transport = getTransporter()
  if (!transport) {
    console.log("Email skipped (not configured):", { to, subject })
    return
  }

  try {
    await transport.sendMail({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error("Failed to send email:", error)
    throw error
  }
}

export function getWalletFundingEmailTemplate(userName: string, amount: number) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f5f5f5; padding: 20px; }
          .footer { background-color: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }
          .amount { font-size: 32px; color: #d4a574; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Wallet Funding Successful</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Your wallet has been successfully funded!</p>
            <p>Amount: <span class="amount">₦${amount.toLocaleString()}</span></p>
            <p>You can now use your wallet balance to invest in portfolios and earn passive income.</p>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="color: #1e3a5f; text-decoration: none;">Go to Dashboard</a></p>
          </div>
          <div class="footer">
            <p>JD SHARK Investment Platform | © 2025</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getWithdrawalRequestEmailTemplate(userName: string, amount: number, status: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f5f5f5; padding: 20px; }
          .footer { background-color: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }
          .status { font-size: 18px; font-weight: bold; color: #d4a574; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Withdrawal Request ${status === "approved" ? "Approved" : "Received"}</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Your withdrawal request has been <span class="status">${status.toUpperCase()}</span>.</p>
            <p>Amount: <strong>₦${amount.toLocaleString()}</strong></p>
            ${status === "approved" ? "<p>Your funds will be transferred to your account within 24 hours.</p>" : "<p>Your request is being reviewed. You'll receive an update soon.</p>"}
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/withdrawals" style="color: #1e3a5f; text-decoration: none;">Check Status</a></p>
          </div>
          <div class="footer">
            <p>JD SHARK Investment Platform | © 2025</p>
          </div>
        </div>
      </body>
    </html>
  `
}
