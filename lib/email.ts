import nodemailer from "nodemailer"

// Create a transporter using SMTP configurations
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendLunchNotification({
  to,
  date,
  totalExpense,
  presentNames,
  payingNames,
  orgName
}: {
  to: string[]
  date: string
  totalExpense: number
  presentNames: string[]
  payingNames: string[]
  orgName: string
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP configuration (SMTP_HOST/SMTP_USER/SMTP_PASS) is incomplete. Email notification skipped.")
    return { success: false, error: "SMTP configuration is incomplete" }
  }

  if (to.length === 0) return { success: true }

  try {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const htmlContent = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px;">🍲</span>
          <h1 style="font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; margin: 8px 0 0 0; color: #0f172a;">Lunch Logged!</h1>
          <p style="font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 4px 0 0 0;">${orgName}</p>
        </div>
        
        <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; width: 40%;">Date</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Total Expense</td>
              <td style="padding: 8px 0; font-size: 16px; font-weight: 900; color: #10b981;">PKR ${totalExpense.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; vertical-align: top;">Present</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #334155;">
                ${presentNames.map(name => `<span style="display: inline-block; background-color: #e2e8f0; border-radius: 6px; padding: 2px 8px; margin: 2px; font-size: 12px; font-weight: 700; color: #475569;">${name}</span>`).join(" ")}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; vertical-align: top;">Paid By</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #334155;">
                ${payingNames.map(name => `<span style="display: inline-block; background-color: #d1fae5; border-radius: 6px; padding: 2px 8px; margin: 2px; font-size: 12px; font-weight: 700; color: #065f46;">${name}</span>`).join(" ")}
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${appUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">View Dashboard</a>
        </div>

        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <p style="font-size: 11px; font-weight: 500; color: #94a3b8; margin: 0;">Lunch Mate - Keep track of your team's lunch expenses easily.</p>
        </div>
      </div>
    `

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com"

    const mailOptions = {
      from: `Lunch Mate <${fromAddress}>`,
      to: to.join(", "), // Nodemailer expects comma-separated string for multiple recipients
      subject: `🍲 Lunch Logged - ${orgName} (${formattedDate})`,
      html: htmlContent,
    }

    const info = await transporter.sendMail(mailOptions)
    return { success: true, data: info }
  } catch (error: any) {
    console.error("Failed to send lunch notification email:", error)
    return { success: false, error: error.message }
  }
}
