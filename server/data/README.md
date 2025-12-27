# Seed Data Directory

This directory contains **JSON-driven seed data** for the DocPal system.

## 📁 Structure

```
server/data/
├── README.md                         # This file
└── seed-templates-advanced.json      # Advanced CRM template
```

## 🎯 Why JSON?

**Benefits:**
1. **Separate data from logic** - Templates are data, APIs are logic
2. **Easy to review** - JSON diffs are clear in Git
3. **Easy to edit** - No code knowledge needed
4. **Reusable** - Multiple APIs can use same data
5. **Versionable** - Track template changes over time

## 📦 Available Template

### `seed-templates-advanced.json`

**Contains:** Complete Advanced CRM demonstrating all field types

**5 Tables:**
- **Companies** - Base customer companies
- **Contacts** - People at companies (with relations & lookups)
- **Deals** - Sales opportunities (with formulas)
- **Activities** - Interaction log (polymorphic relations)
- **Company_Stats** - Aggregated metrics (rollups)

**Features:**
- ✅ Relations (single & multiple)
- ✅ Lookups (get values from related records)
- ✅ Rollups (COUNT, SUM, MAX aggregations)
- ✅ Formulas (calculated fields)
- ✅ Sample data included
- ✅ Pre-configured views

**Used by:**
- `POST /api/seed` - Main seed (includes this automatically)
- `POST /api/seed-templates-advanced` - Seed just the template
- `server/utils/seedTemplates.ts` - `seedAdvancedTemplate()`

**When to edit:**
- Modifying template structure
- Adding/removing tables
- Updating sample data
- Changing field configurations

## 🔧 How to Use

### 1. Main Seed (Everything)

```bash
# Reset database
curl -X POST http://localhost:3000/api/db-reset

# Run migrations
pnpm db:migrate

# Seed everything (user + company + advanced template)
curl -X POST http://localhost:3000/api/seed
```

**This creates:**
- ✅ Admin user (admin@docpal.dev / admin123)
- ✅ Test company (Acme Corp)
- ✅ Advanced CRM template with 5 tables
- ✅ Sample data

### 2. Seed Just Template

```bash
# Seed template only
curl -X POST http://localhost:3000/api/seed-templates-advanced

# Update existing template
curl -X POST "http://localhost:3000/api/seed-templates-advanced?update=true"
```

### 3. In Code

```typescript
import { seedAdvancedTemplate } from '~~/server/utils/seedTemplates'

// Seed template
await seedAdvancedTemplate({ skipExisting: true })

// Update if exists
await seedAdvancedTemplate({ updateExisting: true })
```

## 📝 Template Structure

### Complete JSON Format

```json
{
  "templates": [
    {
      "name": "Advanced CRM",
      "description": "Complete CRM system...",
      "icon": "lucide:briefcase",
      "coverImage": "",
      "category": "Business",
      "tags": ["CRM", "Sales", "Advanced"],
      "visibility": "system",
      "isFeatured": true,
      "includesSampleData": true,
      "includesViews": true,
      "templateDefinition": {
        "menu": [
          {
            "id": "folder-sales",
            "label": "Sales & CRM",
            "slug": "sales-crm",
            "type": "folder",
            "icon": "lucide:briefcase",
            "order": 0,
            "children": [
              {
                "id": "table-companies",
                "label": "Companies",
                "slug": "companies",
                "type": "table",
                "icon": "lucide:building-2",
                "order": 0
              }
            ]
          }
        ],
        "tables": [
          {
            "name": "Companies",
            "slug": "companies",
            "description": "Customer companies",
            "columns": [
              {
                "name": "company_name",
                "label": "Company Name",
                "type": "text",
                "required": true,
                "order": 0
              }
            ],
            "sampleData": [
              {
                "company_name": "Acme Corp",
                "status": "Customer"
              }
            ]
          }
        ]
      }
    }
  ]
}
```

**Note:** The `menu` array organizes tables into folders. When a workspace is created from this template, table `itemId` fields are automatically populated with actual table IDs.

### Field Types

#### Basic Types
- `text` - Short text
- `long-text` - Long text / textarea
- `number` - Numeric value
- `currency` - Money amount
- `date` - Date only
- `datetime` - Date and time
- `email` - Email address
- `phone` - Phone number
- `url` - Website URL
- `select` - Single choice
- `boolean` - True/false

#### Advanced Types
- `relation` - Link to another table
- `lookup` - Get value from related record
- `rollup` - Aggregate data (COUNT, SUM, AVG, MIN, MAX)
- `formula` - Calculate values dynamically

See `docs/FEATURES/advanced-field-types.md` for detailed documentation.

## 🚀 Development Workflow

### Normal Development

```bash
# 1. Reset database
curl -X POST http://localhost:3000/api/db-reset

# 2. Run migrations
pnpm db:migrate

# 3. Seed data
curl -X POST http://localhost:3000/api/seed

# Done! You have everything
```

### Template Development

```bash
# 1. Edit template JSON
code server/data/seed-templates-advanced.json

# 2. Re-seed template (update existing)
curl -X POST "http://localhost:3000/api/seed-templates-advanced?update=true"

# 3. Test in UI
open http://localhost:3000/workspaces
```

## 🎓 Example: Advanced CRM

### Table Relationships

```
Companies
    ↓ (1:many)
Contacts
    ↓ (many:many)
Deals
    ↓ (1:many)
Activities

Company_Stats ← (aggregates from all)
```

### Field Examples

**Relation:**
```json
{
  "name": "company",
  "type": "relation",
  "config": {
    "targetTable": "companies",
    "displayField": "company_name"
  }
}
```

**Lookup:**
```json
{
  "name": "company_industry",
  "type": "lookup",
  "config": {
    "relationField": "company",
    "targetField": "industry"
  }
}
```

**Rollup:**
```json
{
  "name": "total_deals",
  "type": "rollup",
  "config": {
    "sourceTable": "deals",
    "aggregation": "COUNT"
  }
}
```

**Formula:**
```json
{
  "name": "expected_value",
  "type": "formula",
  "config": {
    "formula": "deal_value * (probability / 100)",
    "resultType": "currency"
  }
}
```

## ✅ Best Practices

### DO:
- ✅ Edit JSON file to change templates
- ✅ Add meaningful sample data
- ✅ Use clear, descriptive names
- ✅ Test after editing
- ✅ Document complex relationships

### DON'T:
- ❌ Hardcode templates in API files
- ❌ Mix data and logic
- ❌ Forget to validate JSON syntax
- ❌ Add sensitive data
- ❌ Make circular relations

## 📊 Template Stats

Check seeded templates:

```bash
# Get all templates
curl http://localhost:3000/api/app-templates

# Count templates
curl http://localhost:3000/api/app-templates | jq '.data | length'
```

Or in code:

```typescript
import { getTemplateStats } from '~~/server/utils/seedTemplates'

const stats = await getTemplateStats()
// {
//   total: 1,
//   system: 1,
//   featured: 1
// }
```

## 🎯 Future Templates

When ready to add more templates:

1. **Create new JSON file**
   ```
   server/data/seed-templates-[name].json
   ```

2. **Add seed function**
   ```typescript
   // server/utils/seedTemplates.ts
   export async function seed[Name]Template() {
     const data = await loadTemplatesFromJSON('seed-templates-[name].json')
     return await seedTemplatesFromData(data)
   }
   ```

3. **Create API endpoint**
   ```typescript
   // server/api/seed-templates-[name].post.ts
   import { seed[Name]Template } from '~~/server/utils/seedTemplates'
   ```

4. **Optionally add to main seed**
   ```typescript
   // server/api/seed.post.ts
   await seed[Name]Template()
   ```

## 🔄 Migration Notes

**From:** Multiple minimal/full template files  
**To:** Single comprehensive advanced template

**Benefits:**
- Simpler structure
- One source of truth
- All features demonstrated
- Easier to maintain

**Old Files Removed:**
- ❌ `seed-templates-minimal.json`
- ❌ `seed-templates-full.json` (never created)
- ❌ `seedMinimalTemplates()` function
- ❌ `seedFullTemplates()` function
- ❌ `/api/seed-templates` endpoint

**Current Files:**
- ✅ `seed-templates-advanced.json` (single template)
- ✅ `seedAdvancedTemplate()` function
- ✅ `/api/seed` (includes template)
- ✅ `/api/seed-templates-advanced` (template only)

---

**Last Updated:** December 27, 2025  
**Structure Version:** 2.0 (Simplified)  
**Status:** ✅ Production Ready  
**Documentation:** `docs/FEATURES/advanced-field-types.md`
