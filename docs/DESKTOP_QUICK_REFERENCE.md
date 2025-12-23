# Desktop Windowing System - Quick Reference

## 🚀 User Guide

### Opening Windows
- Click any icon in the dock
- Windows open with smooth animation

### Window Controls

#### Mouse Actions
- **Drag title bar** → Move window
- **Drag edges/corners** → Resize window
- **Double-click title bar** → Maximize/restore
- **Click minimize button (−)** → Minimize to dock
- **Click maximize button (□)** → Maximize/restore
- **Click close button (×)** → Close window
- **Click dock indicator** → Restore minimized window

#### Keyboard Shortcuts
- `Cmd/Ctrl + Shift + ←` → Snap to left half
- `Cmd/Ctrl + Shift + →` → Snap to right half
- `Cmd/Ctrl + Shift + ↑` → Maximize
- `Cmd/Ctrl + Shift + ↓` → Exit snap/restore from fullscreen
- `Escape` or `Cmd/Ctrl + W` → Close window

#### Window Snapping
- **Drag to left edge** → Snap to left 50%
- **Drag to right edge** → Snap to right 50%
- **Drag to top edge** → Maximize
- **Drag to top-left corner** → Snap to top-left 25%
- **Drag to top-right corner** → Snap to top-right 25%
- **Drag to bottom-left corner** → Snap to bottom-left 25%
- **Drag to bottom-right corner** → Snap to bottom-right 25%
- **Drag snapped window** → Restore original size

#### Navigation
- **Ctrl/Cmd + Click** any link → Open in new window
- **Middle-click** any link → Open in new window
- **Click link icon** in title bar → Copy URL

---

## 👨‍💻 Developer Guide

### Using Smart Navigation

```vue
<template>
  <!-- Automatic: NuxtLink -->
  <NuxtLink to="/chat">Chat</NuxtLink>
  
  <!-- Manual: Buttons -->
  <el-button @click="navigateTo('/chat', $event)">
    Go to Chat
  </el-button>
</template>

<script setup>
const { navigateTo } = useSmartNavigation()
</script>
```

### Adding Dynamic Titles

```vue
<script setup>
useHead({
  title: 'My Page Title'
})
</script>
```

### Key Files
- `app/pages/desktop.vue` - Main container
- `app/components/common/DesktopWindow.vue` - Window component
- `app/composables/useDesktopShortcuts.ts` - Keyboard shortcuts
- `app/composables/useSmartNavigation.ts` - Navigation helper
- `app/composables/useDisplayMode.ts` - Mode detection

### State Structure

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
  // Animation flags...
}
```

---

## 🐛 Troubleshooting

### Window won't open
- Check console for errors
- Verify URL is valid
- Clear localStorage: `localStorage.removeItem('desktop-windows')`

### Shortcuts not working inside iframe
- Verify `useDesktopShortcuts()` is called in layout
- Check browser console for postMessage errors

### Window disappeared after browser resize
- Should auto-correct on next interaction
- Reload page to reset all windows

### Iframe navigation state lost
- Only works for same-origin pages
- Cross-origin iframes will reset (browser security)

### Dragging feels laggy
- Disable browser extensions
- Check CPU usage
- Clear browser cache

---

## 📊 Performance Tips

1. **Limit Open Windows** - Keep under 10-15 for best performance
2. **Close Unused Windows** - Free up memory
3. **Avoid Heavy Iframes** - Pages with lots of JS/media
4. **Clear Persistence** - Occasionally clear localStorage
5. **Use Latest Browser** - Chrome/Edge/Safari latest versions

---

## 🎨 Customization

### Dock Configuration

Edit `app/pages/desktop.vue`:

```typescript
const menu: MenuItem[] = [
  {
    label: 'Home',
    icon: 'lucide:house',
    url: '/',
  },
  // Add more items...
]
```

### Window Defaults

Edit `app/pages/desktop.vue`:

```typescript
const calculateWindowSize = () => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  return {
    width: Math.min(800, viewportWidth * 0.6),
    height: Math.min(600, viewportHeight * 0.7)
  }
}
```

### Snap Threshold

Edit `app/pages/desktop.vue`:

```typescript
const SNAP_THRESHOLD = 20 // Pixels from edge
```

---

## 📚 Related Documentation

- `DESKTOP_WINDOWING_SYSTEM.md` - Complete feature documentation
- `DEVELOPMENT_PROCESS.md` - Development timeline and decisions
- `DESKTOP_MODE_AUTO_DETECT.md` - Display mode detection details

---

## 🆘 Support

For issues or questions:
1. Check documentation
2. Review console errors
3. Test in incognito mode
4. Clear localStorage and test again
5. Report bugs with reproduction steps

