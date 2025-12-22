# Geolocation & Geography Field Types

**Status**: 📋 Planned (Week 2)  
**Dependencies**: PostGIS extension enabled in PostgreSQL  
**Priority**: 🟡 Medium (After basic field types)

---

## Overview

With PostGIS support in our PostgreSQL database, we can implement powerful location-based field types for storing and querying geographic data.

---

## Field Types to Implement

### 1. **Location/Address** (User-Friendly)

**Type**: `geolocation`

**Purpose**: Store addresses and coordinates for business locations, customer addresses, etc.

**Database**: PostgreSQL `GEOGRAPHY(Point)` or compound (address + coordinates)

**Features**:
- Address input with autocomplete (Google Places API / Mapbox)
- Latitude/Longitude coordinates
- Geocoding (address → coordinates)
- Reverse geocoding (coordinates → address)
- Distance calculations
- Proximity search

**UI Component**:
- Address text input with autocomplete
- Map picker (click to select location)
- Current location button
- Display: Address + mini map

**Config**:
```typescript
{
  provider: 'google' | 'mapbox' | 'openstreetmap',
  defaultZoom: 15,
  showMap: true,
  allowManualCoordinates: true,
  searchRadius: 50  // km
}
```

**Storage**:
```json
{
  "address": "123 Main St, San Francisco, CA 94105",
  "lat": 37.7749,
  "lng": -122.4194,
  "placeId": "ChIJIQBpAG2ahYAR_6128GcTUEo",
  "components": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105",
    "country": "United States"
  }
}
```

**Use Cases**:
- Customer addresses
- Office locations
- Delivery addresses
- Store finder
- Service area mapping

---

### 2. **Geography** (Advanced GIS)

**Type**: `geography`

**Purpose**: Store complex geographic data like regions, boundaries, routes, etc.

**Database**: PostgreSQL `GEOGRAPHY` (Point, LineString, Polygon)

**Geometry Types**:
- **Point**: Single location
- **LineString**: Route or path
- **Polygon**: Area or region
- **MultiPoint**: Multiple locations
- **MultiLineString**: Multiple routes
- **MultiPolygon**: Multiple areas

**Features**:
- Draw shapes on map
- Import GeoJSON
- Area calculations
- Perimeter calculations
- Contains/Intersects queries
- Buffer zones

**UI Component**:
- Map drawing tools
- Shape editor
- GeoJSON import/export
- Area/perimeter display

**Config**:
```typescript
{
  geometryType: 'point' | 'linestring' | 'polygon' | 'multipoint' | 'multilinestring' | 'multipolygon',
  allowedTypes: string[],  // Restrict geometry types
  maxVertices: 1000,
  showMeasurements: true
}
```

**Storage**:
```sql
-- WKT (Well-Known Text) format
POINT(-122.4194 37.7749)
LINESTRING(-122.4194 37.7749, -122.4184 37.7759)
POLYGON((-122.4194 37.7749, -122.4184 37.7759, -122.4174 37.7739, -122.4194 37.7749))
```

**Use Cases**:
- Sales territories
- Delivery zones
- Service areas
- Property boundaries
- Route planning

---

## Implementation Plan

### Week 2: Basic Geolocation

#### Backend
- [x] Enable PostGIS extension (already done)
- [ ] Add `geolocation` field type to type registry
- [ ] Map to PostgreSQL `GEOGRAPHY(Point)` or JSONB
- [ ] Validation for lat/lng ranges
- [ ] Distance calculation utilities
- [ ] Proximity search queries

#### Frontend
- [ ] `GeolocationInput` component
  - Address autocomplete
  - Map picker
  - Lat/lng manual input
  - Current location button
- [ ] `GeolocationDisplay` component
  - Address display
  - Mini map preview
  - "Open in Maps" link
- [ ] Map provider integration (Google Maps or Mapbox)

#### Features
- [ ] Address autocomplete
- [ ] Geocoding API integration
- [ ] Distance calculations
- [ ] "Near me" filters
- [ ] Map view for table data

---

### Week 3: Advanced Geography (Optional)

#### Backend
- [ ] Add `geography` field type
- [ ] Support all geometry types
- [ ] GeoJSON import/export
- [ ] Spatial queries (contains, intersects, within)
- [ ] Area/perimeter calculations

#### Frontend
- [ ] `GeographyInput` component
  - Drawing tools
  - Shape editor
  - GeoJSON import
- [ ] `GeographyDisplay` component
  - Shape visualization
  - Measurements display
- [ ] Advanced map features (layers, clustering)

---

## Database Schema

### PostGIS Setup
```sql
-- Enable PostGIS (already done)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Example column
ALTER TABLE dt_abc123_example 
ADD COLUMN location GEOGRAPHY(Point);

-- Spatial index
CREATE INDEX idx_location ON dt_abc123_example 
USING GIST (location);
```

### Query Examples

#### Find nearby locations
```sql
SELECT * FROM dt_abc123_example
WHERE ST_DWithin(
  location,
  ST_GeogFromText('POINT(-122.4194 37.7749)'),
  5000  -- 5km radius
)
ORDER BY ST_Distance(
  location,
  ST_GeogFromText('POINT(-122.4194 37.7749)')
);
```

#### Calculate distance
```sql
SELECT 
  name,
  ST_Distance(
    location,
    ST_GeogFromText('POINT(-122.4194 37.7749)')
  ) / 1000 AS distance_km
FROM dt_abc123_example;
```

---

## API Integration

### Geocoding Providers

#### Option 1: Google Maps API
- **Pros**: Best data quality, autocomplete
- **Cons**: Requires API key, usage costs
- **Free tier**: $200/month credit

#### Option 2: Mapbox
- **Pros**: Good quality, developer-friendly
- **Cons**: Requires API key, usage costs
- **Free tier**: 100,000 requests/month

#### Option 3: OpenStreetMap (Nominatim)
- **Pros**: Free, no API key needed
- **Cons**: Lower quality, rate limits
- **Free tier**: Unlimited (with fair use)

**Recommendation**: Start with Mapbox (good balance of quality and cost)

---

## UI/UX Design

### Input Component

```
┌─────────────────────────────────────────┐
│ Location                                │
├─────────────────────────────────────────┤
│ 📍 123 Main St, San Francisco, CA       │
│    [Autocomplete dropdown]              │
├─────────────────────────────────────────┤
│ [Map Preview - Click to change]         │
│      📍                                  │
│                                         │
├─────────────────────────────────────────┤
│ Lat: 37.7749  Lng: -122.4194           │
│ [📍 Use Current Location]               │
└─────────────────────────────────────────┘
```

### Display Component

```
┌─────────────────────────────────────────┐
│ 123 Main St                             │
│ San Francisco, CA 94105                 │
│                                         │
│ [Mini Map Preview]                      │
│      📍                                  │
│                                         │
│ [🗺️ Open in Maps] [📋 Copy Address]    │
└─────────────────────────────────────────┘
```

---

## Configuration Options

### Field Type: `geolocation`

```typescript
interface GeolocationConfig {
  // Provider
  provider: 'google' | 'mapbox' | 'osm'
  apiKey?: string
  
  // Display
  showMap: boolean
  defaultZoom: number
  mapHeight: number
  
  // Input
  allowManualCoordinates: boolean
  requireAddress: boolean
  requireCoordinates: boolean
  
  // Validation
  allowedCountries?: string[]  // ISO country codes
  boundingBox?: {
    north: number
    south: number
    east: number
    west: number
  }
  
  // Search
  searchRadius?: number  // km for proximity search
}
```

### Field Type: `geography`

```typescript
interface GeographyConfig {
  // Geometry
  geometryType: 'point' | 'linestring' | 'polygon' | 'any'
  allowMultiple: boolean
  
  // Drawing
  maxVertices: number
  minVertices: number
  
  // Display
  strokeColor: string
  fillColor: string
  strokeWidth: number
  
  // Measurements
  showArea: boolean
  showPerimeter: boolean
  areaUnit: 'sqm' | 'sqkm' | 'sqmi'
  lengthUnit: 'm' | 'km' | 'mi'
}
```

---

## Use Case Examples

### 1. CRM with Customer Locations
```typescript
// Table: Customers
{
  name: "Acme Corp",
  address: {
    type: "geolocation",
    value: {
      address: "123 Main St, SF, CA",
      lat: 37.7749,
      lng: -122.4194
    }
  }
}

// Query: Find customers within 10km
SELECT * FROM customers 
WHERE ST_DWithin(address, POINT(-122.4, 37.7), 10000);
```

### 2. Sales Territories
```typescript
// Table: Territories
{
  name: "West Coast Region",
  boundary: {
    type: "geography",
    geometryType: "polygon",
    value: "POLYGON((...))"
  }
}

// Query: Which territory contains this customer?
SELECT t.name FROM territories t
WHERE ST_Contains(t.boundary, customer.location);
```

### 3. Store Locator
```typescript
// Table: Stores
{
  name: "Store #123",
  location: {
    type: "geolocation",
    showMap: true,
    searchRadius: 50
  }
}

// Feature: Find nearest stores
// Feature: Show all stores on map
// Feature: Filter by distance
```

---

## Performance Considerations

### Indexing
```sql
-- Spatial index (required for performance)
CREATE INDEX idx_location ON table_name 
USING GIST (location_column);
```

### Query Optimization
- Use `ST_DWithin` instead of `ST_Distance < X` (uses index)
- Limit result set with reasonable radius
- Consider caching geocoding results
- Use appropriate SRID (4326 for lat/lng)

---

## Testing Checklist

### Geolocation Field
- [ ] Address autocomplete works
- [ ] Map picker updates coordinates
- [ ] Current location button works
- [ ] Geocoding converts address to coordinates
- [ ] Reverse geocoding works
- [ ] Distance calculations accurate
- [ ] Proximity search works
- [ ] Displays correctly in table view

### Geography Field
- [ ] Can draw points
- [ ] Can draw lines
- [ ] Can draw polygons
- [ ] Shape editing works
- [ ] GeoJSON import works
- [ ] Measurements accurate
- [ ] Spatial queries work
- [ ] Displays correctly on map

---

## Future Enhancements

### Phase 3+
- [ ] Routing/directions integration
- [ ] Geofencing (enter/exit alerts)
- [ ] Heat maps
- [ ] Clustering for many points
- [ ] 3D terrain visualization
- [ ] Offline map support
- [ ] Custom map styles
- [ ] Address validation/standardization
- [ ] Bulk geocoding
- [ ] Export to KML/GPX

---

## Summary

**Geolocation fields** enable powerful location-based features:
- Store customer/office addresses
- Calculate distances
- Find nearby records
- Display data on maps
- Territory management

With PostGIS already enabled, we're ready to implement these features in Week 2!

**Status**: 📋 Planned  
**Estimated effort**: 1-2 weeks  
**Dependencies**: Map provider API key (Mapbox recommended)

