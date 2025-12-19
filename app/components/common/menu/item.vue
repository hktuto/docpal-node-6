<script setup lang="ts">
    const props = defineProps<{
        expandState: boolean
        label: string
        icon: string
        selected: boolean
    }>()
    const emit = defineEmits(['click'])

    const handleClick = () => {
        emit('click')
    }

    const displayLabel = computed(() => {
        return typeof props.label === 'function' ? props.label() : props.label
    })

    const displayIcon = computed(() => {
        return typeof props.icon === 'function' ? props.icon() : props.icon
    })
</script>

<template>
    <el-tooltip :content="displayLabel" placement="right">
            <div :class="{'menuItemContainer':true, selected: selected}" @click="handleClick">
                <div class="menuItemIcon">
                    <Icon :name="displayIcon" />
                </div>
                <div v-if="expandState" class="menuItemLabel">
                    {{ displayLabel }}
                </div>
            </div>
    </el-tooltip>
</template>

<style lang="scss" scoped>
.menuItemContainer{
    color: var(--app-text-color);
    padding: var(--app-space-s);
    border-radius: var(--app-border-radius-s);
    font-size: var(--app-font-size-m);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: var(--app-space-s);
    line-height: 0;
    &:hover {
        background-color: var(--app-primary-alpha-10);
    }
    &.selected {
        background-color: var(--app-primary-alpha-30);
        color: var(--app-primary-color);
    }
}
.menuItemIcon{
    line-height: 0;
}
</style>