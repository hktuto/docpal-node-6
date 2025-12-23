# Desktop Windowing System - Complete Documentation

## 📋 Overview

A fully-featured desktop windowing system for DocPal, providing a macOS/Windows-like experience with floating, resizable, draggable windows that contain iframe content.

**Status:** ✅ Complete  
**Version:** 1.0  
**Date:** December 2024

---

## 🎯 Features

### Core Window Management
- ✅ **Draggable Windows** - GPU-accelerated drag with CSS transform
- ✅ **Resizable Windows** - 8 resize handles (N, S, E, W, NE, NW, SE, SW)
- ✅ **Minimize/Maximize/Close** - Full window controls
- ✅ **Window Snapping** - 7 snap zones (left, right, top, 4 corners)
- ✅ **Un-snap on Drag** - Drag snapped window to restore original size
- ✅ **Drag from Maximized** - Drag title bar to exit fullscreen
- ✅ **Double-click Maximize** - Double-click title bar to toggle maximize

### Visual Polish & Animations
- ✅ **Smooth Snap Animations** - 300ms cubic-bezier transitions
- ✅ **Glowing Snap Preview** - Animated preview with labels
- ✅ **Window Open/Close Animations** - Fade + scale effects
- ✅ **Window Shake** - Feedback for invalid actions
- ✅ **Focus Indication** - Brightness/opacity changes for focused windows
- ✅ **Dock Bounce** - macOS-style bounce on window open

### Smart Features
- ✅ **Auto-hide Dock** - Hybrid Ubuntu/macOS behavior
- ✅ **Window State Persistence** - localStorage with debounced saves
- ✅ **Iframe State Preservation** - Navigation state maintained on minimize/restore
- ✅ **URL Tracking** - Saves iframe's current URL on close/reopen
- ✅ **Dynamic Page Titles** - Window titles update with page navigation
- ✅ **Iframe Focus Detection** - Proper focus handling for iframe content
- ✅ **Viewport Resize Protection** - Windows stay visible on browser resize
- ✅ **Safety Checks** - Mouse button detection for edge cases

### Keyboard Shortcuts (VueUse)
- ✅ `Cmd/Ctrl + Shift + ←` → Snap left (50%)
- ✅ `Cmd/Ctrl + Shift + →` → Snap right (50%)
- ✅ `Cmd/Ctrl + Shift + ↑` → Maximize
- ✅ `Cmd/Ctrl + Shift + ↓` → Exit snap/fullscreen
- ✅ `Escape` or `Cmd/Ctrl + W` → Close window
- ✅ **Works inside iframes** - postMessage communication

### Browser-like Navigation
- ✅ **Ctrl/Cmd + Click** links → Opens in new window
- ✅ **Middle-click** links → Opens in new window
- ✅ **Smart Navigation Helper** - `useSmartNavigation()` composable
- ✅ **Prevents browser new tab** - Intercepts default behavior

### UI/UX
- ✅ **Copy URL Button** - Copy window URL to clipboard
- ✅ **Mouse-following Dock Circle** - Glowing effect on dock
- ✅ **Minimized Window Indicators** - Show in dock with pulse animation
- ✅ **Window Icons** - Display app icons in title bar

---

## 🏗️ Architecture

### Component Structure

```
app/pages/desktop.vue (Main container)
│
├─ CommonDesktopWindow.vue (Individual windows)
│  └─ iframe (Page content)
│
└─ Dock (Bottom menu)
   ├─ App Icons
   └─ Minimized Windows
```

### State Management

```typescript
interface WindowState {
  id: string
  title: string
  currentPageTitle?: string
  icon?: string
  url: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  isMaximized: boolean
  isMinimized: boolean
  savedState?: { x, y, width, height }
  isAnimating?: boolean
  isOpening?: boolean
  isClosing?: boolean
  isShaking?: boolean
}
```

### Communication Flow

```
┌──────────────────────────────────────┐
│ Child Page (inside iframe)           │
│ - Keyboard shortcuts                 │
│ - Ctrl+Click detection               │
│ - postMessage to parent              │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ DesktopWindow.vue                    │
│ - Message listener                   │
│ - Emit events to parent              │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ desktop.vue                          │
│ - Handle all window operations       │
│ - Persist to localStorage            │
└──────────────────────────────────────┘
```

---

## 📁 File Structure

```
app/
├── pages/
│   └── desktop.vue                      # Main desktop container
├── components/
│   └── common/
│       └── DesktopWindow.vue           # Individual window component
├── composables/
│   ├── useDisplayMode.ts               # Auto-detect iframe mode
│   ├── useDesktopShortcuts.ts          # Keyboard shortcuts
│   └── useSmartNavigation.ts           # Ctrl+Click navigation helper
└── layouts/
    ├── default.vue                      # Default layout (with shortcuts)
    └── app.vue                          # App layout (with shortcuts)
```

---

## 🎨 Key Technologies

- **Vue 3 Composition API** - Reactive state management
- **VueUse** - `useMagicKeys`, `useMouse`, `useClipboard`, `useDebounceFn`
- **CSS Transforms** - GPU-accelerated dragging
- **PostMessage API** - Iframe communication
- **LocalStorage** - State persistence
- **Nuxt 3** - Framework

---

## 🚀 Usage

### Opening Windows

```typescript
// In desktop.vue
const openWindow = (item: MenuItem) => {
  const newWindow: WindowState = {
    id: `window-${windowIdCounter++}`,
    title: item.label,
    icon: item.icon,
    url: item.url,
    // ... position/size calculated
  }
  windows.value.push(newWindow)
}
```

### Using Smart Navigation

```vue
<template>
  <!-- Automatic: Works with any link -->
  <NuxtLink to="/chat">Chat</NuxtLink>
  
  <!-- Manual: For buttons -->
  <el-button @click="navigateTo('/chat', $event)">
    Go to Chat
  </el-button>
</template>

<script setup>
const { navigateTo } = useSmartNavigation()
</script>
```

### Adding Keyboard Shortcuts

Automatically works in all layouts by calling:

```typescript
useDesktopShortcuts()
```

---

## 🎯 Performance Optimizations

1. **GPU Acceleration**
   - CSS `transform` for dragging (not `left`/`top`)
   - `will-change` hints for browser

2. **Debounced Saves**
   - 500ms debounce on localStorage writes
   - Prevents excessive I/O

3. **Conditional Transitions**
   - Disabled during drag/resize
   - Enabled for snap animations

4. **Request Animation Frame**
   - Smooth drag updates
   - Mouse button safety checks

5. **Iframe State Preservation**
   - Keep minimized windows in DOM
   - CSS visibility instead of v-if

---

## 📊 Statistics

- **Total Lines of Code:** ~2,500+
- **Components:** 3 main (desktop.vue, DesktopWindow.vue, dock)
- **Composables:** 3 (useDisplayMode, useDesktopShortcuts, useSmartNavigation)
- **Features:** 30+ distinct features
- **Animations:** 8 different animation types
- **Keyboard Shortcuts:** 5 commands
- **Development Time:** ~8-10 hours

---

## 🐛 Known Limitations

1. **Cross-origin Iframes**
   - Can't track URL changes for external sites
   - Can't inject shortcuts in cross-origin content
   - Browser security restriction (expected)

2. **Mobile Support**
   - Desktop mode is for desktop/laptop only
   - Mobile uses standard responsive layout

3. **Window Limit**
   - No hard limit, but many windows may impact performance
   - Recommend max 10-15 simultaneous windows

---

## 🔮 Future Enhancements (Optional)

### Not Implemented (Discussed but deferred)

1. **Window Divider** (3-4 hours)
   - Drag divider between two snapped windows
   - Resize both windows simultaneously
   - Complex pair detection algorithm

2. **Window Grouping/Tabs** (2-3 hours)
   - Multiple tabs in one window frame
   - Browser-like tab management

3. **Multiple Desktops** (1-2 hours)
   - Virtual desktops/workspaces
   - Switch between desktop sets

4. **More Keyboard Shortcuts**
   - Alt+Tab for window cycling
   - Cmd+1-9 for desktop switching

---

## ✅ Testing Checklist

- [x] Drag window around
- [x] Resize from all 8 handles
- [x] Minimize and restore
- [x] Maximize and restore
- [x] Close window
- [x] Snap to all 7 zones
- [x] Un-snap by dragging
- [x] Drag from maximized
- [x] Double-click title bar
- [x] All keyboard shortcuts
- [x] Ctrl+Click links
- [x] Middle-click links
- [x] Copy URL button
- [x] Window persistence (close/reopen browser)
- [x] URL tracking (navigate, close, reopen)
- [x] Viewport resize
- [x] Focus indication
- [x] Dock auto-hide
- [x] Shortcuts work in iframes

---

## 👥 Credits

**Developer:** Built with AI assistance (Cursor/Claude)  
**Framework:** Nuxt 3 + Vue 3  
**Inspiration:** macOS window management + Windows 11 snap layouts

