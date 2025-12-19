/**
 * Seed script to create initial user and company data
 * This script calls the seed API endpoint
 */

async function seed() {
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const seedUrl = `${baseUrl}/api/seed`

  try {
    console.log('🌱 Starting seed process...')
    console.log(`📡 Calling: ${seedUrl}`)

    const response = await fetch(seedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Seed failed: ${error}`)
    }

    const result = await response.json()
    
    console.log('✅ Seed completed successfully!')
    console.log('📊 Seed data:')
    console.log(JSON.stringify(result.data, null, 2))
    
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Seed failed:', error.message)
    console.error('\n💡 Make sure:')
    console.error('   1. Docker containers are running (pnpm docker:up)')
    console.error('   2. Database migrations are applied (pnpm db:migrate)')
    console.error('   3. Dev server is running (pnpm dev)')
    process.exit(1)
  }
}

seed()

