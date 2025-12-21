<template>
  <div class="login-page">
    <AuthLoginForm />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'fullpage',
  middleware: ['guest'], // Only allow non-authenticated users
})

// If already logged in, redirect to apps
const auth = useAuth()
const router = useRouter()

onMounted(async () => {
  await auth.fetchUser()
  
  if (auth.isAuthenticated.value) {
    if (auth.hasCompany.value) {
      await router.push('/apps')
    } else {
      await router.push('/companies')
    }
  }
})
</script>

<style scoped lang="scss">
.login-page {
  width: 100%;
}
</style>

