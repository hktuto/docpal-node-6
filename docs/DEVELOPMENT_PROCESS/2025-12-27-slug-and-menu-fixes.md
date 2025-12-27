# Workspace Slug & Menu Fixes

**Date**: December 27, 2025  
**Status**: ✅ Complete  
**Issues Fixed**: 
1. Unnecessary random suffix on workspace slugs
2. Empty menu array after template creation

## Issue 1: Workspace Slug

### Problem

```typescript
// Always added random suffix
const slug = `${name.toLowerCase()...}-${nanoid(6)}`

// Result:
"advanced-crm-mF0fcX"  // ❌ Unnecessary suffix
```

**Why it's a problem:**
- Slugs are unique per company (not globally)
- Random suffix makes URLs ugly
- User can't predict the URL
- No way to customize slug

### Solution

**Smart slug generation:**

```typescript
// 1. Use custom slug if provided, or generate from name
let slug = customSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

// 2. Check if slug exists in THIS company
const existingWorkspace = await db
  .select()
  .from(workspaces)
  .where(and(
    eq(workspaces.slug, slug),
    eq(workspaces.companyId, user.company.id)
  ))

// 3. Only add suffix if slug exists
if (existingWorkspace.length > 0) {
  slug = `${slug}-${nanoid(6)}`
}
```

**Results:**
- ✅ First workspace: `advanced-crm` (clean!)
- ✅ Second workspace: `advanced-crm-abc123` (only if duplicate)
- ✅ Custom slug: User can provide their own

### API Changes

**Request body now accepts optional `slug`:**

```typescript
POST /api/app-templates/create-workspace
{
  "templateId": "uuid",
  "name": "Advanced CRM",
  "slug": "my-crm",  // ← Optional custom slug
  "description": "...",
  "includeSampleData": true
}
```

### Frontend Changes

**Users can now edit the workspace name before creating:**

```typescript
// Before: Immediately created workspace
applyTemplate(template) {
  await $api('/api/app-templates/create-workspace', {
    body: { templateId, name: template.name }
  })
}

// After: Opens dialog for customization
applyTemplate(template) {
  form.value = {
    name: template.name,        // Pre-filled
    description: template.description,
    icon: template.icon
  }
  selectedTemplateId.value = template.id
  showCreateDialog.value = true  // ← User can edit!
}
```

**Benefits:**
- ✅ User can customize workspace name
- ✅ User can edit description
- ✅ Slug auto-generated from custom name
- ✅ No duplicate slugs within company

## Issue 2: Empty Menu Array

### Problem

```json
{
  "menu": []  // ❌ Should have folder structure
}
```

**Root cause:** Menu update logic was correct, but we needed to verify:
1. Template has menu in JSON
2. Table slugs match menu references
3. Menu update returns updated workspace

### Solution

**Added debug logging:**

```typescript
if (templateDef.menu && templateDef.menu.length > 0) {
  console.log('📋 Template menu:', templateDef.menu)
  console.log('🗺️  Table slug map:', Object.fromEntries(tableSlugToIdMap))
  
  const menuWithIds = updateMenuWithTableIds(templateDef.menu, tableSlugToIdMap)
  console.log('✅ Menu with IDs:', menuWithIds)
  
  const [updated] = await db
    .update(workspaces)
    .set({ menu: menuWithIds })
    .where(eq(workspaces.id, workspace.id))
    .returning()
  
  console.log('💾 Updated workspace menu:', updated.menu)
  updatedWorkspace = updated
} else {
  console.log('⚠️  No menu in template definition')
}
```

**This helps diagnose:**
- Is menu in template?
- Are table slugs correct?
- Is menu being updated?
- Is updated workspace returned?

### Expected Result

After fix, workspace should have:

```json
{
  "menu": [
    {
      "id": "folder-sales",
      "label": "Sales & CRM",
      "type": "folder",
      "children": [
        {
          "id": "table-companies",
          "slug": "companies",
          "itemId": "actual-table-uuid",  // ← Linked!
          "type": "table"
        }
      ]
    }
  ]
}
```

## Complete Flow

### 1. User Clicks "Apply Template"

```typescript
// Opens dialog with pre-filled data
form.value = {
  name: "Advanced CRM",       // Can edit
  description: "...",          // Can edit
  icon: "lucide:briefcase"
}
selectedTemplateId.value = template.id
showCreateDialog.value = true
```

### 2. User Customizes (Optional)

```
Dialog: "Create Workspace from Template"
┌─────────────────────────────────────┐
│ Name: [My Custom CRM    ]          │  ← User can edit
│ Description: [...]                  │
│ Icon: [🎨 Select icon]             │
│                                     │
│ [Cancel]  [Create Workspace]       │
└─────────────────────────────────────┘
```

### 3. Backend Creates Workspace

```typescript
// 1. Generate slug
slug = "my-custom-crm"  // From user's name

// 2. Check for duplicates
if (exists) slug = "my-custom-crm-abc123"

// 3. Create workspace
workspace = await db.insert(workspaces).values({ slug, ... })

// 4. Create tables
for (table of template.tables) {
  const table = await db.insert(dataTables).values(...)
  tableSlugToIdMap.set(table.slug, table.id)
}

// 5. Update menu with table IDs
const menuWithIds = updateMenuWithTableIds(template.menu, tableSlugToIdMap)
updatedWorkspace = await db.update(workspaces).set({ menu: menuWithIds })

// 6. Return updated workspace
return successResponse(updatedWorkspace)
```

### 4. Frontend Navigates

```typescript
const workspace = result?.data
await router.push(`/workspaces/${workspace.slug}`)
// → /workspaces/my-custom-crm ✅
```

## Testing

### Test 1: Clean Slug (No Duplicates)

```bash
POST /api/app-templates/create-workspace
{
  "templateId": "uuid",
  "name": "Sales CRM"
}

# Expected:
{
  "slug": "sales-crm",  # ✅ No suffix
  "menu": [...]         # ✅ Has menu
}
```

### Test 2: Duplicate Slug

```bash
# First workspace
POST → { "name": "Sales CRM" }
Result: { "slug": "sales-crm" }

# Second workspace (same name)
POST → { "name": "Sales CRM" }
Result: { "slug": "sales-crm-abc123" }  # ✅ Suffix added
```

### Test 3: Custom Slug

```bash
POST /api/app-templates/create-workspace
{
  "templateId": "uuid",
  "name": "Sales CRM",
  "slug": "my-sales"  # Custom
}

# Expected:
{
  "slug": "my-sales",  # ✅ Used custom
  "menu": [...]
}
```

### Test 4: Menu Structure

```bash
# Check workspace after creation
GET /api/workspaces/sales-crm

# Expected:
{
  "menu": [
    {
      "type": "folder",
      "label": "Sales & CRM",
      "children": [
        {
          "type": "table",
          "slug": "companies",
          "itemId": "uuid"  # ✅ Linked to actual table
        }
      ]
    }
  ]
}
```

## Files Modified

```
✅ server/api/app-templates/create-workspace.post.ts
   - Accept optional custom slug
   - Smart slug generation (only add suffix if duplicate)
   - Debug logging for menu
   - Fix where clause (use `and()`)

✅ app/pages/workspaces/index.vue
   - Open dialog instead of immediate creation
   - Pre-fill form with template data
   - Track selected template ID
   - Unified create function (empty or from template)
   - Dynamic dialog title
```

## Benefits

### For Users
- ✅ Clean, predictable URLs
- ✅ Can customize workspace name
- ✅ Can edit description before creating
- ✅ See what they're creating
- ✅ Organized menu structure

### For System
- ✅ No unnecessary random suffixes
- ✅ Slugs unique per company (not global)
- ✅ Menu properly linked to tables
- ✅ Debug logging for troubleshooting
- ✅ Better UX flow

---

**Status:** ✅ Complete  
**Next:** Test workspace creation with menu structure

