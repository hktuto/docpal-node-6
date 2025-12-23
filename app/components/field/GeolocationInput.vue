<script setup lang="ts">
import { validateGeolocation } from '#shared/utils/validators'
import 'leaflet/dist/leaflet.css'
import { useDebounceFn } from '@vueuse/core'
interface GeolocationValue {
  lat: number
  lng: number
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

interface Props {
  modelValue: GeolocationValue | null | undefined
  format?: 'full' | 'coordinates' | 'address'
  defaultZoom?: number
  defaultCenter?: { lat: number; lng: number }
  enableGeocoding?: boolean
  enableReverseGeocoding?: boolean
  requireAddress?: boolean
  showMap?: boolean
  mapProvider?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  defaultMapOpen?: boolean // Auto-open map on mount
}

const props = withDefaults(defineProps<Props>(), {
  format: 'full',
  defaultZoom: 13,
  defaultCenter: () => ({ lat: 37.7749, lng: -122.4194 }),
  enableGeocoding: true,
  enableReverseGeocoding: true,
  requireAddress: false,
  showMap: true,
  mapProvider: 'openstreetmap',
  placeholder: 'Enter an address or click on map',
  disabled: false,
  required: false,
  defaultMapOpen: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: GeolocationValue | null): void
}>()

// State
const mapRef = ref<any>(null)
const mapContainer = ref<HTMLElement | null>(null)
const addressInput = ref('')
const searchResults = ref<any[]>([])
const isLoadingGeocoding = ref(false)
const errorMessage = ref('')
const showMapPicker = ref(false)

const locationValue = defineModel('locationValue')
// Current location value


// Format display text
const displayText = computed(() => {
  if (!locationValue.value) return props.placeholder
  
  const { lat, lng, address } = locationValue.value
  
  if (props.format === 'coordinates') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } else if (props.format === 'address' && address) {
    return address
  } else {
    return address ? `${address} (${lat.toFixed(4)}, ${lng.toFixed(4)})` : `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
})

// Initialize map
async function initializeMap() {
  if (!mapContainer.value || mapRef.value) return
  
  try {
    // Import Leaflet dynamically (client-side only)
    const L = await import('leaflet')
    
    // Create map
    const center = locationValue.value 
      ? [locationValue.value.lat, locationValue.value.lng]
      : [props.defaultCenter.lat, props.defaultCenter.lng]
    
    mapRef.value = L.map(mapContainer.value).setView(center as [number, number], props.defaultZoom)
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapRef.value)
    
    // Add marker if location exists
    if (locationValue.value) {
      const marker = L.marker([locationValue.value.lat, locationValue.value.lng], {
        draggable: !props.disabled
      }).addTo(mapRef.value)
      
      marker.on('dragend', async (e: any) => {
        const position = e.target.getLatLng()
        await updateLocation(position.lat, position.lng)
      })
    }
    
    // Add click handler
    if (!props.disabled) {
      console.log('click handler')
      mapRef.value.on('click', async (e: any) => {
        const { lat, lng } = e.latlng
        await updateLocation(lat, lng)
        // Add/update marker
        mapRef.value.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            mapRef.value.removeLayer(layer)
          }
        })
        
        const marker = L.marker([lat, lng], {
          draggable: !props.disabled
        }).addTo(mapRef.value)
        
        marker.on('dragend', async (e: any) => {
          const position = e.target.getLatLng()
          await updateLocation(position.lat, position.lng)
        })
      })
    }
  } catch (error) {
    console.error('Failed to initialize map:', error)
    errorMessage.value = 'Failed to load map. Please install leaflet: npm install leaflet'
  }
}

// Update location
async function updateLocation(lat: number, lng: number, address?: string) {
  const newValue: GeolocationValue = { lat, lng }
  console.log('updateLocation', newValue)
  
  // Reverse geocode if enabled and no address provided
  if (props.enableReverseGeocoding && !address) {
    const geocodedAddress = await reverseGeocode(lat, lng)
    if (geocodedAddress) {
      Object.assign(newValue, geocodedAddress)
    }
  } else if (address) {
    newValue.address = address
  }
  console.log('newValue 2', newValue)
  // Validate
  const result = validateGeolocation(newValue, { requireAddress: props.requireAddress })
  if (!result.valid) {
    errorMessage.value = result.error || 'Invalid location'
    return
  }
  console.log('newValue 3', newValue)
  errorMessage.value = ''
  locationValue.value = newValue
  console.log('locationValue 4', locationValue.value, newValue)
}

// Geocoding (address to coordinates)
async function geocodeAddress(query: string) {
  if (!props.enableGeocoding || !query.trim()) return
  
  isLoadingGeocoding.value = true
  errorMessage.value = ''
  
  try {
    // Using Nominatim (OpenStreetMap) - free geocoding service
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
    )
    
    const results = await response.json()
    searchResults.value = results.map((r: any) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      address: r.display_name,
      city: r.address?.city || r.address?.town || r.address?.village,
      state: r.address?.state,
      country: r.address?.country,
      postalCode: r.address?.postcode
    }))
  } catch (error) {
    console.error('Geocoding error:', error)
    errorMessage.value = 'Failed to search address'
    searchResults.value = []
  } finally {
    isLoadingGeocoding.value = false
  }
}

// Reverse geocoding (coordinates to address)
async function reverseGeocode(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    )
    
    const result = await response.json()
    
    return {
      address: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village,
      state: result.address?.state,
      country: result.address?.country,
      postalCode: result.address?.postcode
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

// Select search result
function selectSearchResult(result: GeolocationValue) {
  locationValue.value = result
  addressInput.value = result.address || ''
  searchResults.value = []
  
  // Update map
  if (mapRef.value && result) {
    const L = (window as any).L
    if (L) {
      mapRef.value.setView([result.lat, result.lng], props.defaultZoom)
      
      // Update marker
      mapRef.value.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          mapRef.value.removeLayer(layer)
        }
      })
      
      L.marker([result.lat, result.lng], {
        draggable: !props.disabled
      }).addTo(mapRef.value)
    }
  }
}

// Clear location
function clearLocation() {
  locationValue.value = null
  addressInput.value = ''
  errorMessage.value = ''
  
  // Clear marker from map
  if (mapRef.value) {
    const L = (window as any).L
    if (L) {
      mapRef.value.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          mapRef.value.removeLayer(layer)
        }
      })
    }
  }
}

// Toggle map picker
function toggleMapPicker() {
  showMapPicker.value = !showMapPicker.value
  
  if (showMapPicker.value && props.showMap) {
    nextTick(() => {
      initializeMap()
    })
  }
}

// Search debounce
const debouncedSearch = useDebounceFn((query: string) => {
  geocodeAddress(query)
}, 500)

watch(addressInput, (newValue) => {
  if (newValue && newValue.length > 2) {
    debouncedSearch(newValue)
  } else {
    searchResults.value = []
  }
})

// Auto-open map if defaultMapOpen is true
onMounted(() => {
  if (props.defaultMapOpen && props.showMap) {
    showMapPicker.value = true
    nextTick(() => {
      initializeMap()
    })
  }
})

// Cleanup
onBeforeUnmount(() => {
  if (mapRef.value) {
    mapRef.value.remove()
    mapRef.value = null
  }
})
</script>

<template>
  <div class="geolocation-input">
    <div class="location-display">
      <!-- Address input / display -->
      <div class="address-input-wrapper">
        <el-input
          v-model="addressInput"
          :placeholder="placeholder"
          :disabled="disabled"
          clearable
          @clear="clearLocation"
        >
          <template #prefix>
            <Icon name="lucide:map-pin" size="16" />
          </template>
          <template #suffix>
            <el-button
              v-if="showMap"
              text
              :icon="showMapPicker ? 'ChevronUp' : 'ChevronDown'"
              @click="toggleMapPicker"
            >
              Map
            </el-button>
          </template>
        </el-input>
        
        <!-- Search results dropdown -->
        <div v-if="searchResults.length > 0" class="search-results">
          <div
            v-for="(result, index) in searchResults"
            :key="index"
            class="search-result-item"
            @click="selectSearchResult(result)"
          >
            <Icon name="lucide:map-pin" size="14" />
            <span>{{ result.address }}</span>
          </div>
        </div>
      </div>
      
      <!-- Current location display -->
      <div v-if="locationValue" class="location-info">
        <span class="coordinates">
          📍 {{ locationValue.lat.toFixed(6) }}, {{ locationValue.lng.toFixed(6) }}
        </span>
        <el-button
          v-if="!disabled"
          text
          type="danger"
          size="small"
          @click="clearLocation"
        >
          <Icon name="lucide:x" size="14" />
        </el-button>
      </div>
    </div>
    
    <!-- Map picker -->
    <div v-if="showMapPicker && showMap" class="map-container">
      <div ref="mapContainer" class="map" style="height: 400px; width: 100%;" />
      <div class="map-hint">
        <Icon name="lucide:info" size="14" />
        Click on the map to set location or drag the marker
      </div>
    </div>
    
    <!-- Error message -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <!-- Loading indicator -->
    <div v-if="isLoadingGeocoding" class="loading">
      Searching...
    </div>
  </div>
</template>

<style scoped>
.geolocation-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.location-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address-input-wrapper {
  position: relative;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 14px;
}

.search-result-item:hover {
  background: var(--el-fill-color-light);
}

.location-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 13px;
}

.coordinates {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  color: var(--el-text-color-secondary);
}

.map-container {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
}

.map {
  width: 100%;
  height: 400px;
}

.map-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.error-message {
  font-size: 12px;
  color: var(--el-color-danger);
}

.loading {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-style: italic;
}

/* Leaflet overrides */
:deep(.leaflet-container) {
  font-family: inherit;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 6px;
}
</style>

