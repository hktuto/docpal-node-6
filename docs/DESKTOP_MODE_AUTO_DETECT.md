# Desktop Mode - Auto-Detection Implementation

## Overview

Desktop mode is now **automatically detected** - no manual state management needed! 

## How It Works

### Auto-Detection Logic

```typescript
const isDesktopMode = computed(() => {
  if (!process.client) return false
  return window.self !== window.top  // True if inside iframe
})
```

**Simple rule:** If page is in an iframe → Desktop mode = ON

## Architecture

```
┌─────────────────────────────────────┐
│ /desktop Page                       │
│ Layout: desktop.vue (no sidebar)   │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ Iframe: /workspaces         │   │
│ │ window.self !== window.top  │   │
│ │ → isDesktopMode = true      │   │
│ │ → Sidebar hidden ✓          │   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ Iframe: /chat               │   │
│ │ window.self !== window.top  │   │
│ │ → isDesktopMode = true      │   │
│ │ → Sidebar hidden ✓          │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ /workspaces (Direct Access)         │
│ window.self === window.top          │
│ → isDesktopMode = false             │
│ → Sidebar shown ✓                   │
└─────────────────────────────────────┘
```

## Benefits

✅ **Zero Configuration** - Works automatically  
✅ **No State Management** - No localStorage, no manual enable/disable  
✅ **Always Accurate** - Based on actual iframe status  
✅ **Works Everywhere** - All iframes automatically get desktop mode  
✅ **Shareable URLs** - Direct URLs still work normally with sidebar  

## Implementation

### Composable
```typescript
// app/composables/useDisplayMode.ts
export function useDisplayMode() {
  const isDesktopMode = computed(() => {
    if (!process.client) return false
    return window.self !== window.top
  })
  
  return { isDesktopMode }
}
```

### Layouts
```vue
<!-- app/layouts/default.vue & app/layouts/app.vue -->
<script setup>
const isDesktopMode = useIsDesktopMode()
</script>

<template>
  <aside v-if="!isDesktopMode" class="sidebar">
    <CommonMenu />
  </aside>
</template>
```

## Usage Scenarios

| Scenario | Detection | Result |
|----------|-----------|--------|
| User visits `/workspaces` directly | Not in iframe | Sidebar shown |
| User opens `/workspaces` in desktop window | In iframe | Sidebar hidden |
| User shares URL `/workspaces/my-app` | Not in iframe | Sidebar shown |
| Multiple windows in desktop | All in iframes | All hide sidebar |

## Technical Details

### Browser API
- `window.self` - Reference to current window
- `window.top` - Reference to topmost window
- If different → Page is in iframe
- Same origin only (your app pages)

### Performance
- Computed property (reactive)
- No watchers needed
- No storage I/O
- Instant detection

## Migration Notes

**Removed:**
- ❌ `useState('isDesktopMode')` 
- ❌ `enableDesktopMode()` 
- ❌ `disableDesktopMode()`
- ❌ localStorage/sessionStorage
- ❌ Manual state management

**Replaced with:**
- ✅ Auto-detection via `window.self !== window.top`
- ✅ Computed property (always up-to-date)

