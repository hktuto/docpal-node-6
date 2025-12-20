<script setup lang="ts">

const emit = defineEmits(['expandStateChange'])
type MenuItem = {
    label: string | Function
    icon: string | Function
    url?: string | Function
    action?: () => void
}
const expandState = defineModel<boolean>('expandState', { required: true })
const menu:MenuItem[] = [
    {
        label: 'Home',
        icon: 'lucide:house',
        url: '/',
    },
    {
        label: 'Apps',
        icon: 'lucide:database',
        url: '/apps',
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

const footerMenu:MenuItem[] = [
    {
        label: 'Settings',
        icon: 'lucide:settings',
        url: '/settings',
    },
    {
        label: () => (expandState.value ? 'Collapse' : 'Expand'),
        icon: () => (expandState.value ? 'lucide:chevron-left' : 'lucide:chevron-right'),
        action: () => toggleExpand(),
    }
]

const route = useRoute()
const toggleExpand = () => {
    expandState.value = !expandState.value
    emit('expandStateChange', expandState.value)
}

function handleClick(item: any) {
    if(item.url) {
        navigateTo(item.url)
        return
    }
    if(item.action) {
        item.action()
        return
    }
}

// Check if route is active (exact match or child route)
function isRouteActive(itemUrl?: any): boolean {
    if (!itemUrl || typeof itemUrl !== 'string') return false
    
    // Exact match
    if (route.path === itemUrl) return true
    
    // Child route match (e.g., /apps is active when on /apps/123)
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
                :label="item.label" 
                :icon="item.icon"
                :selected="isRouteActive(item.url)"
                @click="handleClick(item)"
            />
        </div>
        <div class="menuFooter">
            <CommonMenuItem 
                v-for="(item, index) in footerMenu" 
                :key="'footer-'+index" 
                :expandState="expandState"
                :label="item.label" 
                :icon="item.icon"
                :selected="isRouteActive(item.url)"
                @click="handleClick(item)"
            />
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
