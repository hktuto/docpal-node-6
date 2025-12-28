import { db } from 'hub:db'
import { users, companies, companyMembers } from 'hub:db:schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { hashPassword } from '~~/server/utils/auth/password'
import { successResponse } from '~~/server/utils/response'
import { seedAdvancedTemplate } from '~~/server/utils/seedTemplates'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Seed endpoint - creates superadmin account, test company, and advanced CRM template
 * 
 * Credentials:
 * Email: admin@docpal.dev
 * Password: admin123
 * 
 * Includes:
 * - User & Company
 * - Advanced CRM Template (5 tables: Companies, Contacts, Deals, Activities, Stats)
 * - Demonstrates: Relations, Lookups, Rollups, Formulas
 * - Sample data included
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
        id: generateUUID(),
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
        id: generateUUID(),
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
        id: generateUUID(),
        userId: user.id,
        companyId: company.id,
        role: 'owner',
      })
      console.log('✓ Added user as company owner')
    } else {
      console.log('✓ User is already a member of the company')
    }

    // Seed advanced CRM template
    console.log('\n📦 Seeding Advanced CRM template...')
    const templateResult = await seedAdvancedTemplate({ skipExisting: true })

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
      templates: {
        created: templateResult.created,
        skipped: templateResult.skipped,
        total: templateResult.templates.length,
      },
      credentials: {
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
      },
      isNewData: isNewUser || isNewCompany || templateResult.created > 0,
    }, {
      message: isNewUser || isNewCompany || templateResult.created > 0
        ? 'Seed data created successfully' 
        : 'Seed data already exists',
    })

    // Setup Electric publication after seeding (idempotent)
    // This ensures Electric sync works after seeding
    try {
      console.log('[Seed] Setting up Electric publication...')
      await db.execute(sql`DROP PUBLICATION IF EXISTS electric_publication`)
      
      // Create publication for all tables that need syncing
      await db.execute(sql`
        CREATE PUBLICATION electric_publication FOR TABLE 
          users,
          companies,
          workspaces,
          data_tables,
          data_table_columns
      `)
      
      // Grant replication permission (ignore if already set)
      try {
        await db.execute(sql`ALTER USER docpal WITH REPLICATION`)
      } catch {
        // Already has permission or insufficient privileges
      }
      
      console.log('✓ Electric publication created for: users, companies, workspaces, data_tables, data_table_columns')
    } catch (electricError) {
      console.warn('⚠️  Could not create Electric publication:', electricError)
      // Don't fail the seed if Electric setup fails
    }

    return result
  } catch (error: any) {
    console.error('Seed error:', error)
    
    // Check if error is due to missing tables
    if (error.message?.includes('does not exist') || 
        error.message?.includes('relation') ||
        error.cause?.message?.includes('does not exist') ||
        error.cause?.message?.includes('relation')) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database tables do not exist',
        message: 'Please run migrations first: pnpm db:migrate',
      })
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to seed data',
      message: error.message,
    })
  }
})

