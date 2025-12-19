# Geolocation/Geographic Data Support

## Overview

PostgreSQL supports geolocation data through the **PostGIS** extension, which provides:
- Geographic coordinate storage (latitude/longitude)
- Spatial data types (Point, LineString, Polygon, etc.)
- Geographic functions (distance, area, containment, etc.)
- Spatial indexing (GiST, SP-GiST)

## Docker Setup

Our `docker-compose.dev.yml` uses the **PostGIS-enabled PostgreSQL image**:

```yaml
postgres:
  image: postgis/postgis:16-3.4-alpine
```

PostGIS is automatically enabled via `docker/init-postgis.sql`.

## Column Types for Geolocation

### 1. **Simple Coordinates** (Recommended for most use cases)
Store as two separate numeric columns:

```typescript
// Drizzle Schema
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),  // -90 to 90
  longitude: numeric('longitude', { precision: 11, scale: 8 }), // -180 to 180
})
```

**Pros:**
- Simple, no extension needed
- Easy to understand and validate
- Works with any PostgreSQL version

**Cons:**
- No built-in distance calculations
- No spatial indexing

### 2. **PostGIS Geography** (Recommended for advanced features)
Use PostGIS `GEOGRAPHY` type for real-world coordinates:

```typescript
// Drizzle Schema with PostGIS
import { sql } from 'drizzle-orm'

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // Store as PostGIS GEOGRAPHY (POINT)
  location: geometry('location', { type: 'point', srid: 4326 })
})

// Or using raw SQL for more control
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: customType<{ lat: number; lng: number }>({
    dataType() {
      return 'geography(POINT, 4326)'
    },
  })('location'),
})
```

**SRID 4326** = WGS 84 (standard GPS coordinates)

**Pros:**
- Built-in distance calculations (in meters)
- Spatial indexing for fast queries
- Advanced geographic functions
- Industry standard for GIS applications

**Cons:**
- Requires PostGIS extension
- Slightly more complex to work with

### 3. **PostGIS Geometry** (For projected coordinates)
Use `GEOMETRY` type for flat-plane coordinates:

```typescript
// For maps, drawings, floor plans (not GPS coordinates)
export const shapes = pgTable('shapes', {
  id: uuid('id').primaryKey().defaultRandom(),
  shape: geometry('shape', { type: 'polygon', srid: 3857 }) // Web Mercator
})
```

## Working with PostGIS in Your App

### Creating a Point
```typescript
// Store coordinates
await db.insert(locations).values({
  name: 'Empire State Building',
  location: sql`ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326)`
  // Format: ST_MakePoint(longitude, latitude)
  // Note: Longitude first! (X, Y)
})
```

### Querying Points
```typescript
// Get latitude and longitude
const result = await db.execute(sql`
  SELECT 
    name,
    ST_Y(location::geometry) as latitude,
    ST_X(location::geometry) as longitude
  FROM locations
`)
```

### Distance Calculations
```typescript
// Find locations within 5km of a point
const nearbyLocations = await db.execute(sql`
  SELECT 
    name,
    ST_Distance(
      location,
      ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326)
    ) as distance_meters
  FROM locations
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326),
    5000  -- 5000 meters = 5km
  )
  ORDER BY distance_meters
`)
```

### Common PostGIS Functions
```sql
-- Create point
ST_MakePoint(longitude, latitude)
ST_SetSRID(point, 4326)

-- Extract coordinates
ST_X(point)  -- Get longitude
ST_Y(point)  -- Get latitude

-- Distance (returns meters for GEOGRAPHY)
ST_Distance(point1, point2)

-- Within distance
ST_DWithin(point1, point2, distance_meters)

-- Containment (is point in polygon?)
ST_Contains(polygon, point)

-- Area (returns square meters for GEOGRAPHY)
ST_Area(polygon)
```

## Recommended Implementation for DocPal

### Option 1: Simple (Phase 1)
```typescript
// In your dynamic table column definition
{
  type: 'location',
  config: {
    storage: 'coordinates', // Store as lat/lng numbers
    format: 'decimal', // or 'dms' (degrees/minutes/seconds)
    validation: {
      requireBoth: true,
      latRange: [-90, 90],
      lngRange: [-180, 180]
    }
  }
}

// Creates two columns in dynamic table:
// {columnName}_latitude NUMERIC(10, 8)
// {columnName}_longitude NUMERIC(11, 8)
```

### Option 2: Advanced (Phase 5)
```typescript
// In your dynamic table column definition
{
  type: 'location',
  config: {
    storage: 'postgis', // Use PostGIS GEOGRAPHY
    enableDistance: true, // Enable distance queries
    enableRadius: true, // Enable "within X km" filters
    defaultZoom: 12,
    mapProvider: 'openstreetmap' // or 'google', 'mapbox'
  }
}

// Creates one column in dynamic table:
// {columnName} GEOGRAPHY(POINT, 4326)
```

## UI Components

### Input Component
```vue
<template>
  <div class="location-field">
    <!-- Option 1: Simple lat/lng inputs -->
    <div class="coordinate-inputs">
      <el-input 
        v-model="latitude" 
        placeholder="Latitude"
        type="number"
        :min="-90"
        :max="90"
        :step="0.000001"
      />
      <el-input 
        v-model="longitude" 
        placeholder="Longitude"
        type="number"
        :min="-180"
        :max="180"
        :step="0.000001"
      />
    </div>
    
    <!-- Option 2: Map picker (Phase 5) -->
    <div class="map-picker">
      <button @click="openMapPicker">
        📍 Pick on Map
      </button>
      <div v-if="showMap" class="map-container">
        <!-- Integrate Leaflet, MapBox, or Google Maps -->
      </div>
    </div>
    
    <!-- Option 3: Address geocoding (Phase 5) -->
    <el-input 
      v-model="address"
      placeholder="Enter address..."
      @blur="geocodeAddress"
    />
  </div>
</template>
```

### Display Component
```vue
<template>
  <div class="location-display">
    <!-- Simple display -->
    <div class="coordinates">
      📍 {{ latitude }}, {{ longitude }}
    </div>
    
    <!-- With map preview (Phase 5) -->
    <div class="map-preview">
      <img :src="`https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=300x200&markers=${latitude},${longitude}&key=${apiKey}`" />
    </div>
    
    <!-- With actions -->
    <div class="location-actions">
      <a :href="`https://www.google.com/maps?q=${latitude},${longitude}`" target="_blank">
        Open in Google Maps
      </a>
      <button @click="copyCoordinates">
        Copy Coordinates
      </button>
    </div>
  </div>
</template>
```

## Migration Path

### Phase 1: Simple Coordinates
- Store as two numeric columns (latitude, longitude)
- Simple input/validation
- Display as text or Google Maps link

### Phase 2-3: No changes needed
- Continue using simple coordinates

### Phase 4-5: Upgrade to PostGIS
- Add migration to convert existing coordinates to PostGIS
- Enable spatial queries in views
- Add map-based filters ("show records within 10km")
- Implement map picker UI

## Migration Example (Phase 5)

```sql
-- Add PostGIS column
ALTER TABLE dt_company_table 
ADD COLUMN location_geo GEOGRAPHY(POINT, 4326);

-- Migrate existing data
UPDATE dt_company_table
SET location_geo = ST_SetSRID(
  ST_MakePoint(location_longitude, location_latitude), 
  4326
)
WHERE location_latitude IS NOT NULL 
  AND location_longitude IS NOT NULL;

-- Create spatial index
CREATE INDEX idx_location_geo ON dt_company_table USING GIST(location_geo);

-- Drop old columns (optional)
-- ALTER TABLE dt_company_table DROP COLUMN location_latitude;
-- ALTER TABLE dt_company_table DROP COLUMN location_longitude;
```

## Testing PostGIS

PostGIS is **automatically enabled** when you start Docker:

```bash
# Start Docker (PostGIS auto-enabled)
pnpm docker:up

# Or use full setup
pnpm setup
```

To verify PostGIS is working:

```bash
# Connect to PostgreSQL (interactive mode)
docker exec -it docpal-postgres psql -U docpal -d docpal

# Check PostGIS version
SELECT PostGIS_Version();

# Test creating a point
SELECT ST_AsText(ST_MakePoint(-73.9857, 40.7484));

# Test distance calculation (NYC to LA ≈ 3,936 km)
SELECT ST_Distance(
  ST_MakePoint(-73.9857, 40.7484)::geography,  -- NYC
  ST_MakePoint(-118.2437, 34.0522)::geography  -- LA
) / 1000 as distance_km;
```

**How it works**: The `docker:up` script automatically runs `postgis:enable` after starting containers. The `CREATE EXTENSION IF NOT EXISTS` command is idempotent, so it's safe to run multiple times.

**Manual enable** (if needed):
```bash
pnpm postgis:enable
```

## Recommended Approach

**For Phase 1**: Use simple lat/lng columns
- Easy to implement
- No complexity
- Can migrate later

**For Phase 5**: Upgrade to PostGIS
- Add spatial indexing
- Enable advanced queries
- Add map UI components

## Resources

- [PostGIS Documentation](https://postgis.net/docs/)
- [PostGIS Intro Tutorial](https://postgis.net/workshops/postgis-intro/)
- [Drizzle with PostGIS](https://orm.drizzle.team/docs/column-types/pg#geometry)
- [Leaflet.js](https://leafletjs.com/) - Free map library
- [OpenStreetMap](https://www.openstreetmap.org/) - Free map tiles

---

**Summary**: Start with simple lat/lng columns in Phase 1. Upgrade to PostGIS in Phase 5 when you need advanced geographic features like spatial queries and map-based filtering.

