# Environment Variable Update

## ✅ Important Change: Electric URL is Now Server-Side Only

### Why This Change?

With the **proxy authentication pattern**, the client never accesses Electric directly. Therefore, the Electric URL should be **server-side only** and not exposed to the client.

### What Changed

#### Before (Exposed to Client)
```typescript
// nuxt.config.ts
runtimeConfig: {
  public: {
    electricUrl: process.env.NUXT_PUBLIC_ELECTRIC_URL  // ❌ Exposed to client
  }
}
```

#### After (Server-Side Only)
```typescript
// nuxt.config.ts
runtimeConfig: {
  electricUrl: process.env.ELECTRIC_URL,  // ✅ Server-side only
  public: {
    // No Electric URL needed!
  }
}
```

### Update Your .env File

**Old variable** (remove this):
```bash
NUXT_PUBLIC_ELECTRIC_URL=http://localhost:30000
```

**New variable** (use this):
```bash
ELECTRIC_URL=http://localhost:30000
```

### Quick Update Command

```bash
# Remove old variable and add new one
cat > .env << 'EOF'
ELECTRIC_URL=http://localhost:30000
EOF
```

### Why This is Better

1. **Security**: Electric URL not visible in client JavaScript
2. **Flexibility**: Can change Electric URL without client updates
3. **Separation**: Clear distinction between server and client config
4. **Best Practice**: Follows principle of least exposure

### Verify the Change

```bash
# Restart dev server
pnpm dev

# Check your browser console
# You should NOT see ELECTRIC_URL anywhere in the client code
```

### What Client Sees

**Before**:
```javascript
// Client could see:
window.__NUXT__.config.public.electricUrl
// "http://localhost:30000"  ❌ Exposed!
```

**After**:
```javascript
// Client sees:
window.__NUXT__.config.public
// {}  ✅ No Electric URL!
```

### Server Still Has Access

```typescript
// server/api/electric/shape.get.ts
const config = useRuntimeConfig()
const electricUrl = config.electricUrl  // ✅ Available server-side
```

### For Production

Set the environment variable in your hosting platform:

**Vercel**:
```bash
ELECTRIC_URL=http://electric-service:3000
```

**Docker**:
```yaml
# docker-compose.yml
environment:
  ELECTRIC_URL: http://electric:3000
```

**AWS/GCP**:
```bash
# Add to container environment
ELECTRIC_URL=http://internal-electric-service:3000
```

### Migration Checklist

- [ ] Remove `NUXT_PUBLIC_ELECTRIC_URL` from .env
- [ ] Add `ELECTRIC_URL` to .env
- [ ] Restart dev server
- [ ] Verify POC page still works
- [ ] Check browser console (no Electric URL visible)
- [ ] Update production environment variables

### Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| Client can see URL | ❌ Yes | ✅ No |
| Exposed in JavaScript | ❌ Yes | ✅ No |
| Can be inspected | ❌ Yes | ✅ No |
| Server has access | ✅ Yes | ✅ Yes |
| Production secure | ⚠️ Depends | ✅ Yes |

This change makes your ElectricSQL setup more secure and production-ready! 🔒

