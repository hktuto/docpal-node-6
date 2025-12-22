<template>
  <div class="fullpage-layout">
    <div class="fullpage-content">
     
      
      <slot />
      
      <div class="fullpage-footer">
        <p>&copy; {{ new Date().getFullYear() }} DocPal. All rights reserved.</p>
      </div>
    </div>
    <LoadingBg />
  </div>
</template>

<style scoped lang="scss">
.fullpage-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-l);
  isolation: isolate;
}

.fullpage-content {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xl);
}

.fullpage-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-s);
  color: var(--app-primary-color);
  
  h1 {
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    margin: 0;
  }
}

.fullpage-footer {
  text-align: center;
  
  p {
    color: var(--app-text-color-secondary);
    font-size: var(--app-font-size-s);
    margin: 0;
  }
}
</style>

