<script setup lang="ts">
interface Props {
  modelValue: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const defaultConfig = {
  format: 'full',
  defaultZoom: 13,
  defaultCenter: { lat: 37.7749, lng: -122.4194 },
  enableGeocoding: true,
  enableReverseGeocoding: true,
  requireAddress: false,
  showMap: true,
  mapProvider: 'openstreetmap',
  placeholder: 'Enter an address or click on map'
}

const config = computed({
  get: () => {
    // Merge with defaults to ensure all properties exist
    const value = props.modelValue || {}
    return {
      ...defaultConfig,
      ...value,
      // Ensure nested objects are also merged
      defaultCenter: {
        ...defaultConfig.defaultCenter,
        ...(value.defaultCenter || {})
      }
    }
  },
  set: (val) => emit('update:modelValue', val)
})

const formatOptions = [
  { label: 'Full (Address + Coordinates)', value: 'full' },
  { label: 'Coordinates Only', value: 'coordinates' },
  { label: 'Address Only', value: 'address' }
]

const mapProviderOptions = [
  { label: 'OpenStreetMap (Free)', value: 'openstreetmap' },
  { label: 'Google Maps', value: 'google', disabled: true },
  { label: 'Mapbox', value: 'mapbox', disabled: true }
]

// State for default center address and use as default value
const defaultCenterAddress = ref('')
const useAsDefaultValue = ref(false)

// Initialize from config
watch(() => config.value, (newConfig) => {
  if (newConfig.defaultValue) {
    useAsDefaultValue.value = true
    defaultCenterAddress.value = newConfig.defaultValue.address || ''
  } else {
    useAsDefaultValue.value = false
  }
}, { immediate: true, deep: true })

// Handle default center updates from map picker
function updateDefaultCenter(value: any) {
  if (value && value.lat && value.lng) {
    // Update default center
    config.value = {
      ...config.value,
      defaultCenter: {
        lat: value.lat,
        lng: value.lng
      }
    }
    
    // Store address for display
    defaultCenterAddress.value = value.address || ''
    
    // If "use as default value" is enabled, sync it
    if (useAsDefaultValue.value) {
      config.value = {
        ...config.value,
        defaultValue: {
          lat: value.lat,
          lng: value.lng,
          address: value.address || ''
        }
      }
    }
  }
}

// Watch for useAsDefaultValue changes
watch(useAsDefaultValue, (enabled) => {
  if (enabled) {
    // Enable: Copy defaultCenter to defaultValue
    config.value = {
      ...config.value,
      defaultValue: {
        lat: config.value.defaultCenter.lat,
        lng: config.value.defaultCenter.lng,
        address: defaultCenterAddress.value
      }
    }
  } else {
    // Disable: Remove defaultValue
    config.value = {
      ...config.value,
      defaultValue: undefined
    }
  }
})
</script>

<template>
  <div class="geolocation-field-config">
    <!-- Display Format -->
    <el-form-item label="Display Format">
      <el-select
        v-model="config.format"
        placeholder="Select format"
        style="width: 100%"
      >
        <el-option
          v-for="item in formatOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <template #extra>
        <span class="form-tip">How location data will be displayed</span>
      </template>
    </el-form-item>
    
    <!-- Show Map -->
    <el-form-item label="Show Map Picker">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.showMap" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Display interactive map for location selection
        </span>
      </div>
    </el-form-item>
    
    <!-- Default Zoom -->
    <el-form-item v-if="config.showMap" label="Default Map Zoom">
      <el-slider
        v-model="config.defaultZoom"
        :min="1"
        :max="20"
        :marks="{ 1: 'World', 10: 'City', 15: 'Street', 20: 'Building' }"
        show-stops
      />
      <template #extra>
        <span class="form-tip">Initial zoom level (1 = world view, 20 = building level)</span>
      </template>
    </el-form-item>
    
    <!-- Enable Geocoding -->
    <el-form-item label="Enable Address Search">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.enableGeocoding" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Allow users to search for addresses (converts to coordinates)
        </span>
      </div>
      <template #extra>
        <span class="form-tip">Uses free OpenStreetMap Nominatim service</span>
      </template>
    </el-form-item>
    
    <!-- Enable Reverse Geocoding -->
    <el-form-item label="Auto-Fill Address">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.enableReverseGeocoding" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Automatically fetch address when clicking on map
        </span>
      </div>
    </el-form-item>
    
    <!-- Require Address -->
    <el-form-item label="Require Address">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-switch v-model="config.requireAddress" />
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          Address text must be provided (not just coordinates)
        </span>
      </div>
    </el-form-item>
    
    <!-- Default Center Picker with Default Value Option -->
    <el-form-item label="Default Map Center">
      <div class="map-center-picker">
        <el-collapse>
          <el-collapse-item name="mapPicker">
            <template #title>
              <div style="display: flex; align-items: center; gap: 8px;">
                <Icon name="lucide:map-pin" size="16" />
                <span>{{ config.defaultCenter.lat?.toFixed(4) }}, {{ config.defaultCenter.lng?.toFixed(4) }}</span>
                <el-tag size="small" type="info">Click to edit</el-tag>
              </div>
            </template>
            <div class="map-picker-content">
              <FieldGeolocationInput
                :model-value="{
                  lat: config.defaultCenter.lat,
                  lng: config.defaultCenter.lng,
                  address: defaultCenterAddress
                }"
                :default-zoom="config.defaultZoom"
                :default-center="config.defaultCenter"
                :enable-geocoding="true"
                :enable-reverse-geocoding="true"
                :show-map="true"
                :default-map-open="true"
                placeholder="Search for a location or click on map"
                @update:locationValue="updateDefaultCenter"
              />
              
              <!-- Option to use as default value -->
              <div class="use-as-default-option">
                <el-divider style="margin: 16px 0" />
                <div style="display: flex; align-items: center; gap: 8px;">
                  <el-switch v-model="useAsDefaultValue" />
                  <span style="font-size: 13px; color: var(--el-text-color-primary);">
                    Also pre-fill this location for new records
                  </span>
                </div>
                <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-left: 46px; margin-top: 4px;">
                  When enabled, new records will start with this location as their default value
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
      <template #extra>
        <span class="form-tip">Where the map centers when field is empty - optionally use as default value for new records</span>
      </template>
    </el-form-item>
    
    <!-- Map Provider -->
    <el-form-item label="Map Provider">
      <el-select
        v-model="config.mapProvider"
        placeholder="Select provider"
        style="width: 100%"
      >
        <el-option
          v-for="item in mapProviderOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
          :disabled="item.disabled"
        />
      </el-select>
      <template #extra>
        <span class="form-tip">OpenStreetMap is free and requires no API key</span>
      </template>
    </el-form-item>
    
    <!-- Placeholder -->
    <el-form-item label="Placeholder">
      <el-input
        v-model="config.placeholder"
        placeholder="Enter an address or click on map"
      />
    </el-form-item>
    
    <!-- Preview -->
    <el-form-item label="Preview">
      <div class="preview-section">
        <FieldGeolocationInput
          :location-value="config.defaultValue"
          v-bind="config"
          :default-map-open="true"
          :disabled="false"
        />
        <div class="preview-info">
          <Icon name="lucide:info" size="14" />
          <span>
            {{ config.defaultValue ? 'Preview with default value' : 'Preview in empty state' }}
            • Map will center at {{ config.defaultValue ? 'default value' : 'default center' }}
          </span>
        </div>
      </div>
    </el-form-item>
    
    <!-- Info Note -->
    <el-alert
      type="info"
      :closable="false"
      style="margin-top: 16px;"
    >
      <template #title>
        <div style="display: flex; align-items: center; gap: 8px;">
          <Icon name="lucide:info" size="16" />
          <span>Geolocation Features</span>
        </div>
      </template>
      <div style="font-size: 12px; line-height: 1.6;">
        <ul style="margin: 4px 0; padding-left: 20px;">
          <li>🗺️ Interactive map with click-to-select</li>
          <li>🔍 Address search with autocomplete (geocoding)</li>
          <li>📍 Automatic address lookup (reverse geocoding)</li>
          <li>🎯 Drag marker to adjust location</li>
          <li>🌍 Free OpenStreetMap data (no API key needed)</li>
          <li>💾 Stores coordinates + full address details</li>
        </ul>
      </div>
    </el-alert>
  </div>
</template>

<style scoped>
.geolocation-field-config {
  width: 100%;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.map-center-picker {
  width: 100%;
}

.map-picker-content {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.use-as-default-option {
  margin-top: 8px;
}

.preview-section {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-color-info-light-9);
  border-left: 3px solid var(--el-color-info);
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

