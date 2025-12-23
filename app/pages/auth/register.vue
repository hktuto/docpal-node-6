<template>
  <div class="register-page">
    <AuthRegisterForm />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'fullpage',
  middleware: ['guest'], // Only allow non-authenticated users
})

useHead({
  title: 'Register - DocPal'
})

// If already logged in, redirect to apps
const auth = useAuth()
const router = useRouter()

onMounted(async () => {
  await auth.fetchUser({ skip401Redirect: true })
  
  if (auth.isAuthenticated.value) {
    if (auth.hasCompany.value) {
      await router.push('/workspaces')
    } else {
      await router.push('/companies')
    }
  }
})
</script>

<style scoped lang="scss">
.register-page {
  width: 100%;
}
</style>

