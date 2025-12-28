# ElectricSQL Migration Strategy

## 🎯 The Challenge

In production, when you:
1. Add a column to a Drizzle schema
2. Run `pnpm db:migrate` → creates new migration file
3. Migration runs on PostgreSQL

**Question**: How does PGlite know to update?

Currently:
- ❌ Client has old schema
- ❌ Data syncs with new columns
- ❌ Schema mismatch → errors or missing data

## 💡 Solution Options

### Option A: Apply Drizzle Migrations Directly

**Concept**: Read migration SQL files and apply them to PGlite

```typescript
// Fetch migration files from server
const migrations = await $fetch('/api/electric/migrations')

// Apply each migration in order
for (const migration of migrations) {
  await db.exec(migration.sql)
}
```

**Pros**:
- True incremental migrations
- Matches PostgreSQL exactly
- Can handle complex schema changes

**Cons**:
- ❌ PGlite doesn't support all PostgreSQL features:
  - No `gen_random_uuid()`
  - No `DEFAULT now()`
  - Limited constraint support
- ❌ Need to parse and adapt SQL
- ❌ Need migration tracking table
- ❌ Complex to implement
- ❌ Migration files may have breaking changes

---

### Option B: Version-Based Schema Regeneration ⭐ (RECOMMENDED)

**Concept**: Track migration version, regenerate schemas when version changes

```typescript
// 1. Check current migration version
const localVersion = localStorage.getItem('electric_migration_version')
const serverVersion = await $fetch('/api/electric/version')

// 2. If version changed, regenerate all tables
if (localVersion !== serverVersion.tag) {
  console.log('Migration detected, regenerating schemas...')
  
  // Drop all tables
  await dropAllTables()
  
  // Fetch fresh schemas (reflects latest migration)
  const schemas = await getElectricSchemas()
  
  // Recreate tables
  for (const [table, schema] of Object.entries(schemas)) {
    await db.exec(schema)
  }
  
  // Resync all data
  await resyncAllTables()
  
  // Update version
  localStorage.setItem('electric_migration_version', serverVersion.tag)
}
```

**Pros**:
- ✅ Simple and reliable
- ✅ Always in sync with PostgreSQL
- ✅ No need to parse migration files
- ✅ Works with all schema changes
- ✅ Clean slate after migration

**Cons**:
- ⚠️ Re-downloads all data (bandwidth)
- ⚠️ Brief loading time during migration

**Verdict**: This is perfect for our use case because:
- Read-only sync (no local writes to preserve)
- Schema changes are infrequent
- Users expect a brief loading after updates
- Already doing drop+recreate for dynamic tables

---

### Option C: Hybrid - Selective Updates

**Concept**: Track version, but try to be smart about updates

```typescript
// Only recreate tables that changed
const changedTables = await detectChangedTables(oldVersion, newVersion)

for (const table of changedTables) {
  await dropTable(table)
  await createTable(table)
  await syncTable(table)
}
```

**Pros**:
- More efficient than full regeneration
- Only affected tables resynced

**Cons**:
- ❌ Complex to determine which tables changed
- ❌ Foreign key dependencies make it tricky
- ❌ Not worth the complexity

---

## 🎯 Recommended Implementation: Option B

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Developer: Add column to Drizzle schema                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ pnpm db:migrate
                 ▼
┌─────────────────────────────────────────────────────────┐
│ New migration file created                              │
│ server/db/migrations/postgresql/0001_new_migration.sql  │
│ meta/_journal.json updated with new tag                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Server restart / hot reload
                 ▼
┌─────────────────────────────────────────────────────────┐
│ API: GET /api/electric/version                          │
│ Returns: { version: "0001_new_migration" }              │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Client checks on app load
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Client: Compare versions                                │
│ localStorage: "0000_plain_wong"                          │
│ Server:       "0001_new_migration" ← DIFFERENT!          │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Trigger migration
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Client Migration Process                                │
│ 1. Show "Updating database..." message                  │
│ 2. Drop all Electric tables                             │
│ 3. Fetch fresh schemas from /api/electric/schemas       │
│ 4. Recreate tables                                      │
│ 5. Resync all data                                      │
│ 6. Update localStorage version                          │
│ 7. Ready! ✅                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Plan

### 1. Create Version API Endpoint

```typescript
// server/api/electric/version.get.ts
export default defineEventHandler(async () => {
  // Read _journal.json to get current migration version
  const journalPath = resolve('./server/db/migrations/postgresql/meta/_journal.json')
  const journal = JSON.parse(await fs.readFile(journalPath, 'utf-8'))
  
  // Get latest migration
  const latest = journal.entries[journal.entries.length - 1]
  
  return successResponse({
    version: latest.tag,         // "0000_plain_wong"
    index: latest.idx,           // 0
    timestamp: latest.when,      // 1766807397179
    dialect: journal.dialect,    // "postgresql"
  })
})
```

### 2. Create Migration Manager Composable

```typescript
// app/composables/useElectricMigrations.ts
export const useElectricMigrations = () => {
  const STORAGE_KEY = 'electric_migration_version'
  
  const checkAndMigrate = async () => {
    try {
      // 1. Get local version
      const localVersion = localStorage.getItem(STORAGE_KEY)
      
      // 2. Get server version
      const { version: serverVersion } = await $fetch('/api/electric/version')
      
      // 3. Check if migration needed
      if (localVersion && localVersion !== serverVersion) {
        console.log('[Electric Migration] Version changed:', {
          from: localVersion,
          to: serverVersion
        })
        
        // 4. Run migration
        await runMigration(serverVersion)
        
        // 5. Update stored version
        localStorage.setItem(STORAGE_KEY, serverVersion)
        
        return true // Migrated
      }
      
      // First run or no change
      if (!localVersion) {
        localStorage.setItem(STORAGE_KEY, serverVersion)
      }
      
      return false // No migration needed
    } catch (error) {
      console.error('[Electric Migration] Failed:', error)
      throw error
    }
  }
  
  const runMigration = async (newVersion: string) => {
    const { getDB } = useSecureElectricSync()
    const db = await getDB()
    
    // Show user-friendly message
    console.log('[Electric Migration] Updating database schema...')
    
    // 1. Get list of Electric tables
    const tables = ['users', 'companies', 'workspaces', 'data_tables', 'data_table_columns']
    
    // 2. Drop all tables
    for (const table of tables) {
      try {
        await db.exec(`DROP TABLE IF EXISTS "${table}" CASCADE`)
        console.log(`[Electric Migration] Dropped table: ${table}`)
      } catch (err) {
        console.warn(`[Electric Migration] Failed to drop ${table}:`, err)
      }
    }
    
    // 3. Clear sync state (force resync)
    // This depends on how your sync state is managed
    localStorage.removeItem('electric_sync_state')
    
    // 4. Fetch fresh schemas
    const { getElectricSchemas } = await import('~/config/electric-schemas')
    const schemas = await getElectricSchemas()
    
    // 5. Recreate tables
    for (const [table, schema] of Object.entries(schemas)) {
      await db.exec(schema)
      console.log(`[Electric Migration] Created table: ${table}`)
    }
    
    console.log('[Electric Migration] Schema migration complete!')
    
    // Note: Data resync will happen automatically when composables reinitialize
  }
  
  return {
    checkAndMigrate,
    runMigration
  }
}
```

### 3. Integrate into App Plugin

```typescript
// app/plugins/electric-migrations.client.ts
export default defineNuxtPlugin(async () => {
  const { checkAndMigrate } = useElectricMigrations()
  
  try {
    // Check for migrations on app load
    const didMigrate = await checkAndMigrate()
    
    if (didMigrate) {
      console.log('[Electric] Migration completed, reloading page...')
      
      // Optional: Reload page to reinitialize everything
      // window.location.reload()
      
      // Or: Use Nuxt's router to force re-render
      // navigateTo(useRoute().fullPath, { replace: true })
    }
  } catch (error) {
    console.error('[Electric] Migration check failed:', error)
    // Don't block app load
  }
})
```

### 4. Add User-Friendly UI

```vue
<!-- app/components/electric/MigrationBanner.vue -->
<template>
  <div v-if="isMigrating" class="fixed top-0 left-0 right-0 bg-blue-500 text-white p-4 z-50">
    <div class="flex items-center justify-center space-x-3">
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
      <span>Updating database schema... Please wait.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const isMigrating = ref(false)

// Listen for migration events
onMounted(() => {
  window.addEventListener('electric:migration:start', () => {
    isMigrating.value = true
  })
  
  window.addEventListener('electric:migration:complete', () => {
    isMigrating.value = false
  })
})
</script>
```

---

## 🔄 Migration Flow Examples

### Example 1: User Opens App After Schema Change

```
1. User opens app
2. Plugin runs: checkAndMigrate()
3. localStorage: "0000_plain_wong"
4. Server:       "0001_add_user_roles"
5. Different! → Run migration
6. Show banner: "Updating database schema..."
7. Drop tables → Recreate → Resync
8. Banner hides
9. App works with new schema! ✅
```

### Example 2: Multiple Migrations

```
Developer:
  1. Add column → pnpm db:migrate → "0001_add_column"
  2. Add table → pnpm db:migrate → "0002_add_table"
  3. Deploy to production

User opens app:
  1. Local: "0000_plain_wong"
  2. Server: "0002_add_table" (latest)
  3. Migration runs once
  4. All changes applied together
```

### Example 3: No Migration Needed

```
1. User opens app
2. localStorage: "0001_add_user_roles"
3. Server:       "0001_add_user_roles"
4. Same! → No migration needed
5. App loads normally
```

---

## 🎯 Benefits

### For Developers
- ✅ Write Drizzle schema as usual
- ✅ Run migrations as usual
- ✅ No extra work!
- ✅ Client automatically stays in sync

### For Users
- ✅ Automatic schema updates
- ✅ No manual steps
- ✅ Brief one-time update on version change
- ✅ Always have latest features

### For Production
- ✅ Safe schema evolution
- ✅ No stale client schemas
- ✅ Handles breaking changes
- ✅ Clean slate after updates

---

## ⚠️ Trade-offs

### Bandwidth
- Re-downloads all data on migration
- **Mitigation**: Schema changes are infrequent
- **Mitigation**: Can compress sync data

### Downtime
- Brief loading during migration (few seconds)
- **Mitigation**: Show clear UI feedback
- **Mitigation**: Background tabs stay functional

### Loss of Local Changes
- Not applicable! (Read-only sync)
- Writes go through API → safe in PostgreSQL

---

## 🚀 Advanced Optimizations

### 1. Selective Table Recreation

```typescript
// Only recreate tables that changed
const changedTables = await detectChangedTables(oldVersion, newVersion)

// But this adds complexity...
// Is it worth it for infrequent migrations?
```

### 2. Background Migration

```typescript
// Don't block app load
checkAndMigrate().then(() => {
  // Migration complete
})

// But what if user tries to use outdated data?
```

### 3. Version Checking Frequency

```typescript
// Check on app load
// Check periodically (every hour?)
// Check on tab focus
```

### 4. Fallback to API

```typescript
// If migration fails, fall back to API calls
if (migrationFailed) {
  useApiInsteadOfElectric()
}
```

---

## 📊 Comparison: Migration vs Schema-Only

| Aspect | Migration Tracking | Schema-Only |
|--------|-------------------|-------------|
| **Setup** | Need version API | Just schema API |
| **Detection** | Automatic on version change | Manual or periodic |
| **Granularity** | Per migration | Per column change |
| **Complexity** | Medium | Low |
| **Reliability** | High (triggered once) | High (always fresh) |
| **Best For** | Production | Development |

**Recommendation**: Use both!
- **Migration tracking** for production (automatic updates)
- **Schema evolution detection** for development (immediate feedback)

---

## ✅ Recommended Implementation Order

1. **Phase 1**: Version API endpoint ✅
2. **Phase 2**: Migration manager composable ✅
3. **Phase 3**: App plugin integration ✅
4. **Phase 4**: User-friendly UI (migration banner) ✅
5. **Phase 5**: Testing and validation

---

## 🤔 Open Questions

1. **Should we reload the page after migration?**
   - Pro: Clean slate, all composables reinitialize
   - Con: User loses current state

2. **Should we cache old data during migration?**
   - Pro: Faster if migration fails
   - Con: More complex

3. **Should we support rollback?**
   - Pro: Can revert if migration fails
   - Con: Complex, probably not needed

4. **Should we notify user before migrating?**
   - Pro: User consent
   - Con: Most users don't care about technical details

**My recommendations**:
1. Auto-migrate without reloading (composables reinitialize)
2. No caching (migrations are rare, clean slate is better)
3. No rollback (migrations are tested, fallback to API if needed)
4. Silent migration with progress indicator

---

## 🎉 Final Thoughts

This migration strategy gives you:
- ✅ **Single source of truth** (Drizzle schema)
- ✅ **Automatic client updates** (version tracking)
- ✅ **Production-ready** (handles schema evolution)
- ✅ **Developer-friendly** (no extra work)
- ✅ **User-friendly** (automatic, invisible)

The key insight: Since we're doing **read-only sync**, we don't need complex incremental migrations. Just drop and recreate on version change. Simple, reliable, effective! 🚀

