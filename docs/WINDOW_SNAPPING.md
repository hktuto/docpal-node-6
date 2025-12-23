# Window Snapping Feature

## Overview

Windows-style window snapping with visual preview overlay. Drag windows to screen edges to automatically resize and position them.

## Features Implemented

### 1. **Edge Snapping**
- **Left Edge**: 50% width, left half of screen
- **Right Edge**: 50% width, right half of screen
- **Top Edge**: Fullscreen (maximize)

### 2. **Corner Snapping (Quadrants)**
- **Top-Left**: 25% (top-left quadrant)
- **Top-Right**: 25% (top-right quadrant)
- **Bottom-Left**: 25% (bottom-left quadrant)
- **Bottom-Right**: 25% (bottom-right quadrant)

### 3. **Visual Preview**
- Translucent blue overlay
- Shows where window will snap
- Appears when within 20px of edge
- Smooth transitions

### 4. **Un-snap**
- Saves previous size before snap
- Drag snapped window → returns to saved size
- Works with maximize/restore

## Usage

### Basic Snapping
1. **Drag window to left edge** → Snaps to left 50%
2. **Drag window to right edge** → Snaps to right 50%
3. **Drag window to top edge** → Maximizes

### Quadrant Snapping
1. **Drag to top-left corner** → Snaps to top-left 25%
2. **Drag to top-right corner** → Snaps to top-right 25%
3. **Drag to bottom-left corner** → Snaps to bottom-left 25%
4. **Drag to bottom-right corner** → Snaps to bottom-right 25%

### Un-snap
1. **Click and drag snapped window** → Returns to floating
2. **Restores previous size** automatically

## Implementation Details

### Snap Detection
```typescript
const checkSnapZone = (x: number, y: number): SnapZone => {
  const threshold = 20 // pixels from edge
  
  // Check corners first (more specific)
  if (x < threshold && y < threshold) return 'top-left'
  // ... other corners
  
  // Check edges
  if (x < threshold) return 'left'
  if (x > viewportWidth - threshold) return 'right'
  if (y < threshold) return 'top'
  
  return null
}
```

### Snap Positions
```typescript
const positions = {
  'left': { x: 0, y: 0, width: 50%, height: 100% },
  'right': { x: 50%, y: 0, width: 50%, height: 100% },
  'top': { x: 0, y: 0, width: 100%, height: 100% },
  'top-left': { x: 0, y: 0, width: 50%, height: 50% },
  // ... other corners
}
```

### Event Flow
```
1. User starts dragging window
   ↓
2. Mouse moves (emit 'dragMove')
   ↓
3. Check if near edge → Show preview
   ↓
4. User releases mouse (emit 'dragEnd')
   ↓
5. Snap to zone if preview active
   ↓
6. Clear preview
```

## Visual Design

### Preview Overlay
- **Color**: Blue with transparency
- **Border**: 3px solid blue
- **Opacity**: 20% background, 60% border
- **Animation**: 0.15s ease transition
- **Z-index**: 9998 (below windows, above desktop)

```css
.snap-preview {
  background: rgba(59, 130, 246, 0.2);
  border: 3px solid rgba(59, 130, 246, 0.6);
  transition: all 0.15s ease;
}
```

## Performance

- ✅ **GPU-accelerated**: Preview uses fixed positioning
- ✅ **Minimal overhead**: Only checks edges during drag
- ✅ **No jank**: Snap happens on mouseup, not during drag
- ✅ **Smooth preview**: CSS transitions

## User Experience

### Advantages
- ✅ Familiar (Windows/macOS users know it)
- ✅ Fast multitasking
- ✅ Visual feedback before snap
- ✅ Easy to compare two windows side-by-side

### Edge Cases Handled
- ✅ Maximized windows can be un-snapped
- ✅ Snapped windows persist across page reload
- ✅ Dock auto-hides when snapped full-width
- ✅ Preview clears if drag cancelled

## Configuration

```typescript
const SNAP_THRESHOLD = 20  // Pixels from edge to trigger
```

## Future Enhancements (Not Implemented)

- [ ] Divider between two 50% windows
- [ ] Drag divider to resize both simultaneously
- [ ] Keyboard shortcuts (Win+Arrow)
- [ ] Custom snap zones (33%, 66%, etc.)
- [ ] Snap to other windows (magnetic edges)
- [ ] Multi-monitor support
- [ ] Snap animation (smooth resize to position)

## Testing Checklist

- [x] Drag to left edge → Snaps to left 50%
- [x] Drag to right edge → Snaps to right 50%
- [x] Drag to top edge → Maximizes
- [x] Drag to corners → Snaps to quadrants
- [x] Preview shows before snap
- [x] Preview position matches final snap
- [x] Drag away from edge → Window floats
- [x] Un-snap restores previous size
- [x] Works with multiple windows
- [x] Persists across page reload
- [x] Dock hides when window snapped full-width

## Known Limitations

1. **No divider resize**: Can't resize two 50% windows together
2. **No multi-monitor**: Only supports single screen
3. **No custom zones**: Fixed 50%/25% sizes only
4. **Viewport only**: Doesn't account for taskbar/dock on other OS

## Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Works on all modern browsers

