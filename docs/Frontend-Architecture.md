# Frontend Architecture (Nuxt 4)

## Overview
Full-stack Nuxt 4 application with Vue 3 Composition API, TypeScript, and file-based routing.

---

## Tech Stack

- **Framework:** Nuxt 4
- **UI Framework:** Vue 3 (Composition API)
- **Language:** TypeScript
- **Styling:** Plain SCSS with CSS Variables
- **Component Library:** Element Plus
- **State Management:** localStorage (tabs) + provide/inject (component context)
- **Global State:** Only `useAuth` composable
- **API Client:** Nuxt $fetch
- **Icons:** Element Plus icons

---

## Project Structure

```
packages/docpal/
├── app/
│   ├── app.vue                    # Root app component
│   ├── pages/                     # File-based routing
│   │   ├── [...all].vue           # Catch-all (main app routing)
│   │   ├── login.vue              # Login page
│   │   ├── register.vue           # Register page (future)
│   │   └── forgot-password.vue    # Password reset (future)
│   ├── layouts/
│   │   ├── default.vue            # Main app layout
│   │   └── auth.vue               # Auth layout (centered)
│   ├── components/                # Reusable components
│   │   ├── auth/
│   │   │   ├── login-form.vue
│   │   │   ├── register-form.vue
│   │   │   └── forgot-password-form.vue
│   │   ├── app/                   # Main app components
│   │   │   ├── entry.vue          # Tab container + management
│   │   │   ├── tab-router.vue     # Individual tab component
│   │   │   ├── database.vue       # Database level (provides db context)
│   │   │   ├── table.vue          # Table level (provides table context)
│   │   │   ├── view.vue           # View level (provides view context)
│   │   │   └── notification.vue
│   │   ├── views/                 # Widget renderers
│   │   │   ├── table.vue          # Table widget
│   │   │   ├── kanban.vue         # Kanban widget
│   │   │   ├── calendar.vue       # Calendar widget
│   │   │   ├── gantt.vue          # Gantt widget
│   │   │   ├── card.vue           # Card/gallery widget
│   │   │   ├── number.vue         # Number metric widget
│   │   │   ├── chart.vue          # Chart widget
│   │   │   ├── list.vue           # List widget
│   │   │   └── progress.vue       # Progress widget
│   │   ├── filters/               # Filter & sort components
│   │   │   ├── filter-builder.vue
│   │   │   ├── filter-condition.vue
│   │   │   ├── sort-builder.vue
│   │   │   └── column-selector.vue
│   │   └── common/                # Shared UI components
│   │       ├── record-editor.vue
│   │       └── empty-state.vue
│   ├── composables/               # Global shared state ONLY
│   │   └── useAuth.ts             # Authentication state
│   ├── middleware/                # Route middleware
│   │   ├── auth.global.ts         # Check if user is authenticated
│   │   └── guest.ts               # Redirect authed users from login
│   ├── types/                     # TypeScript types
│   │   ├── api.ts                 # API response types
│   │   ├── app.ts                 # App types (tabs, routes)
│   │   ├── database.ts            # Database types
│   │   └── auth.ts                # Auth types
│   ├── utils/                     # Utility functions & API helpers
│   │   ├── api.ts                 # Base API client
│   │   ├── database-api.ts        # Database API helpers
│   │   ├── table-api.ts           # Table API helpers
│   │   ├── record-api.ts          # Record API helpers
│   │   ├── view-api.ts            # View API helpers
│   │   ├── formatters.ts          # Date, number, currency formatters
│   │   └── validators.ts          # Validation helpers
│   └── assets/                    # Styles and assets
│       └── styles/
│           ├── variables.scss     # CSS variables
│           └── main.scss          # Global styles
├── server/                        # API routes (already built)
├── public/                        # Static assets
├── nuxt.config.ts                 # Nuxt configuration
└── package.json
```

---

## Routing Strategy

### Tab-Based Routing with URL Sync

**Core Concept:** Multiple tabs in UI, URL reflects focused tab, tabs persist in localStorage

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `pages/login.vue` | Login page |
| `/register` | `pages/register.vue` | Register (future) |
| `/forgot-password` | `pages/forgot-password.vue` | Password reset (future) |
| `/app` | `pages/[...all].vue` | Main app (catch-all) |
| `/app/db_123/table_456/view_789` | `pages/[...all].vue` | Specific route (updates URL when tab focused) |

### Tab Management Flow

```
1. User logs in → Redirect to /app
2. AppEntry reads localStorage for saved tabs
3. If no tabs → Show empty state ("Create or open a database")
4. If URL has route → Open that tab (even if not in localStorage)
5. When user switches tab → Update URL
6. When user opens new database/table → Add new tab to localStorage
7. When user shares URL → Recipient opens that specific tab

Example localStorage structure:
{
  "tabs": [
    { "id": "tab_1", "type": "database", "dbId": "db_123", "label": "Sales DB" },
    { "id": "tab_2", "type": "table", "dbId": "db_123", "tableId": "table_456", "viewId": "view_789", "label": "Customers" }
  ],
  "activeTabId": "tab_2"
}
```

### Component Hierarchy

```vue
<AppEntry>              <!-- Manages tabs in localStorage, handles URL sync -->
  <template v-for="tab in tabs">
    <AppTabRouter       <!-- Individual tab component -->
      :tab="tab"
      :active="tab.id === activeTabId"
    >
      <AppDatabase      <!-- Provides database context -->
        v-if="tab.type === 'database'"
      >
        <!-- Database UI -->
      </AppDatabase>
      
      <AppTable         <!-- Provides table context -->
        v-if="tab.type === 'table'"
      >
        <AppView>       <!-- Provides view context -->
          <ViewsTable   <!-- Renders widget based on view type -->
            v-if="view.widget.type === 'table'"
          />
        </AppView>
      </AppTable>
    </AppTabRouter>
  </template>
</AppEntry>
```

---

## State Management

### Design Philosophy

**Composables Folder:** ONLY for global shared state (`useAuth`)

**Utils Folder:** All helpers, including API helpers (no reactive state)

**Tab State:** Managed by `AppEntry`, stored in localStorage

**Component State:** Each component manages its own local state

**Data Flow:** Provide/Inject for sharing context down the tree

### useAuth (Only Global Composable)

```typescript
// composables/useAuth.ts
export const useAuth = () => {
  const user = useState('user', () => null);
  const token = useState('token', () => null);
  const isAuthenticated = computed(() => !!user.value);
  
  const login = async (credentials) => {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: credentials
    });
    user.value = data.user;
    token.value = data.token;
    
    // Store token in localStorage for persistence
    if (process.client) {
      localStorage.setItem('auth_token', data.token);
    }
  };
  
  const logout = () => {
    user.value = null;
    token.value = null;
    if (process.client) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tabs'); // Clear tabs on logout
    }
  };
  
  const restoreSession = async () => {
    if (process.client) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const data = await $fetch('/api/auth/me');
          user.value = data.user;
        } catch (e) {
          // Token invalid, clear it
          localStorage.removeItem('auth_token');
        }
      }
    }
  };
  
  return { user, token, isAuthenticated, login, logout, restoreSession };
};
```

### Tab Management in AppEntry

```typescript
// components/app/entry.vue
<script setup>
const tabs = ref([]);
const activeTabId = ref(null);

onMounted(() => {
  // Load tabs from localStorage
  const savedTabs = localStorage.getItem('tabs');
  if (savedTabs) {
    tabs.value = JSON.parse(savedTabs);
  }
  
  // Check if URL has a route
  const route = useRoute();
  if (route.path !== '/app') {
    // Parse URL and open that tab
    openTabFromUrl(route.path);
  }
});

const openTab = (tab) => {
  tabs.value.push(tab);
  activeTabId.value = tab.id;
  saveTabs();
  updateUrl(tab);
};

const closeTab = (tabId) => {
  const index = tabs.value.findIndex(t => t.id === tabId);
  tabs.value.splice(index, 1);
  saveTabs();
};

const switchTab = (tabId) => {
  activeTabId.value = tabId;
  const tab = tabs.value.find(t => t.id === tabId);
  updateUrl(tab);
};

const saveTabs = () => {
  localStorage.setItem('tabs', JSON.stringify(tabs.value));
};

const updateUrl = (tab) => {
  // Update URL without page reload
  const url = buildUrlFromTab(tab);
  navigateTo(url, { replace: true });
};
</script>
```

### Provide/Inject Pattern

```typescript
// components/app/database.vue
const database = ref(null);

// Fetch database data
onMounted(async () => {
  database.value = await $fetch(`/api/databases/${props.databaseId}`);
});

// Provide to children
provide('database', readonly(database));

// components/app/table.vue
const database = inject('database'); // Access parent context
const table = ref(null);

onMounted(async () => {
  table.value = await $fetch(`/api/tables/${props.tableId}`);
});

provide('table', readonly(table));

// components/views/table.vue
const database = inject('database');
const table = inject('table');
const view = inject('view');

// Render using all context
```

---

## API Communication

### Utils Pattern (Not Composables!)

```typescript
// utils/api.ts - Base API client
export const apiFetch = $fetch.create({
  baseURL: '/api',
  onRequest({ options }) {
    // Token will be sent by server middleware automatically in POC
    // In production, add Authorization header here
  },
  onResponseError({ response }) {
    // Handle errors globally
    console.error('API Error:', response.status, response._data);
  }
});

// utils/database-api.ts - Database API helpers
import { apiFetch } from './api';

export const databaseApi = {
  list: () => apiFetch('/databases'),
  
  get: (id: string) => apiFetch(`/databases/${id}`),
  
  create: (data: any) => apiFetch('/databases', {
    method: 'POST',
    body: data
  }),
  
  update: (id: string, data: any) => apiFetch(`/databases/${id}`, {
    method: 'PATCH',
    body: data
  }),
  
  delete: (id: string) => apiFetch(`/databases/${id}`, {
    method: 'DELETE'
  })
};

// Usage in components:
import { databaseApi } from '~/utils/database-api';

const databases = ref([]);
onMounted(async () => {
  databases.value = await databaseApi.list();
});
```

---

## Component Structure

### Smart vs Dumb Components

**Smart Components (Pages):**
- Handle data fetching
- Manage local state
- Call composables
- Pass data to dumb components

**Dumb Components (Components):**
- Receive data via props
- Emit events to parent
- No direct API calls
- Reusable and testable

### Example

```vue
<!-- pages/databases/index.vue (Smart) -->
<script setup>
const { list } = useDatabases();
const { data: databases } = await useAsyncData('databases', () => list());
</script>

<template>
  <DatabaseList :databases="databases" @create="handleCreate" />
</template>

<!-- components/Database/DatabaseList.vue (Dumb) -->
<script setup>
defineProps<{
  databases: Database[]
}>();

defineEmits<{
  create: []
}>();
</script>

<template>
  <div>
    <DatabaseCard v-for="db in databases" :key="db.id" :database="db" />
    <button @click="$emit('create')">Create</button>
  </div>
</template>
```

---

## Styling Strategy

### Plain SCSS with CSS Variables

```scss
// assets/styles/variables.scss
:root {
  // Colors
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  
  // Backgrounds
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  
  // Text
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  
  // Borders
  --border-color: #e2e8f0;
  --border-radius: 6px;
  
  // Spacing
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  // Shadows
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### Component Styling with Element Plus

```vue
<template>
  <el-button type="primary" @click="handleClick">
    Click me
  </el-button>
</template>

<style scoped lang="scss">
.custom-component {
  background: var(--bg-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
}
</style>
```

### Element Plus Setup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@element-plus/nuxt']
});
```

---

## Auth Flow

### 1. Login Flow
```
User visits /login
  ↓
Enter credentials
  ↓
Call useAuth().login()
  ↓
POST /api/auth/login
  ↓
Store user + token in state
  ↓
Redirect to /
```

### 2. Protected Route
```
User visits /databases
  ↓
auth.global.ts middleware runs
  ↓
Check if user exists in state
  ↓
If no → redirect to /login
If yes → allow access
```

### 3. Auto-restore Session
```
App loads
  ↓
Check localStorage for token
  ↓
If exists → call /api/auth/me
  ↓
Store user in state
  ↓
Continue
```

---

## Development Workflow

### 1. Create New Feature

1. **Define types** in `types/`
2. **Create API composable** in `composables/`
3. **Create dumb components** in `components/`
4. **Create page** in `pages/`
5. **Test in browser**

### 2. Example: Add Database Feature

```bash
# 1. Add types
echo "export interface Database { ... }" > app/types/database.ts

# 2. Add API helper (NOT composable!)
# Create app/utils/database-api.ts

# 3. Add components
# Create app/components/app/database.vue

# 4. Add to tab router
# Update app/components/app/tab-router.vue

# 5. Test
pnpm dev
```

---

## Best Practices

### 1. TypeScript
- Always type props and emits
- Use `defineProps<T>()` and `defineEmits<T>()`
- Create shared types in `types/`

### 2. Composables vs Utils
- **Composables:** ONLY for global reactive state (`useAuth`)
- **Utils:** All helpers, including API calls (no reactive state)
- API helpers in `utils/` return promises, not refs

### 3. Components
- Keep components small (<200 lines)
- Use slots for flexibility
- Emit events, don't mutate props

### 4. Performance
- Use `v-lazy` for images
- Implement virtual scrolling for large lists
- Use `useAsyncData` with keys for caching

### 5. Error Handling
```typescript
const { data, error } = await useAsyncData('key', async () => {
  return await apiFetch('/endpoint');
});

if (error.value) {
  // Show error message
}
```

---

## POC Scope

### Phase 1 (Current)
- ✅ Login page + auth middleware
- ✅ AppEntry with tab management
- ✅ localStorage tab persistence
- ✅ URL sync with active tab
- ✅ Empty state when no tabs
- ✅ Database component (list + open)
- ✅ Basic provide/inject pattern

### Phase 2
- ✅ Table component
- ✅ Column management
- ✅ Table widget (spreadsheet view)
- ✅ Record CRUD
- ✅ Filter builder component
- ✅ Sort builder component

### Phase 3
- ✅ View component
- ✅ View switcher
- ✅ Multiple widgets in one view
- ✅ Number + Chart widgets

### Defer to Later
- Advanced widgets (kanban, calendar, gantt)
- Drag-and-drop
- Real-time collaboration
- Mobile responsive (desktop-first for POC)
- Multiple users (Phase 2+)

---

## First Steps (In Order)

1. ✅ Install Element Plus
2. ✅ Setup SCSS + CSS variables
3. ✅ Create `useAuth` composable
4. ✅ Create login page (`pages/login.vue`)
5. ✅ Add auth middleware
6. ✅ Create `pages/[...all].vue` (catch-all)
7. ✅ Create `components/app/entry.vue` (tab manager)
8. ✅ Test login → /app flow
9. ✅ Implement tab management + localStorage
10. ✅ Create empty state for no tabs

Let's start building! 🚀

