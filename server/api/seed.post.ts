import { db } from 'hub:db'
import { users, companies } from 'hub:db:schema'
import { eq } from 'drizzle-orm'

// Dummy company ID used in the create app API
const DUMMY_COMPANY_ID = '00000000-0000-0000-0000-000000000001'
const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000001'

export default defineEventHandler(async (event) => {
  try {
    // Check if seed data already exists
    const existingCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.id, DUMMY_COMPANY_ID))
      .limit(1)

    if (existingCompany.length > 0) {
      return {
        success: true,
        message: 'Seed data already exists',
        data: {
          userId: existingCompany[0].createdBy || DUMMY_USER_ID,
          companyId: DUMMY_COMPANY_ID,
        },
      }
    }

    // Check if user exists, if not create it
    let userId = DUMMY_USER_ID
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, DUMMY_USER_ID))
      .limit(1)

    if (existingUser.length === 0) {
      // Create seed user
      // Note: In production, you'd hash the password properly
      const [user] = await db.insert(users).values({
        id: DUMMY_USER_ID,
        email: 'dev@docpal.local',
        name: 'Development User',
        password: 'dev_password_hash_here', // In Phase 2, this will be properly hashed
        emailVerifiedAt: new Date(),
      }).returning()
      userId = user.id
    } else {
      userId = existingUser[0].id
    }

    // Create seed company
    const [company] = await db.insert(companies).values({
      id: DUMMY_COMPANY_ID,
      name: 'Development Company',
      slug: 'dev-company',
      description: 'Development company for testing',
      createdBy: userId,
    }).returning()

    return {
      success: true,
      message: 'Seed data created successfully',
      data: {
        userId,
        companyId: company.id,
        companyName: company.name,
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to seed data',
      message: error.message,
    })
  }
})

