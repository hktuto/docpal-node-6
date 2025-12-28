/**
 * Electric Proxy Endpoint
 * 
 * This endpoint acts as a secure proxy between the client and Electric.
 * Benefits:
 * 1. Client doesn't have direct access to Electric
 * 2. Server controls WHERE conditions (client can't bypass)
 * 3. Authentication verified server-side
 * 4. Company/permission filtering enforced
 */

import { requireCompany } from '~~/server/utils/auth/getCurrentUser'

export default defineEventHandler(async (event) => {
  // 1. Verify authentication
  const user = requireCompany(event)
  const companyId = user.company.id

  // 2. Get requested table from query
  const query = getQuery(event)
  const table = query.table as string
  const offset = query.offset as string || '-1'

  if (!table) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameter: table'
    })
  }

  // 3. Validate table is allowed for sync
  const allowedTables = [
    'workspaces',
    'data_tables',
    'data_table_columns',
    'data_table_views',
    // Add more tables as needed
  ]

  if (!allowedTables.includes(table)) {
    throw createError({
      statusCode: 403,
      message: `Table '${table}' is not allowed for sync`
    })
  }

  // 4. Build Electric URL with company filter
  const config = useRuntimeConfig()
  const electricUrl = config.electricUrl  // Server-side only!

  // Build WHERE clause based on table
  let whereClause = ''
  
  // All these tables should be filtered by company_id
  if (['workspaces', 'data_tables', 'data_table_columns', 'data_table_views'].includes(table)) {
    whereClause = `company_id.eq.${companyId}`
  }

  // Build the Electric shape URL
  const electricShapeUrl = new URL(`${electricUrl}/v1/shape`)
  electricShapeUrl.searchParams.set('table', table)
  electricShapeUrl.searchParams.set('offset', offset)
  if (whereClause) {
    electricShapeUrl.searchParams.set('where', whereClause)
  }

  // 5. Add any additional query params from client (like live, cursor, etc)
  const allowedParams = ['live', 'cursor', 'handle']
  for (const param of allowedParams) {
    if (query[param]) {
      electricShapeUrl.searchParams.set(param, query[param] as string)
    }
  }

  console.log('[Electric Proxy] Fetching:', electricShapeUrl.toString())

  // 6. Proxy the request to Electric
  try {
    const response = await fetch(electricShapeUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`Electric returned ${response.status}: ${await response.text()}`)
    }

    // 7. Forward Electric's headers to client
    const headers: Record<string, string> = {}
    const headersToForward = [
      'content-type',
      'electric-cursor',
      'electric-handle',
      'electric-offset',
      'electric-schema',
      'electric-up-to-date',
      'cache-control',
      'etag',
    ]

    headersToForward.forEach(header => {
      const value = response.headers.get(header)
      if (value) {
        headers[header] = value
      }
    })

    // Set response headers
    for (const [key, value] of Object.entries(headers)) {
      setHeader(event, key, value)
    }

    // 8. Return the shape data
    const data = await response.json()
    return data

  } catch (error) {
    console.error('[Electric Proxy] Error:', error)
    throw createError({
      statusCode: 502,
      message: 'Failed to fetch from Electric service'
    })
  }
})

