<script setup lang="ts">

const expandState = ref(false)

function toggleExpand() {
  expandState.value = !expandState.value
}
</script>

<template>
    <div class="appContainer">
       <aside class="sidebar">
         <CommonMenu v-model:expandState="expandState" />
       </aside>
       <main>
            <slot />
       </main>
    </div>    
</template>

<style scoped>
.appContainer {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  position: relative;
}

.sidebar {

  background: var(--app-bg-color);
  border-right: 1px solid var(--app-border-color);
}

main {
  flex: 1;
  padding: 20px;
  height: 100%;
  overflow: auto;
}
</style>