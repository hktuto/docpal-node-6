# Phase 2.5: Desktop Windowing System

**Status**: 🚧 **In Progress** (Foundation Complete, Enhancements Planned)  
**Estimated Duration**: 3-4 weeks  
**Started**: Dec 22, 2025  
**Foundation Completed**: Dec 23, 2025  
**Current Progress**: Core 100% ✅ | Enhancements 0% 📋

---

## Overview

Build a complete desktop windowing system that provides a native OS-like experience within the browser. Users can open multiple windows, organize them with dock, use keyboard shortcuts, and enjoy smooth animations and interactions.

**Key Philosophy**: Solid foundation first, then advanced features. Ensure mobile responsiveness, browser history integration, and extensibility.

---

## Phase 2.5.1: Core Desktop Windowing ✅ **COMPLETE**

### Completed Features

#### Window Management ✅
- [x] Draggable windows with smooth performance (GPU-accelerated)
- [x] Resizable windows with edge/corner handles
- [x] Maximize/restore windows
- [x] Minimize windows to dock
- [x] Close windows
- [x] Z-index management (bring to front on click)
- [x] Focus management with visual indicators
- [x] Window title updates from iframe page title
- [x] Window URL tracking for navigation persistence

#### Dock System ✅
- [x] Bottom dock with app icons
- [x] Dock items from menu configuration
- [x] Minimized window indicators in dock
- [x] Click to open/restore windows
- [x] Auto-hide dock (Ubuntu/macOS hybrid style)
  - [x] Default visible
  - [x] Hide when window overlaps
  - [x] Show on mouse near bottom edge
- [x] Dock bounce animation on window open
- [x] Mouse-following circular background effect

#### Window Snapping ✅
- [x] Snap to left half (Cmd/Ctrl + Shift + ←)
- [x] Snap to right half (Cmd/Ctrl + Shift + →)
- [x] Snap to fullscreen (Cmd/Ctrl + Shift + ↑)
- [x] Exit snap/fullscreen (Cmd/Ctrl + Shift + ↓)
- [x] Drag to edge for snap preview
- [x] Visual snap zones with glow effect
- [x] Snap zone labels
- [x] Drag snapped window to exit snap mode
- [x] Restore original size after exiting snap

#### Keyboard Shortcuts ✅
- [x] Cmd/Ctrl + Shift + Arrow keys for snapping
- [x] Escape or Cmd/Ctrl + W to close window
- [x] Works across iframes (postMessage architecture)
- [x] Prevent browser default behaviors
- [x] Shake animation on invalid actions
- [x] Focus-aware shortcut handling

#### Cross-iframe Communication ✅
- [x] Auto-detect iframe mode (`useDisplayMode`)
- [x] postMessage architecture for shortcuts
- [x] Iframe sends commands to parent
- [x] Parent executes window actions
- [x] Ctrl/Cmd + Click to open new window
- [x] Middle-click to open new window
- [x] Block browser's default "open in new tab"

#### Visual Polish ✅
- [x] Smooth open/close animations
- [x] Snap transition animations
- [x] Window shake on invalid actions
- [x] Better focus indication (border highlight)
- [x] Snap zone glow effects
- [x] Dock bounce animation
- [x] Mouse-following dock circle

#### State Persistence ✅
- [x] Save window positions to localStorage
- [x] Save window sizes to localStorage
- [x] Save window URLs (navigation state)
- [x] Save minimized state
- [x] Debounced updates for performance
- [x] Restore windows on page reload

#### Performance Optimizations ✅
- [x] GPU-accelerated dragging (CSS transform)
- [x] requestAnimationFrame for smooth updates
- [x] Disable CSS transitions during drag/resize
- [x] Optimized iframe reload prevention
- [x] Efficient z-index management

#### Utilities & Composables ✅
- [x] `useDisplayMode` - Detect iframe mode
- [x] `useDesktopShortcuts` - Cross-iframe shortcuts
- [x] `useSmartNavigation` - Ctrl+Click aware navigation
- [x] `useClipboard` - Copy URL functionality
- [x] VueUse integration (`useMagicKeys`, `useMouse`, etc.)

#### Documentation ✅
- [x] Complete desktop windowing system docs
- [x] Development process documentation
- [x] Quick reference guide
- [x] Keyboard shortcuts reference
- [x] Troubleshooting guide

---

## Phase 2.5.2: Desktop Foundation Enhancements 📋 **PLANNED**

### Goals

Solidify the desktop windowing foundation with mobile support, responsive design, browser history integration, and advanced dock features.

---

### 1. Mobile & Responsive Support 📱

**Goal**: Ensure desktop view gracefully handles mobile devices and small screens

#### Tasks
- [ ] Detect mobile devices and screen size
- [ ] Create mobile-optimized layout for desktop page
  - [ ] Full-screen window mode (no floating windows)
  - [ ] Swipe gestures to switch windows
  - [ ] Bottom navigation instead of dock
  - [ ] Mobile-friendly window controls
- [ ] Handle default layout mobile view
  - [ ] Standard mobile navigation
  - [ ] No desktop mode on mobile by default
  - [ ] Option to enable desktop mode (tablet landscape)
- [ ] Handle app layout mobile view
  - [ ] Responsive app menu (hamburger menu)
  - [ ] Mobile-optimized sidebar
  - [ ] Touch-friendly controls
- [ ] Add viewport meta tag for proper scaling
- [ ] Test on various mobile devices and screen sizes

**Acceptance Criteria**:
- [ ] Desktop view works on mobile without UI breaking
- [ ] Touch gestures work smoothly
- [ ] No horizontal scrolling on mobile
- [ ] Keyboard shortcuts disabled on mobile (no physical keyboard)

---

### 2. Small Window Responsive Design 🪟

**Goal**: Handle small iframe window sizes gracefully

#### Tasks
- [ ] Detect small window sizes in iframe
- [ ] Make app menu responsive for small windows
  - [ ] Collapse to icon-only mode
  - [ ] Hamburger menu for very small windows
  - [ ] Tooltip on hover for collapsed items
- [ ] Adjust DataGrid for small windows
  - [ ] Fewer visible columns
  - [ ] Horizontal scroll for overflow
  - [ ] Compact row height
- [ ] Responsive form layouts in small windows
  - [ ] Single column layout
  - [ ] Smaller input controls
  - [ ] Compact spacing
- [ ] Add window size indicators (optional)
- [ ] Test common window sizes (400px, 600px, 800px width)

**Acceptance Criteria**:
- [ ] App menu doesn't break in 400px width window
- [ ] Content remains accessible in small windows
- [ ] No overlapping UI elements
- [ ] Smooth transitions between responsive breakpoints

---

### 3. Desktop Window Browser History 🔙

**Goal**: Integrate iframe navigation with browser history API

#### Tasks
- [ ] Implement browser history tracking
  - [ ] Push state when window opens
  - [ ] Update state when iframe navigates
  - [ ] Handle browser back/forward buttons
  - [ ] Update window focus on history navigation
- [ ] URL structure design
  - [ ] Format: `/desktop?windows=win1:/tables/1,win2:/folders/2`
  - [ ] Or: `/desktop/:windowId/:path`
  - [ ] Support multiple windows in URL
- [ ] History state management
  - [ ] Save all open windows in history
  - [ ] Save window positions and states
  - [ ] Restore windows on browser back
  - [ ] Clear history on desktop close
- [ ] Handle edge cases
  - [ ] Browser back with no history (close window?)
  - [ ] Multiple windows navigating simultaneously
  - [ ] History quota limits
  - [ ] Incognito mode considerations
- [ ] Add navigation controls
  - [ ] Back/forward buttons in window header
  - [ ] Show current URL in window
  - [ ] Breadcrumb for nested navigation

**Acceptance Criteria**:
- [ ] Browser back button closes last opened window
- [ ] Refreshing page restores all windows with navigation state
- [ ] URL is shareable and restores same desktop state
- [ ] History navigation is smooth and predictable

---

### 4. Pin Custom Pages to Dock 📌

**Goal**: Allow users to pin any page to dock for quick access

#### Tasks
- [ ] Add "Pin to Dock" functionality
  - [ ] Pin button in window header (or right-click menu)
  - [ ] Pin any internal URL
  - [ ] Custom icon selector
  - [ ] Custom label for pinned item
- [ ] Dock item management UI
  - [ ] Drag to reorder dock items
  - [ ] Right-click to edit/unpin
  - [ ] Visual indicator for custom vs menu items
  - [ ] Group custom items separately (optional)
- [ ] Persistence
  - [ ] Save pinned items to localStorage
  - [ ] Or save to user preferences in database
  - [ ] Sync across devices (optional)
- [ ] Icon system
  - [ ] Icon picker modal
  - [ ] Support Iconify icons
  - [ ] Support emoji icons
  - [ ] Upload custom icons (optional)
- [ ] Enhanced dock features
  - [ ] Badge notifications on dock items
  - [ ] Right-click context menu
  - [ ] Pin limit (e.g., max 20 items)
  - [ ] Search pinned items

**Acceptance Criteria**:
- [ ] Users can pin any page to dock
- [ ] Pinned items persist across sessions
- [ ] Custom icons display correctly
- [ ] Dock items can be reordered by drag
- [ ] Easy to unpin items

---

### 5. Multiple Desktop Groups (Workspaces) 🗂️

**Goal**: Create multiple desktop groups for different contexts/projects

#### Tasks
- [ ] Desktop group/workspace concept
  - [ ] Each group has its own set of windows
  - [ ] Each group has its own dock configuration
  - [ ] Switch between groups instantly
  - [ ] Name and icon for each group
- [ ] Group switcher UI
  - [ ] Keyboard shortcut (Cmd/Ctrl + 1-9)
  - [ ] Visual switcher (top bar or sidebar)
  - [ ] Show preview of each group
  - [ ] Drag window to different group
- [ ] Group management
  - [ ] Create new group
  - [ ] Rename group
  - [ ] Delete group
  - [ ] Duplicate group
  - [ ] Set default group
- [ ] Persistence
  - [ ] Save all groups to localStorage
  - [ ] Save active group
  - [ ] Restore groups on page load
  - [ ] Export/import groups (JSON)
- [ ] Advanced features
  - [ ] Templates for common group setups
  - [ ] Auto-organize windows into groups (AI suggestion)
  - [ ] Group-specific settings (theme, layout)
  - [ ] Search across all groups
- [ ] Integration with browser history
  - [ ] Include group ID in URL
  - [ ] Restore correct group from URL
  - [ ] Browser back switches groups if needed

**Acceptance Criteria**:
- [ ] Users can create multiple desktop groups
- [ ] Switch between groups without losing window state
- [ ] Each group is independent
- [ ] Groups persist across sessions
- [ ] Keyboard shortcuts work across groups

---

## Technical Architecture

### Key Files

#### Core Components
- `app/pages/desktop.vue` - Main desktop page, window management
- `app/components/common/DesktopWindow.vue` - Individual window component
- `app/layouts/default.vue` - Layout with desktop mode detection
- `app/layouts/app.vue` - App layout with desktop mode detection

#### Composables
- `app/composables/useDisplayMode.ts` - Detect iframe mode
- `app/composables/useDesktopShortcuts.ts` - Cross-iframe shortcuts
- `app/composables/useSmartNavigation.ts` - Ctrl+Click navigation

#### Documentation
- `docs/DESKTOP_WINDOWING_SYSTEM.md` - Complete system documentation
- `docs/DEVELOPMENT_PROCESS.md` - Development timeline
- `docs/DESKTOP_QUICK_REFERENCE.md` - Quick reference guide

### State Management

```typescript
interface WindowState {
  id: string
  label: string
  icon: string
  url: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  isMinimized: boolean
  isMaximized: boolean
  isFocused: boolean
  isAnimating: boolean
  isOpening: boolean
  isClosing: boolean
  isShaking: boolean
  savedState?: {
    x: number
    y: number
    width: number
    height: number
  }
}
```

### Browser Storage Schema

```typescript
// localStorage key: 'desktop-windows'
interface DesktopStorage {
  windows: Array<{
    label: string
    icon: string
    url: string
    x: number
    y: number
    width: number
    height: number
    isMinimized: boolean
  }>
}

// localStorage key: 'desktop-pinned-items'
interface PinnedItems {
  items: Array<{
    id: string
    label: string
    icon: string
    url: string
    order: number
  }>
}

// localStorage key: 'desktop-groups'
interface DesktopGroups {
  groups: Array<{
    id: string
    name: string
    icon: string
    windows: WindowState[]
    pinnedItems: PinnedItems
  }>
  activeGroupId: string
}
```

---

## Success Criteria

### Phase 2.5.1 ✅ Complete
- [x] Desktop windowing works smoothly
- [x] Keyboard shortcuts work across iframes
- [x] Windows persist across page reloads
- [x] Performance is excellent (60fps dragging)
- [x] Visual polish is complete
- [x] Documentation is comprehensive

### Phase 2.5.2 📋 Planned
- [ ] Works perfectly on mobile devices
- [ ] Responsive design handles all window sizes
- [ ] Browser history integration is seamless
- [ ] Users can pin custom pages to dock
- [ ] Multiple desktop groups work smoothly
- [ ] All features are well-documented

---

## Future Enhancements (Phase 6+)

Ideas for future iterations:

- [ ] **Window Tabs** - Multiple tabs within a window
- [ ] **Split View** - Split window into panes
- [ ] **Picture-in-Picture** - Mini floating windows
- [ ] **Window Sessions** - Save/restore window layouts
- [ ] **Workspace Sync** - Sync desktop across devices
- [ ] **AI Window Manager** - AI suggests window arrangements
- [ ] **Window Previews** - Hover over dock for preview
- [ ] **Window Search** - Quick search to find windows
- [ ] **Window Gestures** - Multi-touch gestures
- [ ] **Window Animations** - More elaborate animations
- [ ] **Themes** - Desktop themes (dark, light, custom)
- [ ] **Window Rules** - Auto-arrange by rules
- [ ] **Extension API** - Plugin system for windows

---

## Development Timeline

### Week 1 (Dec 22-23, 2025) ✅ Complete
- Day 1: Core windowing (drag, resize, maximize, minimize)
- Day 2: Dock system, window snapping, keyboard shortcuts
- Day 3: Visual polish, animations, documentation

### Week 2-3 (Planned)
- Mobile responsive design (3-4 days)
- Browser history integration (2-3 days)
- Pin to dock (2-3 days)

### Week 3-4 (Planned)
- Multiple desktop groups (4-5 days)
- Testing and polish (2-3 days)
- Documentation updates (1 day)

---

## Dependencies

**Requires**: Phase 2 (Auth & Company) ✅

**Blocks**: None (independent feature)

**Enhances**: All phases (better UX for entire app)

---

## Notes

### Design Decisions

1. **Desktop-First Approach**: Built for desktop users primarily, with mobile as secondary
2. **iframe Architecture**: Each window is an iframe for isolation and navigation
3. **postMessage Communication**: Cross-iframe messaging for shortcuts and commands
4. **localStorage Persistence**: Simple, fast, no backend needed for basic persistence
5. **GPU Acceleration**: CSS transforms for 60fps performance
6. **Hybrid Auto-hide**: Ubuntu + macOS style for best of both worlds

### Challenges Solved

1. **Cross-iframe Shortcuts**: Solved with postMessage architecture
2. **Iframe Reload Prevention**: Stable ref for iframe src
3. **Smooth Animations**: Careful state management with nextTick
4. **Drag Performance**: GPU-accelerated transforms with RAF
5. **Focus Management**: Click detection inside iframes

### Lessons Learned

1. **Foundation First**: Building solid core before polish was right approach
2. **VueUse is Powerful**: `useMagicKeys`, `useMouse` saved significant time
3. **nextTick is Critical**: For animation timing and transform clearing
4. **postMessage is Reliable**: Good solution for cross-iframe communication
5. **Documentation Matters**: Comprehensive docs make maintenance easier

---

**Status**: Phase 2.5.1 Complete ✅ | Phase 2.5.2 Ready to Start 📋

**Next Steps**: Choose which enhancement to tackle first (mobile? history? pin? groups?)

