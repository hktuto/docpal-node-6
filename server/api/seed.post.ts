import { db } from 'hub:db'
import { users, companies, companyMembers } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { hashPassword } from '~~/server/utils/auth/password'
import { successResponse } from '~~/server/utils/response'

/**
 * Seed endpoint - creates superadmin account and test company
 * 
 * Credentials:
 * Email: admin@docpal.dev
 * Password: admin123
 * 
 * Usage: POST /api/seed
 */
export default defineEventHandler(async (event) => {
  try {
    const SEED_EMAIL = 'admin@docpal.dev'
    const SEED_PASSWORD = 'admin123'
    const SEED_COMPANY_SLUG = 'acme-corp'

    // Check if seed user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, SEED_EMAIL))
      .limit(1)

    let user
    let company
    let isNewUser = false
    let isNewCompany = false

    if (existingUser.length > 0) {
      user = existingUser[0]
      console.log('✓ Seed user already exists:', user.email)
    } else {
      // Create superadmin user with hashed password
      const hashedPassword = await hashPassword(SEED_PASSWORD)
      
      const [newUser] = await db.insert(users).values({
        email: SEED_EMAIL,
        name: 'Super Admin',
        password: hashedPassword,
        emailVerifiedAt: new Date(),
      }).returning()
      
      user = newUser
      isNewUser = true
      console.log('✓ Created seed user:', user.email)
    }

    // Check if seed company exists
    const existingCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, SEED_COMPANY_SLUG))
      .limit(1)

    if (existingCompany.length > 0) {
      company = existingCompany[0]
      console.log('✓ Seed company already exists:', company.name)
    } else {
      // Create seed company
      const [newCompany] = await db.insert(companies).values({
        name: 'Acme Corporation',
        slug: SEED_COMPANY_SLUG,
        description: 'Test company for development',
        createdBy: user.id,
      }).returning()
      
      company = newCompany
      isNewCompany = true
      console.log('✓ Created seed company:', company.name)
    }

    // Check if user is already a member of the company
    const existingMembership = await db
      .select()
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.userId, user.id),
          eq(companyMembers.companyId, company.id)
        )
      )
      .limit(1)

    if (existingMembership.length === 0) {
      // Add user as owner of the company
      await db.insert(companyMembers).values({
        userId: user.id,
        companyId: company.id,
        role: 'owner',
      })
      console.log('✓ Added user as company owner')
    } else {
      console.log('✓ User is already a member of the company')
    }

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
      credentials: {
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
      },
      isNewData: isNewUser || isNewCompany,
    }, {
      message: isNewUser || isNewCompany 
        ? 'Seed data created successfully' 
        : 'Seed data already exists',
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to seed data',
      message: error.message,
    })
  }
})

