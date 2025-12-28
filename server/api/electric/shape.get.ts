/**
 * Electric Proxy Endpoint
 * 
 * Following Electric's official proxy auth pattern:
 * https://electric-sql.com/docs/guides/auth#proxy-auth
 * 
 * This endpoint acts as a secure proxy between the client and Electric.
 * Benefits:
 * 1. Client doesn't have direct access to Electric
 * 2. Server controls WHERE conditions (client can't bypass)
 * 3. Authentication verified server-side
 * 4. Company/permission filtering enforced
 */

import { requireCompany } from '~~/server/utils/auth/getCurrentUser'

// Electric protocol query parameters that should be passed through
// Source: @electric-sql/client ELECTRIC_PROTOCOL_QUERY_PARAMS
const ELECTRIC_PROTOCOL_PARAMS = [
  'offset',
  'handle',
  'live',
  'cursor',
  'replica', 
  'table',
  'where',
]

export default defineEventHandler(async (event) => {
  // 1. Verify authentication
  const user = requireCompany(event)
  const companyId = user.company.id

  // 2. Get request URL and params
  const requestUrl = getRequestURL(event)
  const query = getQuery(event)
  const table = query.table as string

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
  const originUrl = new URL(`${electricUrl}/v1/shape`)

  // Only pass through Electric protocol parameters
  for (const [key, value] of Object.entries(query)) {
    if (ELECTRIC_PROTOCOL_PARAMS.includes(key)) {
      originUrl.searchParams.set(key, value as string)
    }
  }

  // Set table server-side (not from client params - security)
  originUrl.searchParams.set('table', table)

  // Build WHERE clause based on table and set it server-side
  // All these tables should be filtered by company_id
  if (['workspaces', 'data_tables', 'data_table_columns', 'data_table_views'].includes(table)) {
    // Electric WHERE syntax: field='value' (single quotes for string literals)
    originUrl.searchParams.set('where', `company_id='${companyId}'`)
  }

  console.log('[Electric Proxy] Fetching:', originUrl.toString())

  // 5. Proxy the request to Electric
  try {
    const response = await fetch(originUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Electric Proxy] Electric error:', response.status, errorText)
      throw createError({
        statusCode: response.status,
        message: errorText || `Electric returned ${response.status}`
      })
    }

    // 6. Process response headers
    // Important: Fetch decompresses the body but doesn't remove the
    // content-encoding & content-length headers which would break decoding
    // in the browser. See: https://github.com/whatwg/fetch/issues/1729
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length')

    // Add Vary header for proper cache invalidation when auth changes
    // This ensures different users get different cached responses
    responseHeaders.set('Vary', 'Cookie, Authorization')

    // Forward Electric-specific headers
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

    for (const headerName of headersToForward) {
      const value = responseHeaders.get(headerName)
      if (value) {
        setHeader(event, headerName, value)
      }
    }

    // Set Vary header
    setHeader(event, 'Vary', 'Cookie, Authorization')

    // 7. Return the shape data
    const data = await response.json()
    return data

  } catch (error: any) {
    console.error('[Electric Proxy] Error:', error)
    
    // If it's already an H3 error, re-throw it
    if (error.statusCode) {
      throw error
    }

    // Otherwise, return a 502 Bad Gateway
    throw createError({
      statusCode: 502,
      message: 'Failed to fetch from Electric service'
    })
  }
})

