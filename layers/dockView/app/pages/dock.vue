<script setup lang="ts">
import 'dockview-vue/dist/styles/dockview.css';
import {
    DockviewVue,
    DockviewApi,
    themeReplit,
    type DockviewReadyEvent
} from 'dockview-vue';
definePageMeta({
  layout: false
})
const dockApi = ref<DockviewApi | null>(null)

  function loadDefaultPanels() {
    dockApi.value?.addPanel({
      id: 'home',
      title: 'Home',
      component: 'Pane',
      params:{
        key: 'home'
      }
    })
    dockApi.value?.addPanel({
      id: 'home2',
      title: 'Home2',
      component:'Pane',
      params:{
        key: 'home2'
      }
    })
  }
function onLoad() {
  loadDefaultPanels()
}
function onReady(e: DockviewReadyEvent) {
  dockApi.value = e.api
  onLoad()
}


</script>

<template>
  <div class="pageContainer">
    <dockview-vue
      style="width:100%;height:100%"
      :theme="themeReplit"
      @ready="onReady">
    </dockview-vue>
  </div>
</template>

<style scoped lang="scss">
.pageContainer {
  width: 100vw;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  container-type: inline-size;
  container-name: dock-view;
  :deep(.dv-vue-part){
    overflow: auto;
  }
}
</style>