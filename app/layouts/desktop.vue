<script lang="ts" setup>

const isDesktopMode = useIsDesktopMode()

isDesktopMode.value = true

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