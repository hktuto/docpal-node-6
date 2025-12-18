<template>
  <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
    <h1>My Apps</h1>
    
    <!-- Create App Form -->
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
      <h2>Create New App</h2>
      <form @submit.prevent="createApp">
        <div style="margin-bottom: 10px;">
          <label>Name:</label><br>
          <el-input 
            v-model="form.name" 
            required 
            style="width: 100%; padding: 8px; margin-top: 5px;"
          />
        </div>
        <div style="margin-bottom: 10px;">
          <label>Description:</label><br>
          <textarea 
            v-model="form.description" 
            style="width: 100%; padding: 8px; margin-top: 5px; min-height: 80px;"
          ></textarea>
        </div>
        <button type="submit" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Create App
        </button>
      </form>
    </div>
    
    <!-- Apps List -->
    <div>
      <h2>Existing Apps</h2>
      <div v-if="pending">Loading...</div>
      <div v-else-if="apps && apps.length === 0">No apps yet. Create one above!</div>
      <div v-else>
        <div 
          v-for="app in apps" 
          :key="app.id" 
          style="padding: 15px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;"
        >
          <h3 style="margin: 0 0 10px 0;">{{ app.name }}</h3>
          <p style="margin: 0; color: #666;">{{ app.description }}</p>
          <small style="color: #999;">Created: {{ new Date(app.createdAt).toLocaleString() }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const form = ref({
  name: '',
  description: ''
})

// Fetch existing apps
const { data: apps, pending, refresh } = await useFetch<App[]>('/api/apps')

// Create new app
const createApp = async () => {
  try {
    await $fetch('/api/apps', {
      method: 'POST',
      body: form.value
    })
    
    // Clear form
    form.value = { name: '', description: '' }
    
    // Refresh the list
    await refresh()
    
    alert('App created successfully!')
  } catch (error) {
    console.error('Error creating app:', error)
    alert('Failed to create app')
  }
}
</script>

