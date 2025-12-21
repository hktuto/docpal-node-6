/**
 * Email utility for sending emails
 * TODO: Integrate with email service (SendGrid, Resend, etc.)
 * For now, just logs the email to console
 */

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // In development, just log the email
  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 Email (Dev Mode):')
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('Text:', options.text)
    if (options.html) {
      console.log('HTML:', options.html)
    }
    console.log('---')
    return
  }

  // TODO: In production, integrate with actual email service
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'noreply@docpal.com',
  //   to: options.to,
  //   subject: options.subject,
  //   text: options.text,
  //   html: options.html,
  // })

  throw new Error('Email service not configured for production')
}

export async function sendMagicLinkEmail(email: string, token: string, type: 'login' | 'verify_email'): Promise<void> {
  const baseUrl = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const magicLink = `${baseUrl}/auth/verify?token=${token}`

  const subject = type === 'login' ? 'Your Magic Link to Login' : 'Verify Your Email'
  const text = `Click the link below to ${type === 'login' ? 'log in' : 'verify your email'}:\n\n${magicLink}\n\nThis link will expire in 1 hour.`
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${subject}</h2>
      <p>Click the button below to ${type === 'login' ? 'log in to your account' : 'verify your email address'}:</p>
      <p style="margin: 30px 0;">
        <a href="${magicLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          ${type === 'login' ? 'Log In' : 'Verify Email'}
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Or copy and paste this link into your browser:<br>
        <a href="${magicLink}">${magicLink}</a>
      </p>
      <p style="color: #666; font-size: 12px;">
        This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  })
}

export async function sendInviteEmail(email: string, companyName: string, inviteCode: string, invitedByName: string): Promise<void> {
  const baseUrl = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteLink = `${baseUrl}/auth/invite?code=${inviteCode}`

  const subject = `You've been invited to join ${companyName}`
  const text = `${invitedByName} has invited you to join ${companyName} on DocPal.\n\nClick the link below to accept the invitation:\n\n${inviteLink}\n\nThis invitation will expire in 7 days.`
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You've been invited!</h2>
      <p><strong>${invitedByName}</strong> has invited you to join <strong>${companyName}</strong> on DocPal.</p>
      <p style="margin: 30px 0;">
        <a href="${inviteLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Or copy and paste this link into your browser:<br>
        <a href="${inviteLink}">${inviteLink}</a>
      </p>
      <p style="color: #666; font-size: 12px;">
        This invitation will expire in 7 days.
      </p>
    </div>
  `

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  })
}

