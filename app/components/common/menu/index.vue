<script setup lang="ts">
import UserMenu from './UserMenu.vue'
const emit = defineEmits(['expandStateChange', 'close', 'menuClick'])
type MenuItem = {
    label?: string | Function
    icon?: string | Function
    url?: string | Function
    component?: Component
    action?: (event?: MouseEvent) => void
    hidden?: () => boolean
}
const expandState = defineModel<boolean>('expandState', { required: true })
const mobileOpen = defineModel<boolean>('mobileOpen', { default: false })

const { isMobile: _isMobile } = useDisplayMode()

const props = defineProps<{
  menu?: any[] // Optional menu prop for custom menu items
  forceDesktop?: boolean // Force desktop mode (disable responsive mobile behavior)
}>()

// Use forceDesktop prop to override mobile detection
const isMobile = computed(() => props.forceDesktop ? false : _isMobile.value)

const menu:MenuItem[] = [
    {
        label: 'Home',
        icon: 'lucide:house',
        url: '/',
    },
    {
        label: 'Workspaces',
        icon: 'lucide:database',
        url: '/workspaces',
    },{
        label: "Chat",
        icon: 'lucide:message-circle',
        url: '/chat',
    },{
        label: "Calendar",
        icon: 'lucide:calendar',
        url: '/calendar',
    },{
        label: "Files",
        icon: 'lucide:folder',
        url: '/files',
    }
    
]

const route = useRoute()
const { isDesktopMode, isTabMode } = useDisplayMode()

// Open current page in desktop mode
const openInDesktop = (event?: MouseEvent) => {
    let desktopUrl = ""
  if(isTabMode.value){
    desktopUrl = "/desktop"
  }else{
      const currentPath = route.fullPath
      desktopUrl = `/desktop?open=${encodeURIComponent(currentPath)}`
    }
  
  // Ctrl/Cmd+Click: Open in new tab
  if (event?.ctrlKey || event?.metaKey) {
    window.open(desktopUrl, '_blank')
  } else {
    // Default: Replace current page
    navigateTo(desktopUrl)
  }
}

// Open current page in tab mode
const openInTabMode = (event?: MouseEvent) => {
  const currentPath = route.fullPath
  const tabUrl = `/tabs?open=${encodeURIComponent(currentPath)}`
  
  // Ctrl/Cmd+Click: Open in new tab
  if (event?.ctrlKey || event?.metaKey) {
    window.open(tabUrl, '_blank')
  } else {
    // Default: Replace current page
    navigateTo(tabUrl)
  }
}

const footerMenu: MenuItem[] = [
    {
        label: 'Tab Mode',
        icon: 'lucide:layout-list',
        action: openInTabMode,
        hidden: () => isTabMode.value, // Hide when already in tab mode
    },
    {
        label: 'Desktop Mode',
        icon: 'lucide:layout-grid',
        action: openInDesktop,
        hidden: () => isMobile.value, // Hide when mobile
    },
    {
        label: 'Settings',
        icon: 'lucide:settings',
        url: '/settings',
    },
    {
        component: UserMenu,
    },
    {
        label: () => (expandState.value ? 'Collapse' : 'Expand'),
        icon: () => (expandState.value ? 'lucide:chevron-left' : 'lucide:chevron-right'),
        action: () => toggleExpand(),
    }
]

const toggleExpand = () => {
    expandState.value = !expandState.value
    emit('expandStateChange', expandState.value)
}

function handleClick(item: any, event?: MouseEvent) {
    // Close mobile menu when clicking a menu item
    if (isMobile.value && mobileOpen.value) {
        mobileOpen.value = false
        emit('close')
    }
    
    // In tab mode, emit menu-click event instead of navigating
    if (isTabMode.value && item.url) {
        emit('menuClick', {
            label: typeof item.label === 'function' ? item.label() : item.label,
            icon: typeof item.icon === 'function' ? item.icon() : item.icon,
            url: typeof item.url === 'function' ? item.url() : item.url,
        }, event)
        return
    }
    
    if(item.url) {
        navigateTo(item.url)
        return
    }
    if(item.action) {
        item.action(event)
        return
    }
}

function handleBackdropClick() {
    if (isMobile.value && mobileOpen.value) {
        mobileOpen.value = false
        emit('close')
    }
}

// On mobile, always show expanded
const effectiveExpandState = computed(() => {
    return isMobile.value ? true : expandState.value
})

// Check if route is active (exact match or child route)
function isRouteActive(itemUrl?: any): boolean {
    if (!itemUrl || typeof itemUrl !== 'string') return false
    
    // Exact match
    if (route.path === itemUrl) return true
    
    // Child route match (e.g., /workspaces is active when on /workspaces/123)
    if (itemUrl !== '/' && route.path.startsWith(itemUrl + '/')) return true
    
    return false
}
</script>

<template>
    <!-- Mobile: Overlay backdrop -->
    <Teleport to="body">
        <Transition name="fade">
            <div 
                v-if="isMobile && mobileOpen" 
                class="mobile-overlay" 
                @click="handleBackdropClick"
            />
        </Transition>
    </Teleport>

    <!-- Mobile: Drawer menu -->
    <Transition name="slide">
        <div 
            v-if="!isMobile || mobileOpen"
            :class="{
                'menuContainer': true, 
                'expanded': effectiveExpandState,
                'mobile-drawer': isMobile
            }"
        >
            <!-- Mobile: Close button -->
            <div v-if="isMobile" class="menuHeader mobile-header">
                <div class="menuLogo">
                    <img src="/logo-expand.svg" alt="DocPal" />
                </div>
                <button class="mobile-close-btn" @click="handleBackdropClick">
                    <Icon name="lucide:x" />
                </button>
            </div>
            
            <!-- Desktop: Normal header -->
            <div v-else class="menuHeader">
                <div class="menuLogo">
                    <img :src="!expandState ? '/logo.svg' : '/logo-expand.svg'" alt="DocPal" />
                </div>
            </div>
            
            <div class="menuContent">
                <CommonMenuItem 
                    v-for="(item, index) in (props.menu || menu)" 
                    :key="'menu-'+index" 
                    :expandState="effectiveExpandState"
                    :label="item.label || ''" 
                    :icon="item.icon || ''"
                    :selected="isRouteActive(item.url)"
                    @click="(event) => handleClick(item, event)"
                />
            </div>
            <div class="menuFooter">
                <template v-for="(item, index) in footerMenu" >
                    <!-- Hide collapse/expand button on mobile -->
                    <template v-if="isMobile && item.label && typeof item.label === 'function' && item.label().includes('Collapse')">
                        <!-- Skip collapse button on mobile -->
                    </template>
                    <component v-else-if="item.component" :is="item.component" :expandState="effectiveExpandState" :key="'footer-comp-'+index" />
                    <CommonMenuItem 
                        v-else-if="!item.hidden || !item.hidden()"
                        :key="'footer-'+index" 
                        :expandState="effectiveExpandState" 
                        :label="item.label || ''" 
                        :icon="item.icon || ''" 
                        :selected="isRouteActive(item.url)" 
                        @click="(event) => handleClick(item, event)" 
                    />
                </template>
                <slot name="footer" />
            </div>
        </div>
    </Transition>
</template>

<style lang="scss" scoped>
    .menuLogo{ 
        height: 27px;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        img{
            height: 100%;
        }
    }
    .menuContainer{
        height: 100%;
        display: flex;
        flex-flow: column nowrap;
        justify-content: space-between;
        background: var(--app-bg-color);
        
        &.expanded{
            min-width: 260px;
            .menuHeader:not(.mobile-header){
                padding: var(--app-space-s) calc(var(--app-space-s) * 2);
            }
            .menuLogo{
                justify-content: flex-start;
            }
        }
        
        &.mobile-drawer {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px;
            max-width: 85vw;
            z-index: 10001;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
            min-width: 280px;
            height: 100dvh;
        }
        
        .menuHeader{
            border-bottom: 1px solid var(--app-border-color);
            padding: var(--app-space-s) var(--app-space-s);
            height: var(--app-header-height);
            display: flex;
            align-items: center;
            
            &.mobile-header {
                justify-content: space-between;
                padding: var(--app-space-s) calc(var(--app-space-s) * 2);
                
                .menuLogo {
                    justify-content: flex-start;
                }
            }
        }
        
        .mobile-close-btn {
            background: transparent;
            border: none;
            padding: var(--app-space-xs);
            cursor: pointer;
            color: var(--app-text-color-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--app-border-radius-s);
            transition: all 0.2s;
            
            &:hover {
                background: var(--app-fill-color-light);
                color: var(--app-text-color-primary);
            }
        }
        
        .menuContent{
            padding: var(--app-space-s);
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-flow: column nowrap;
            gap: 0;
        }
        .menuFooter{
            padding: var(--app-space-s);
            margin-top: var(--app-space-m);
        }
    }

    // Mobile overlay backdrop
    .mobile-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        backdrop-filter: blur(2px);
    }

    // Transitions
    .fade-enter-active,
    .fade-leave-active {
        transition: opacity 0.3s ease;
    }
    
    .fade-enter-from,
    .fade-leave-to {
        opacity: 0;
    }

    .slide-enter-active,
    .slide-leave-active {
        transition: transform 0.3s ease;
    }
    
    .slide-enter-from {
        transform: translateX(-100%);
    }
    
    .slide-leave-to {
        transform: translateX(-100%);
    }

    // Desktop: hide mobile-specific styles
    @media (min-width: 768px) {
        .menuContainer.mobile-drawer {
            position: static;
            box-shadow: none;
        }
    }
</style>
