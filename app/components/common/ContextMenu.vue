<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

interface MenuItem {
  label: string
  icon: string
  action: () => void
  divider?: boolean
}

interface Props {
  visible: boolean
  x: number
  y: number
  url: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  navigate: [url: string, target: 'current' | 'tab' | 'window']
}>()

const { copy } = useClipboard()

// Menu items
const menuItems = computed<MenuItem[]>(() => [
  {
    label: 'Open in Current Tab',
    icon: 'lucide:arrow-right',
    action: () => {
      emit('navigate', props.url, 'current')
      emit('close')
    }
  },
  {
    label: 'Open in New Tab',
    icon: 'lucide:plus-square',
    action: () => {
      emit('navigate', props.url, 'tab')
      emit('close')
    }
  },
  {
    label: 'Open in New Window',
    icon: 'lucide:square-plus',
    action: () => {
      emit('navigate', props.url, 'window')
      emit('close')
    }
  },
  {
    label: 'Copy Link',
    icon: 'lucide:link',
    action: () => {
      const fullUrl = props.url.startsWith('http') 
        ? props.url 
        : `${window.location.origin}${props.url}`
      copy(fullUrl)
      emit('close')
    },
    divider: true
  }
])

// Position menu to avoid going off-screen
const menuStyle = computed(() => {
  const padding = 10
  const menuWidth = 200
  const menuHeight = menuItems.value.length * 40 + 20
  
  let x = props.x
  let y = props.y
  
  // Adjust if too close to right edge
  if (x + menuWidth > window.innerWidth - padding) {
    x = window.innerWidth - menuWidth - padding
  }
  
  // Adjust if too close to bottom edge
  if (y + menuHeight > window.innerHeight - padding) {
    y = window.innerHeight - menuHeight - padding
  }
  
  return {
    left: `${x}px`,
    top: `${y}px`
  }
})

// Close on click outside
const handleBackdropClick = () => {
  emit('close')
}

// Close on Escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      emit('close')
    }
  }
  document.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
  })
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="visible" 
        class="context-menu-backdrop"
        @click="handleBackdropClick"
        @contextmenu.prevent="handleBackdropClick"
      >
        <div 
          class="context-menu"
          :style="menuStyle"
          @click.stop
          @contextmenu.stop.prevent
        >
          <div 
            v-for="(item, index) in menuItems" 
            :key="index"
            :class="{ 'menu-item': true, 'has-divider': item.divider }"
            @click="item.action"
          >
            <Icon :name="item.icon" class="menu-icon" />
            <span class="menu-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.context-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  background: transparent;
}

.context-menu {
  position: fixed;
  min-width: 200px;
  background: var(--app-grey-850);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-border-radius-m);
  box-shadow: var(--app-shadow-xl);
  padding: var(--app-space-xs);
  z-index: 10001;
  backdrop-filter: blur(10px);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-s);
  padding: var(--app-space-s) var(--app-space-m);
  border-radius: var(--app-border-radius-s);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--app-text-color);
  user-select: none;
  
  &:hover {
    background: var(--app-grey-800);
    color: var(--app-primary-color);
  }
  
  &.has-divider {
    border-bottom: 1px solid var(--app-border-color);
    margin-bottom: var(--app-space-xs);
    padding-bottom: calc(var(--app-space-s) + var(--app-space-xs));
  }
}

.menu-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.menu-label {
  font-size: var(--app-font-size-s);
  font-weight: 500;
}

// Fade transition
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
  
  .context-menu {
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  
  .context-menu {
    opacity: 0;
    transform: scale(0.95) translateY(-5px);
  }
}
</style>

