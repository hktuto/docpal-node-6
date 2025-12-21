import { createMagicLink } from '~~/server/utils/auth/magicLink'
import { sendMagicLinkEmail } from '~~/server/utils/email'
import { successResponse } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body

  // Validate input
  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required',
    })
  }

  // Create magic link
  const magicLink = await createMagicLink(email.toLowerCase(), 'login')

  // Send email
  try {
    await sendMagicLinkEmail(email, magicLink.token, 'login')
  } catch (error) {
    console.error('Error sending magic link email:', error)
    // Don't fail the request if email fails in dev mode
    if (process.env.NODE_ENV === 'production') {
      throw createError({
        statusCode: 500,
        message: 'Failed to send magic link email',
      })
    }
  }

  return successResponse({
    message: 'Magic link sent to your email',
  })
})

