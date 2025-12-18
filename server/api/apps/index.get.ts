import { db } from 'hub:db'
import { apps } from 'hub:db:schema'

export default defineEventHandler(async (event) => {
  const allApps = await db.select().from(apps)
  return allApps
})

