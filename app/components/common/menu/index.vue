<script setup lang="ts">
import UserMenu from './UserMenu.vue'
const emit = defineEmits(['expandStateChange'])
type MenuItem = {
    label?: string | Function
    icon?: string | Function
    url?: string | Function
    component?: Component
    action?: (event?: MouseEvent) => void
    hidden?: () => boolean
}
const expandState = defineModel<boolean>('expandState', { required: true })
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
const { isDesktopMode } = useDisplayMode()

// Open current page in desktop mode
const openInDesktop = (event?: MouseEvent) => {
  const currentPath = route.fullPath
  const desktopUrl = `/desktop?open=${encodeURIComponent(currentPath)}`
  
  // Ctrl/Cmd+Click: Open in new tab
  if (event?.ctrlKey || event?.metaKey) {
    window.open(desktopUrl, '_blank')
  } else {
    // Default: Replace current page
    navigateTo(desktopUrl)
  }
}

const footerMenu: MenuItem[] = [
    {
        label: 'Desktop Mode',
        icon: 'lucide:layout-grid',
        action: openInDesktop,
        hidden: () => isDesktopMode.value, // Hide when already in desktop mode
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
    if(item.url) {
        navigateTo(item.url)
        return
    }
    if(item.action) {
        item.action(event)
        return
    }
}

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
    <div :class="{'menuContainer':true, 'expanded':expandState}">
        <div class="menuHeader">
            <div class="menuLogo">
                <img :src="!expandState ? '/logo.svg' : '/logo-expand.svg'" alt="DocPal" />
            </div>
        </div>
        <div class="menuContent">
            <CommonMenuItem 
                v-for="(item, index) in menu" 
                :key="'menu-'+index" 
                :expandState="expandState"
                :label="item.label || ''" 
                :icon="item.icon || ''"
                :selected="isRouteActive(item.url)"
                @click="handleClick(item)"
            />
        </div>
        <div class="menuFooter">
            <template v-for="(item, index) in footerMenu" >
                <component :is="item.component" v-if="item.component" :expandState="expandState" :key="'footer-comp-'+index" />
                <CommonMenuItem 
                    v-else-if="!item.hidden || !item.hidden()"
                    :key="'footer-'+index" 
                    :expandState="expandState" 
                    :label="item.label || ''" 
                    :icon="item.icon || ''" 
                    :selected="isRouteActive(item.url)" 
                    @click="handleClick(item, $event)" 
                />
            </template>
            <slot name="footer" />
        </div>
    </div>
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
        &.expanded{
            min-width: 260px;
            .menuHeader{
                padding: var(--app-space-s) calc(var(--app-space-s) * 2);
            }
            .menuLogo{
                justify-content: flex-start;
            }
        }
        .menuHeader{
            border-bottom: 1px solid var(--app-border-color);
            padding: var(--app-space-s) var(--app-space-s);
            height: var(--app-header-height);
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
</style>
