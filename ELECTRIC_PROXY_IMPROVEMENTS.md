# Electric Proxy Improvements

Following the official Electric SQL proxy auth pattern:
https://electric-sql.com/docs/guides/auth#proxy-auth

## Changes Made

### 1. **WHERE Clause Syntax** ✅
```typescript
// Before
whereClause = `company_id="${companyId}"`

// After (with spaces - standard SQL)
originUrl.searchParams.set('where', `company_id = "${companyId}"`)
```

### 2. **Electric Protocol Parameters** ✅
Now using the official list of Electric protocol params:
```typescript
const ELECTRIC_PROTOCOL_PARAMS = [
  'offset',
  'handle',
  'live',
  'cursor',
  'replica',
  'table',
  'where',
]
```

Only these params are passed through to Electric.

### 3. **Content-Encoding Headers** ✅
**Critical Fix**: Fetch decompresses response bodies but doesn't remove compression headers, which breaks browser decoding.

```typescript
// Remove problematic headers
responseHeaders.delete('content-encoding')
responseHeaders.delete('content-length')
```

Source: https://github.com/whatwg/fetch/issues/1729

### 4. **Vary Header for Cache Invalidation** ✅
Added `Vary` header to ensure proper cache isolation per user:

```typescript
setHeader(event, 'Vary', 'Cookie, Authorization')
```

**Why this matters**:
- Without `Vary`, browsers/CDNs cache responses by URL only
- User A's data could be served from cache to User B after logout
- `Vary` includes auth context in cache key → proper isolation

### 5. **Error Handling** ✅
Now properly forwards Electric's error status codes:
```typescript
if (!response.ok) {
  throw createError({
    statusCode: response.status,  // Forward actual status (401, 403, etc)
    message: errorText
  })
}
```

### 6. **Better Comments & Documentation** ✅
Added references to:
- Official Electric docs
- GitHub issues explaining quirks
- Security considerations

## Security Benefits

1. **Server-side WHERE clauses**: Client can't modify filters
2. **Table whitelist**: Only approved tables can be synced
3. **Auth verification**: Every request checks authentication
4. **Company isolation**: Users only see their company's data
5. **Cache isolation**: `Vary` header prevents cross-user cache leaks

## Testing

Refresh the POC pages:
```
http://localhost:3001/electric-poc
http://localhost:3001/electric-shared-poc
```

Should now work correctly with proper Electric protocol! 🎉

