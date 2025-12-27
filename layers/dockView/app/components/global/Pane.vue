<template>
  <div>
    <h1>Pane</h1>
  </div>
</template>

<script setup lang="ts">
  import type { IDockviewPanelProps, DockviewPanelApi } from 'dockview-core'
  const props = defineProps<{
    params: IDockviewPanelProps
  }>()
  const panelInitialize = ref<boolean>(false)
  onMounted(() => {
    props.params.api.onDidActiveChange((e) => {
      console.log('Active changed', e)
    })
    props.params.api.onDidVisibilityChange((e) => {
      console.log('Visible changed', e)
    })
    props.params.api.onDidTitleChange((e) => {
      console.log('Title changed', e)
    })
  })
</script>