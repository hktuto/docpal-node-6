import { db } from 'hub:db'
import { apps } from 'hub:db:schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // For Phase 1: use dummy company ID
  const dummyCompanyId = '00000000-0000-0000-0000-000000000001'
  
  const [app] = await db.insert(apps).values({
    name: body.name,
    icon: body.icon,
    description: body.description,
    companyId: dummyCompanyId,
  }).returning()
  
  return app
})

