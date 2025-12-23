# Smart Dock Implementation (Ubuntu + macOS Hybrid)

## Overview

Intelligent dock that auto-hides when windows overlap and shows on mouse hover, with persistent window state.

## Features

### 1. **Smart Auto-Hide** (Ubuntu-style)
- **Default**: Dock visible
- **Auto-hide**: When window overlaps dock area (bottom 100px)
- **Show**: When there's room (no overlap)

### 2. **Mouse Hover Show** (macOS-style)
- **Hover trigger**: Mouse within 50px of bottom edge
- **Force show**: Dock slides up regardless of overlap
- **Auto-hide**: Hides 1s after mouse moves away

### 3. **Window State Persistence**
- Saves to localStorage (debounced 500ms)
- Persists: position, size, URL, maximize/minimize state
- Restores on page reload
- Syncs: z-index, window counter

## Implementation Details

### Auto-Hide Logic

```typescript
checkDockOverlap() {
  // Check if any visible window overlaps dock area
  const hasOverlap = windows.some(win => {
    const windowBottom = win.y + win.height
    const dockTop = viewportHeight - DOCK_HEIGHT
    return windowBottom > dockTop
  })
  
  isDockVisible = !hasOverlap
}
```

### Mouse Hover Detection

```typescript
handleMouseMove(e) {
  const bottomDistance = window.innerHeight - e.clientY
  
  if (bottomDistance <= 50) {
    // Force show dock
    isDockVisible = true
    isDockForceVisible = true
  } else {
    // Schedule hide after 1s
    setTimeout(() => {
      isDockForceVisible = false
      checkDockOverlap() // Re-check overlap
    }, 1000)
  }
}
```

### localStorage Persistence

```typescript
// Save (debounced 500ms)
saveWindowsState() {
  const state = windows.map(win => ({
    id, title, url, x, y, width, height,
    isMaximized, isMinimized, currentPageTitle
  }))
  localStorage.setItem('desktopWindows', JSON.stringify(state))
}

// Load on mount
loadWindowsState() {
  const saved = localStorage.getItem('desktopWindows')
  windows = JSON.parse(saved)
  checkDockOverlap()
}
```

## User Experience

### Scenario 1: Window Overlap
```
1. Window positioned at bottom
2. Window overlaps dock area (bottom 100px)
3. Dock automatically slides down
4. Move window away
5. Dock automatically slides up
```

### Scenario 2: Mouse Hover
```
1. Dock hidden (due to overlap)
2. User moves mouse to bottom edge
3. Dock slides up immediately
4. User moves mouse away
5. Dock waits 1s, then checks overlap
6. If still overlapping, hides again
```

### Scenario 3: Persistence
```
1. User opens multiple windows
2. Arranges them perfectly
3. Refreshes page or closes browser
4. Returns later
5. All windows restored to exact positions
6. Current page titles maintained
```

## Configuration

```typescript
const DOCK_HEIGHT = 100        // Dock area height
const HOVER_THRESHOLD = 50     // Mouse distance to trigger show
const DEBOUNCE_DELAY = 500     // Save delay
const HIDE_DELAY = 1000        // Hide delay after mouse leaves
```

## CSS Transitions

```css
.floatingMenuDockContainer {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
}

.floatingMenuDockContainer.dock-hidden {
  transform: translateY(calc(100% + 16px));
  opacity: 0;
  pointer-events: none;
}
```

## Triggers for Dock Visibility Check

1. **Window position change** (drag)
2. **Window size change** (resize)
3. **Window open/close**
4. **Window minimize/restore**
5. **Window maximize/restore**
6. **Mouse movement** (force show override)

## localStorage Schema

```json
{
  "desktopWindows": [
    {
      "id": "window-0",
      "title": "Workspaces",
      "currentPageTitle": "My Workspaces - DocPal",
      "icon": "lucide:database",
      "url": "/workspaces",
      "x": 100,
      "y": 80,
      "width": 900,
      "height": 600,
      "isMaximized": false,
      "isMinimized": false,
      "savedState": null
    }
  ],
  "desktopNextZIndex": "1003",
  "desktopWindowIdCounter": "3"
}
```

## Performance Optimizations

1. **Debounced Save**: 500ms delay prevents excessive localStorage writes
2. **RAF for Drag**: GPU-accelerated window movement
3. **CSS Transitions**: Hardware-accelerated dock animations
4. **Computed Overlap**: Only checks visible, non-minimized windows
5. **Delayed Hide**: 1s timeout prevents flickering

## Browser Compatibility

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ℹ️ Requires localStorage enabled
- ℹ️ Same-origin iframes only (for title detection)

## Future Enhancements

- [ ] Multiple dock positions (left, right, top)
- [ ] Dock size preferences
- [ ] Export/import window layouts
- [ ] Named workspace presets
- [ ] Gesture shortcuts

