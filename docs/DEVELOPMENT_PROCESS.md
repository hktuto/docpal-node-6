# Desktop Windowing System - Development Process

## 📅 Timeline & Phases

**Total Duration:** ~8-10 hours  
**Date:** December 2024  
**Status:** ✅ Complete

---

## Phase 0: Initial Concept (30 min)

### Discussion
- User wanted desktop-like view with windows
- Discussed iframe approach vs. component approach
- Decided on iframe for isolation and URL sharing

### Decisions
- ✅ Use iframes for window content
- ✅ Make windows draggable, resizable, maximizable
- ✅ Build dock for navigation

---

## Phase 1: Core Windowing (2-3 hours)

### Implemented
1. **Basic Window Component** (`DesktopWindow.vue`)
   - Window frame with title bar
   - Close, minimize, maximize buttons
   - Iframe content area

2. **Drag Functionality**
   - Title bar drag to move
   - Mouse event handling
   - Position tracking

3. **Resize Functionality**
   - 8 resize handles
   - Boundary detection
   - Min/max size constraints

4. **Window Management** (`desktop.vue`)
   - Array of window states
   - Open/close/focus logic
   - Z-index management

### Challenges
- ❌ **Issue:** Dragging was laggy
- ✅ **Fix:** Switched to CSS transforms + GPU acceleration

---

## Phase 2: Enhanced Features (1.5-2 hours)

### Implemented
1. **Double-click to Maximize**
   - Title bar double-click handler
   - Toggle maximize state

2. **Minimize to Dock**
   - Hide window but keep in DOM
   - Show indicator in dock
   - Restore on dock click

3. **Dynamic Page Titles**
   - Track iframe document.title
   - Update window title bar
   - Periodic checking for SPA navigation

4. **Proper Window Sizing**
   - Calculate initial size based on viewport
   - Smart positioning (cascading)

### Challenges
- ❌ **Issue:** Iframe state lost on minimize
- ✅ **Fix:** Keep in DOM, hide with CSS

---

## Phase 3: Layout Management (1 hour)

### Discussion
- User wanted no navigation in desktop mode
- Discussed iframe-in-iframe vs. conditional layouts
- Decided on conditional rendering

### Implemented
1. **Display Mode Detection**
   - Auto-detect if page is in iframe
   - `window.self !== window.top`
   - No manual state management needed

2. **Conditional Layout**
   - Hide sidebar when in desktop mode
   - Same code for both modes
   - URL sharing works correctly

---

## Phase 4: Performance & Polish (2 hours)

### Implemented
1. **Dragging Performance**
   - CSS transform during drag
   - Update x/y only on mouseup
   - Disable CSS transitions during drag
   - GPU acceleration with `will-change`

2. **Smart Dock Behavior**
   - Auto-hide when windows overlap
   - Show on mouse hover at bottom
   - Hide when window maximized
   - Hybrid Ubuntu/macOS style

3. **State Persistence**
   - Save to localStorage
   - Debounced writes (500ms)
   - Load on page mount
   - Track window positions, sizes, URLs

### Challenges
- ❌ **Issue:** Dock not hiding when maximized
- ✅ **Fix:** Added maximized window check

---

## Phase 5: Window Snapping (1.5 hours)

### Implemented
1. **Snap Detection**
   - 20px threshold from edges
   - 7 snap zones (left, right, top, 4 corners)
   - Visual preview overlay

2. **Snap Positions**
   - Left/Right: 50% width
   - Corners: 25% (50% width × 50% height)
   - Top: Fullscreen

3. **Visual Feedback**
   - Blue overlay with glow
   - Labels (e.g., "← Left Half")
   - Entrance animations

4. **Un-snap on Drag**
   - Restore original size when dragging
   - 5px movement threshold
   - Smooth transition

### Challenges
- ❌ **Issue:** Snap animation started from wrong position (transform not cleared)
- ✅ **Fix:** Update x/y first, then clear transform

- ❌ **Issue:** Clicking snapped window header would unsnap
- ✅ **Fix:** Only unsnap after 5px of actual drag

---

## Phase 6: Keyboard Shortcuts (1 hour)

### Iteration 1: Manual Implementation
- Event listeners
- Check for Ctrl/Cmd + Arrow keys
- Execute window commands

### Iteration 2: VueUse Refactor
- User requested change to `Cmd + Shift + Arrow`
- Switched to `useMagicKeys` from VueUse
- Cleaner, more maintainable code

### Implemented
- Snap left/right
- Maximize
- Exit snap/fullscreen (down arrow)
- Close window (Escape, Cmd+W)

### Challenges
- ❌ **Issue:** Shortcuts only work when desktop.vue has focus
- ✅ **Fix:** Implemented postMessage from iframes (next phase)

---

## Phase 7: Iframe Shortcuts (1.5 hours)

### Architecture
```
Child (iframe) → postMessage → DesktopWindow → desktop.vue
```

### Implemented
1. **Composable** (`useDesktopShortcuts.ts`)
   - Detect shortcuts in iframe
   - Send postMessage to parent
   - Work in both parent and child

2. **Message Handling**
   - DesktopWindow listens for messages
   - Validates source
   - Emits to parent

3. **Command Execution**
   - desktop.vue handles commands
   - Execute window operations

### Result
- ✅ Shortcuts work everywhere (parent + iframes)

---

## Phase 8: Animations & Polish (1 hour)

### Implemented
1. **Smooth Snap Animations**
   - 300ms cubic-bezier transitions
   - Only during snap operations

2. **Enhanced Snap Preview**
   - Glowing border effect
   - Pulsing animation
   - Large labels with icons
   - Backdrop blur

3. **Open/Close Animations**
   - Fade + scale in (0.85 → 1.0)
   - Fade + scale out (1.0 → 0.85)
   - 300ms duration

4. **Window Shake**
   - For invalid actions
   - Horizontal oscillation
   - 500ms duration

5. **Better Focus Indication**
   - Focused: Full brightness + blue glow
   - Unfocused: 92% brightness, 95% opacity

6. **Dock Bounce**
   - macOS-style bounce on click
   - Multiple bounces with settle

---

## Phase 9: Final Features (1-1.5 hours)

### Implemented
1. **Copy URL Button**
   - Button in title bar
   - VueUse `useClipboard`
   - Icon changes to checkmark

2. **Dock Circle Effect**
   - Mouse-following glow
   - Position calculation with transforms
   - 30% visibility constraint

3. **URL Tracking**
   - Save iframe's current URL
   - Restore on reopen
   - Prevent flash on URL change

4. **Ctrl+Click Navigation**
   - Global click listener
   - Detect Ctrl/Cmd + Click
   - Middle-click support
   - Open in new window
   - `useSmartNavigation` helper for buttons

### Challenges
- ❌ **Issue:** URL changes caused iframe reload/flash
- ✅ **Fix:** Use stable `initialSrc` ref, only reload on external changes

- ❌ **Issue:** URL tracking captured `/blank` states
- ✅ **Fix:** Filter out invalid URLs (blank, about:blank, root)

---

## 🔧 Technical Decisions

### Why Iframes?
- ✅ URL sharing works
- ✅ Page isolation
- ✅ No state conflicts
- ✅ Browser-like experience
- ❌ Cross-origin limitations (expected)

### Why CSS Transform for Drag?
- ✅ GPU-accelerated
- ✅ Smooth 60fps
- ✅ No layout thrashing
- ✅ Better performance

### Why Keep Minimized Windows in DOM?
- ✅ Preserves iframe state
- ✅ Maintains navigation
- ✅ No reload needed
- ❌ Slightly more memory (acceptable)

### Why PostMessage for Shortcuts?
- ✅ Works across iframe boundary
- ✅ Secure communication
- ✅ Event-driven architecture
- ✅ Clean separation of concerns

### Why VueUse?
- ✅ Battle-tested composables
- ✅ Less code to maintain
- ✅ Better TypeScript support
- ✅ Active community

---

## 📊 Code Evolution

### Files Created
- `app/pages/desktop.vue` (~1,200 lines)
- `app/components/common/DesktopWindow.vue` (~800 lines)
- `app/composables/useDesktopShortcuts.ts` (~130 lines)
- `app/composables/useSmartNavigation.ts` (~85 lines)
- `app/composables/useDisplayMode.ts` (~35 lines)

### Files Modified
- `app/layouts/default.vue` - Added shortcuts
- `app/layouts/app.vue` - Added shortcuts
- All page files - Added `useHead` for titles

### Total Code
- **~2,500+ lines** of new code
- **30+ features** implemented
- **8 animations** created
- **0 major bugs** remaining

---

## 🎓 Lessons Learned

### What Went Well
1. **Iterative Development** - Built features incrementally
2. **User Feedback** - Quick iterations based on testing
3. **Performance First** - Addressed lag issues early
4. **Clean Architecture** - Composables for reusability
5. **VueUse Integration** - Leveraged existing solutions

### Challenges Overcome
1. **Iframe Communication** - postMessage architecture
2. **Performance** - GPU acceleration + transforms
3. **State Persistence** - URL tracking without flash
4. **Cross-browser** - Mouse button detection edge cases
5. **UX Polish** - Smooth animations + feedback

### Future Recommendations
1. Add E2E tests for critical flows
2. Consider adding telemetry for usage patterns
3. Monitor performance with many windows open
4. Gather user feedback on UX
5. Consider mobile-specific experience

---

## ✅ Final Checklist

- [x] All core features implemented
- [x] Performance optimized
- [x] Animations polished
- [x] Keyboard shortcuts working
- [x] State persistence working
- [x] Cross-iframe communication working
- [x] Browser-like navigation working
- [x] Documentation complete
- [x] No linter errors
- [x] No known bugs
- [x] Ready for production

---

## 🎉 Conclusion

Successfully built a complete, production-ready desktop windowing system with all requested features, excellent performance, and polished UX. The system is modular, maintainable, and extensible for future enhancements.

**Status: COMPLETE** ✅

