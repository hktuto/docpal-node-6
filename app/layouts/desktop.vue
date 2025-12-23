<script lang="ts" setup>


</script>


<template>

  <div class="desktop-layout">
    <slot/>
    <LoadingBg />
  </div>
</template>

<style scoped>
.desktop-layout {
  width: 100vw;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}
</style>