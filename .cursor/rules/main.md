# DocPal Project Rules

## Project Overview
This is a low-code platform built with Nuxt 4, Vue 3, TypeScript, Element Plus, NuxtHub, and PostgreSQL. The project uses dynamic table creation at runtime with company-scoped multi-tenancy.

## Tech Stack
- **Framework**: Nuxt 4 with Vue 3 Composition API
- **Language**: TypeScript (strict mode)
- **UI Library**: Element Plus (@element-plus/nuxt)
- **Icons**: Nuxt Icon (@nuxt/icon)
- **Database**: PostgreSQL with NuxtHub (Drizzle ORM)
- **Styling**: SCSS with CSS Variables (NO Tailwind)
- **Package Manager**: pnpm

## UI Library: Element Plus

### Component Usage
- **ALWAYS** use Element Plus components instead of native HTML when available
- Import components from `element-plus` or use auto-import (configured via @element-plus/nuxt)
- Prefer Element Plus components:
  - Use `<el-button>` instead of `<button>`
  - Use `<el-input>` instead of `<input>`
  - Use `<el-form>`, `<el-form-item>` for forms
  - Use `<el-table>`, `<el-table-column>` for tables
  - Use `<el-card>` for card layouts
  - Use `<el-dialog>` for modals
  - Use `<el-select>`, `<el-option>` for dropdowns
  - Use `<el-date-picker>` for date inputs

### Element Plus Patterns
```vue
<!-- ✅ Good: Use Element Plus components -->
<template>
  <el-button type="primary" @click="handleClick">Click me</el-button>
  <el-input v-model="value" placeholder="Enter text" />
</template>

<!-- ❌ Bad: Don't use native HTML when Element Plus has equivalent -->
<template>
  <button @click="handleClick">Click me</button>
  <input v-model="value" />
</template>
```

### Element Plus Props
- Use Element Plus props for styling (type, size, status) instead of custom CSS when possible
- Follow Element Plus design tokens and spacing

## Icons: Nuxt Icon

### Icon Usage
- **ALWAYS** use Nuxt Icon (`<Icon>`) component for icons instead of icon fonts or SVG imports
- Nuxt Icon supports multiple icon collections (Iconify, Font Awesome, Material Design, etc.)
- Use the `<Icon>` component with the `name` prop to specify the icon

### Icon Patterns
```vue
<!-- ✅ Good: Use Nuxt Icon component -->
<template>
  <Icon name="mdi:home" />
  <Icon name="heroicons:user" />
  <Icon name="material-symbols:settings" />
  <el-button>
    <Icon name="mdi:plus" />
    Add Item
  </el-button>
</template>

<!-- ❌ Bad: Don't use icon fonts or inline SVG -->
<template>
  <i class="fa fa-home"></i>
  <span class="icon-home"></span>
</template>
```

### Icon Collections
- **Material Design Icons**: `mdi:*` (e.g., `mdi:home`, `mdi:account`)
- **Heroicons**: `heroicons:*` (e.g., `heroicons:user`, `heroicons:trash`)
- **Material Symbols**: `material-symbols:*` (e.g., `material-symbols:settings`)
- **Element Plus Icons**: `ep:*` (e.g., `ep:plus`, `ep:delete`)
- Many more available via Iconify

### Icon Sizing
- Use CSS variables for icon sizes: `var(--app-font-size-*)`
- Icons inherit font-size from parent, or use inline style
- Common sizes: `var(--app-font-size-s)`, `var(--app-font-size-m)`, `var(--app-font-size-l)`

### Icon with Element Plus
```vue
<!-- ✅ Good: Icons in Element Plus components -->
<template>
  <el-button type="primary">
    <Icon name="mdi:plus" />
    Create
  </el-button>
  <el-button>
    <Icon name="mdi:delete" />
    Delete
  </el-button>
</template>
```

### Icon Styling
- Icons can be styled with CSS variables for colors
- Use `color` property or CSS variable: `var(--app-text-color-primary)`
- Icons respect parent text color by default

## Styling: CSS Variables

### CSS Variable Usage
- **ALWAYS** use CSS variables from `app/assets/style/variable.scss` for colors, spacing, typography
- **NEVER** hardcode colors, sizes, or spacing values
- Import variables in SCSS files: `@use 'variable' as *;`

### Available CSS Variables

#### Colors
- Primary: `var(--app-primary-color)`, `var(--app-primary-1)` through `var(--app-primary-6)`
- Success: `var(--app-success-color)`, `var(--app-success-1)` through `var(--app-success-6)`
- Warning: `var(--app-warning-color)`, `var(--app-warning-1)` through `var(--app-warning-6)`
- Danger/Error: `var(--app-danger-color)`, `var(--app-error-color)`
- Info: `var(--app-info-color)`
- Grey scale: `var(--app-grey-50)` through `var(--app-grey-950)`
- Text: `var(--app-text-color-primary)`, `var(--app-text-color-regular)`, `var(--app-text-color-secondary)`
- Border: `var(--app-border-color)`, `var(--app-border-color-light)`, etc.
- Background: `var(--app-bg-color)`, `var(--app-bg-color-page)`
- Fill: `var(--app-fill-color)`, `var(--app-fill-color-light)`, etc.

#### Typography
- Font sizes: `var(--app-font-size-xxs)` through `var(--app-font-size-xxl)`
- Font family: `var(--app-font-family)`
- Line height: `var(--app-line-height)`
- Font weight: `var(--app-font-weight)`, `var(--app-font-weight-title)`

#### Spacing
- Use spacing variables: `var(--app-space-xxs)` through `var(--app-space-xxl)`
- Prefer spacing variables over arbitrary values

#### Border Radius
- Use: `var(--app-border-radius-s)` through `var(--app-border-radius-max)`

#### Shadows
- Default: `var(--app-shadow-s)`, `var(--app-shadow-m)`, `var(--app-shadow-l)`, `var(--app-shadow-xl)`
- Color-specific: `var(--app-shadow-primary-*)`, `var(--app-shadow-success-*)`, etc.

### Styling Patterns
```vue
<!-- ✅ Good: Use CSS variables -->
<style scoped>
.my-component {
  color: var(--app-text-color-primary);
  background: var(--app-bg-color);
  padding: var(--app-space-m);
  border-radius: var(--app-border-radius-m);
  box-shadow: var(--app-shadow-m);
}
</style>

<!-- ❌ Bad: Hardcoded values -->
<style scoped>
.my-component {
  color: #333;
  background: #fff;
  padding: 12px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>
```

### SCSS File Structure
- Global styles: `app/assets/style/main.scss`
- Variables: `app/assets/style/variable.scss`
- Component styles: Use `<style scoped>` in Vue components
- Import variables: `@use 'variable' as *;` in SCSS files

## Database & API Patterns

### NuxtHub Database Access
- Use `hub:db` for database connection: `import { db } from 'hub:db'`
- Use `hub:db:schema` for schema types: `import { users, companies, apps } from 'hub:db:schema'`
- Schema files location: `server/db/schema/*.ts`

### API Routes
- Location: `server/api/**/*.ts`
- Use `defineEventHandler` for API handlers
- Use `readBody`, `getQuery`, `getRouterParam` from h3
- Return proper HTTP status codes

### Database Patterns
```typescript
// ✅ Good: Type-safe database queries
import { db } from 'hub:db'
import { apps } from 'hub:db:schema'
import { eq } from 'drizzle-orm'

const app = await db.select().from(apps).where(eq(apps.id, appId))
```

### Dynamic Tables
- Dynamic tables use company-prefixed naming: `dt_[companyId]_[tableId]`
- Use raw SQL for dynamic table operations (not Drizzle)
- Always include system columns: `id`, `created_at`, `updated_at`, `created_by`

## Code Style

### TypeScript
- Use strict TypeScript
- Prefer `interface` for object types
- Use type inference where possible
- Use `const` assertions for literal types

### Vue 3 Composition API
- **ALWAYS** use Composition API with `<script setup lang="ts">`
- Use `ref()` for reactive primitives
- Use `reactive()` for objects (sparingly)
- Use `computed()` for derived state
- Use `defineProps`, `defineEmits` for component props/events

### File Naming
- Components: PascalCase (e.g., `AppCard.vue`)
- Pages: kebab-case (e.g., `index.vue`, `[id].vue`)
- API routes: kebab-case (e.g., `index.get.ts`, `index.post.ts`)
- Utilities: camelCase (e.g., `dynamicTable.ts`)

### Component Structure
```vue
<template>
  <!-- Template content -->
</template>

<script setup lang="ts">
// Imports
// Props/Emits
// Composables
// State
// Methods
// Lifecycle hooks
</script>

<style scoped>
/* Component styles using CSS variables */
</style>
```

## Project Structure

### Key Directories
- `app/` - Nuxt app directory (pages, components, layouts, assets)
- `server/api/` - API routes
- `server/db/schema/` - Database schema files (Drizzle)
- `server/db/migrations/` - Database migrations
- `shared/types/` - Shared TypeScript types
- `scripts/` - Utility scripts

### Component Organization
- `app/components/app/` - App-related components
- `app/components/table/` - Dynamic table components
- `app/components/view/` - View components
- `app/components/fields/` - Field type components
- `app/components/workflow/` - Workflow components

## Architecture Patterns

### Context Provider Pattern
- Use `provide/inject` for sharing app/table/view context
- Create composables: `useAppContext`, `useTableContext`, `useViewContext`

### Multi-Tenancy
- All data scoped to `company_id`
- Validate company access in API routes
- Use company-prefixed table names for dynamic tables

### Dynamic Schema
- Store schema as JSONB in metadata tables
- Denormalize to `data_table_columns` for querying
- Use raw SQL for dynamic table creation/modification

## Best Practices

### Performance
- Use `useFetch` with proper caching
- Implement pagination for large datasets
- Use indexes on frequently queried columns
- Cache metadata queries

### Error Handling
- Use try-catch in async functions
- Return proper error responses from API
- Show user-friendly error messages
- Log errors for debugging

### Security
- Validate all user input
- Sanitize SQL queries (use parameterized queries)
- Check company access permissions
- Never expose sensitive data

### Testing
- Write tests for dynamic table operations
- Test schema migrations
- Test API endpoints
- Test component rendering

## Common Patterns

### Fetching Data
```typescript
// ✅ Good: Use useFetch with proper typing
const { data: apps, pending, refresh } = await useFetch<App[]>('/api/apps')
```

### Creating Records
```typescript
// ✅ Good: Use $fetch for mutations
await $fetch('/api/apps', {
  method: 'POST',
  body: formData
})
```

### Form Handling
```vue
<script setup lang="ts">
const form = ref({
  name: '',
  description: ''
})

const createApp = async () => {
  try {
    await $fetch('/api/apps', {
      method: 'POST',
      body: form.value
    })
    form.value = { name: '', description: '' }
    await refresh()
  } catch (error) {
    console.error('Error:', error)
  }
}
</script>
```

## What NOT to Do

- ❌ Don't use Tailwind CSS (project uses SCSS + CSS variables)
- ❌ Don't hardcode colors, spacing, or sizes (use CSS variables)
- ❌ Don't use Options API (use Composition API only)
- ❌ Don't use native HTML elements when Element Plus has equivalent
- ❌ Don't create dynamic tables with Drizzle (use raw SQL)
- ❌ Don't forget to scope data to company_id
- ❌ Don't skip error handling
- ❌ Don't use `any` type (use proper types or `unknown`)

## Development Workflow

1. Create/modify schema in `server/db/schema/`
2. Generate migration: `pnpm db:generate`
3. Apply migration: `pnpm db:migrate` (or auto-applies on `pnpm dev`)
4. Seed data if needed: `pnpm seed`
5. Start dev server: `pnpm dev`

## References

- Element Plus Docs: https://element-plus.org/
- Nuxt 4 Docs: https://nuxt.com/
- NuxtHub Docs: https://hub.nuxt.com/
- Drizzle ORM Docs: https://orm.drizzle.team/
- Project Architecture: `docs/ARCHITECTURE.md`
- Development Plan: `docs/DEVELOPMENT_PLAN.md`

