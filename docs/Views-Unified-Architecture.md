# Views & Widgets Architecture

## Core Concept

**Every view is a dashboard** - a canvas with widgets. Table, Kanban, Calendar, etc. are just different widget types that can be mixed and matched in a single view.

This unified approach gives maximum flexibility:
- Mix table + charts + metrics in one view
- Each widget controls its own columns and filters
- Multi-level grouping support
- Drag-and-drop widget positioning

---

## View Schema (Simplified)

```sql
CREATE TABLE views (
  id UUID PRIMARY KEY,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

**Key Change**: No `type` field! Every view is the same - a container for widgets.

---

## View Config Structure

```json
{
  "layout": "grid|freeform",
  "global_filters": [
    {
      "column_id": "col_status",
      "operator": "equals",
      "value": "active"
    }
  ],
  "widgets": [
    {
      "id": "widget_1",
      "type": "table|kanban|calendar|gantt|card|number|chart|list|progress",
      "title": "Widget Title",
      "position": { "x": 0, "y": 0, "w": 12, "h": 6 },
      "config": {
        // Widget-specific configuration
      }
    }
  ]
}
```

---

## Widget Types

### 1. Table Widget (Replaces table, grouped, and grouped-table views)

**Basic Table:**
```json
{
  "id": "widget_1",
  "type": "table",
  "title": "All Records",
  "position": { "x": 0, "y": 0, "w": 12, "h": 8 },
  "config": {
    "visible_columns": ["col_1", "col_2", "col_3"],
    "column_order": ["col_1", "col_2", "col_3"],
    "column_settings": {
      "col_1": { "width": 200, "frozen": true }
    },
    "filters": [],
    "sorts": [
      { "column_id": "col_1", "direction": "asc" }
    ],
    "row_height": "short|medium|tall"
  }
}
```

**Grouped Table (Single Level):**
```json
{
  "type": "table",
  "config": {
    "visible_columns": ["col_name", "col_price", "col_stock"],
    "group_by": ["col_category"],
    "group_collapsed": false,
    "show_group_summary": true,
    "sorts": [...]
  }
}
```

**Multi-Level Grouped Table:**
```json
{
  "type": "table",
  "config": {
    "visible_columns": ["col_name", "col_assignee", "col_due_date"],
    "group_by": ["col_status", "col_priority"],  // Multiple levels!
    "group_collapsed": {
      "level_0": false,  // Top-level groups expanded
      "level_1": true    // Sub-groups collapsed
    },
    "show_group_summary": true,
    "group_aggregations": {
      "col_price": "sum",
      "col_stock": "sum"
    },
    "sorts": [...]
  }
}
```

**Example Multi-Level Grouping:**
```
┌─ By Status ─────────────────────────────┐
│ ▼ In Progress (12)                      │
│   ├─ ▼ High Priority (5)                │
│   │   ├─ Task 1                         │
│   │   └─ Task 2                         │
│   ├─ ▶ Medium Priority (4)              │
│   └─ ▶ Low Priority (3)                 │
│ ▼ Todo (8)                              │
│   ├─ ▼ High Priority (3)                │
│   └─ ▶ Medium Priority (5)              │
└─────────────────────────────────────────┘
```

---

### 2. Kanban Widget (Replaces kanban view)

```json
{
  "id": "widget_2",
  "type": "kanban",
  "title": "Project Board",
  "position": { "x": 0, "y": 0, "w": 12, "h": 10 },
  "config": {
    "group_by_column_id": "col_status",
    "visible_columns": ["col_title", "col_assignee", "col_due_date"],
    "card_cover_column_id": "col_image",
    "card_fields": ["col_assignee", "col_due_date"],
    "show_empty_groups": true,
    "allow_drag_drop": true,
    "filters": [],
    "sorts": [
      { "column_id": "col_priority", "direction": "desc" }
    ]
  }
}
```

---

### 3. Calendar Widget (Replaces calendar view)

```json
{
  "id": "widget_3",
  "type": "calendar",
  "title": "Event Calendar",
  "position": { "x": 0, "y": 0, "w": 12, "h": 8 },
  "config": {
    "date_column_id": "col_event_date",
    "date_range_end_column_id": "col_end_date",
    "visible_columns": ["col_title", "col_location"],
    "card_fields": ["col_location", "col_organizer"],
    "color_by_column_id": "col_event_type",
    "view_mode": "month|week|day",
    "filters": []
  }
}
```

---

### 4. Gantt Widget (Replaces gantt view)

```json
{
  "id": "widget_4",
  "type": "gantt",
  "title": "Project Timeline",
  "position": { "x": 0, "y": 0, "w": 12, "h": 8 },
  "config": {
    "start_date_column_id": "col_start_date",
    "end_date_column_id": "col_end_date",
    "visible_columns": ["col_task_name", "col_assignee"],
    "progress_column_id": "col_progress",
    "color_by_column_id": "col_project",
    "filters": []
  }
}
```

---

### 5. Card Widget (Replaces card/gallery view)

```json
{
  "id": "widget_5",
  "type": "card",
  "title": "Product Gallery",
  "position": { "x": 0, "y": 0, "w": 12, "h": 8 },
  "config": {
    "card_cover_column_id": "col_image",
    "card_title_column_id": "col_name",
    "card_fields": ["col_price", "col_stock", "col_category"],
    "card_size": "small|medium|large",
    "cards_per_row": 4,
    "filters": [],
    "sorts": [
      { "column_id": "col_created_at", "direction": "desc" }
    ]
  }
}
```

---

### 6. Number Widget (Metrics)

```json
{
  "id": "widget_6",
  "type": "number",
  "title": "Total Revenue",
  "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
  "config": {
    "column_id": "col_amount",
    "aggregation": "sum|count|average|min|max|unique",
    "format": "number|currency|percent",
    "currency": "USD",
    "precision": 2,
    "filters": [],
    "comparison": {
      "enabled": true,
      "type": "previous_period"
    }
  }
}
```

---

### 7. Chart Widget

```json
{
  "id": "widget_7",
  "type": "chart",
  "title": "Sales Trend",
  "position": { "x": 3, "y": 0, "w": 9, "h": 4 },
  "config": {
    "chart_type": "bar|line|pie|donut|area",
    "x_axis_column_id": "col_month",
    "y_axis_column_id": "col_revenue",
    "aggregation": "sum|count|average",
    "filters": [],
    "limit": 10
  }
}
```

---

### 8. List Widget (Activity Feed)

```json
{
  "id": "widget_8",
  "type": "list",
  "title": "Recent Activity",
  "position": { "x": 0, "y": 2, "w": 4, "h": 6 },
  "config": {
    "visible_columns": ["col_title", "col_user", "col_date"],
    "display_format": "compact|detailed",
    "filters": [],
    "sorts": [
      { "column_id": "col_date", "direction": "desc" }
    ],
    "limit": 20
  }
}
```

---

### 9. Progress Widget

```json
{
  "id": "widget_9",
  "type": "progress",
  "title": "Goal Progress",
  "position": { "x": 0, "y": 0, "w": 4, "h": 2 },
  "config": {
    "column_id": "col_amount",
    "aggregation": "sum",
    "goal": 100000,
    "format": "currency",
    "show_percentage": true,
    "filters": []
  }
}
```

---

## View Examples

### Example 1: Classic "Table-Only" View
```json
{
  "name": "All Customers",
  "config": {
    "layout": "grid",
    "widgets": [
      {
        "id": "main_table",
        "type": "table",
        "title": "",  // No title for full-screen table
        "position": { "x": 0, "y": 0, "w": 12, "h": 12 },
        "config": {
          "visible_columns": ["col_name", "col_email", "col_phone"],
          "sorts": [
            { "column_id": "col_name", "direction": "asc" }
          ]
        }
      }
    ]
  }
}
```

### Example 2: Kanban + Metrics (Mixed View)
```json
{
  "name": "Project Dashboard",
  "config": {
    "layout": "grid",
    "widgets": [
      {
        "id": "total_tasks",
        "type": "number",
        "title": "Total Tasks",
        "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
        "config": {
          "aggregation": "count"
        }
      },
      {
        "id": "completed_tasks",
        "type": "number",
        "title": "Completed",
        "position": { "x": 3, "y": 0, "w": 3, "h": 2 },
        "config": {
          "aggregation": "count",
          "filters": [
            { "column_id": "col_status", "operator": "equals", "value": "done" }
          ]
        }
      },
      {
        "id": "task_board",
        "type": "kanban",
        "title": "Task Board",
        "position": { "x": 0, "y": 2, "w": 12, "h": 10 },
        "config": {
          "group_by_column_id": "col_status",
          "card_fields": ["col_assignee", "col_due_date"]
        }
      }
    ]
  }
}
```

### Example 3: Analytics Dashboard
```json
{
  "name": "Sales Analytics",
  "config": {
    "layout": "grid",
    "global_filters": [
      {
        "column_id": "col_year",
        "operator": "equals",
        "value": 2025
      }
    ],
    "widgets": [
      {
        "id": "total_revenue",
        "type": "number",
        "title": "Total Revenue",
        "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
        "config": {
          "column_id": "col_amount",
          "aggregation": "sum",
          "format": "currency"
        }
      },
      {
        "id": "revenue_trend",
        "type": "chart",
        "title": "Revenue by Month",
        "position": { "x": 3, "y": 0, "w": 6, "h": 4 },
        "config": {
          "chart_type": "line",
          "x_axis_column_id": "col_month",
          "y_axis_column_id": "col_amount",
          "aggregation": "sum"
        }
      },
      {
        "id": "top_products",
        "type": "chart",
        "title": "Top Products",
        "position": { "x": 9, "y": 0, "w": 3, "h": 4 },
        "config": {
          "chart_type": "pie",
          "x_axis_column_id": "col_product",
          "y_axis_column_id": "col_amount",
          "aggregation": "sum",
          "limit": 5
        }
      },
      {
        "id": "recent_orders",
        "type": "table",
        "title": "Recent Orders",
        "position": { "x": 0, "y": 4, "w": 12, "h": 6 },
        "config": {
          "visible_columns": ["col_customer", "col_product", "col_amount", "col_date"],
          "sorts": [
            { "column_id": "col_date", "direction": "desc" }
          ]
        }
      }
    ]
  }
}
```

### Example 4: Multi-Level Grouped Table
```json
{
  "name": "Projects by Status & Priority",
  "config": {
    "layout": "grid",
    "widgets": [
      {
        "id": "grouped_projects",
        "type": "table",
        "title": "All Projects",
        "position": { "x": 0, "y": 0, "w": 12, "h": 12 },
        "config": {
          "visible_columns": ["col_name", "col_assignee", "col_due_date", "col_budget"],
          "group_by": ["col_status", "col_priority", "col_department"],
          "group_collapsed": {
            "level_0": false,
            "level_1": true,
            "level_2": true
          },
          "show_group_summary": true,
          "group_aggregations": {
            "col_budget": "sum",
            "col_name": "count"
          }
        }
      }
    ]
  }
}
```

---

## Benefits of Unified Architecture

### 1. **Flexibility**
- Mix different visualizations in one view
- Table + charts side-by-side
- Multiple kanbans for different groupings

### 2. **Simplicity**
- Only one view type (dashboard)
- Consistent configuration pattern
- Easier to understand and maintain

### 3. **Power**
- Multi-level grouping for tables
- Widgets have independent filters
- Each widget controls its own columns

### 4. **User Experience**
- Build custom dashboards easily
- Drag-drop widget positioning
- Resize widgets as needed

### 5. **Code Simplicity**
- Single view rendering engine
- Widget-based architecture
- Easy to add new widget types

---

## Migration from Old Architecture

### Old View Types → New Widget Types

| Old View Type | New Approach |
|---------------|--------------|
| `table` view | View with single table widget |
| `kanban` view | View with single kanban widget |
| `calendar` view | View with single calendar widget |
| `gantt` view | View with single gantt widget |
| `grouped` view | Table widget with `group_by: ["col_id"]` |
| `card` view | View with single card widget |
| `dashboard` view | View with multiple metric/chart widgets |

**Key Insight**: Everything is now a "dashboard view" - just with different widget combinations!

---

## Multi-Level Grouping Details

### Configuration
```json
{
  "group_by": ["col_status", "col_priority", "col_department"],
  "group_collapsed": {
    "level_0": false,  // Status groups expanded
    "level_1": true,   // Priority groups collapsed
    "level_2": true    // Department groups collapsed
  },
  "group_aggregations": {
    "col_budget": "sum",
    "col_hours": "sum",
    "col_tasks": "count"
  }
}
```

### Visual Example
```
▼ Status: In Progress (45 items, $450K budget)
  ├─ ▶ High Priority (15 items, $200K budget)
  ├─ ▼ Medium Priority (20 items, $180K budget)
  │   ├─ ▶ Engineering (12 items)
  │   ├─ ▶ Design (5 items)
  │   └─ ▶ Marketing (3 items)
  └─ ▶ Low Priority (10 items, $70K budget)

▼ Status: Todo (30 items, $320K budget)
  ├─ ▶ High Priority (10 items)
  └─ ▶ Medium Priority (20 items)
```

### Query Implementation
```sql
-- Get data with multiple grouping levels
SELECT 
  data->>'col_status' as status,
  data->>'col_priority' as priority,
  data->>'col_department' as department,
  COUNT(*) as count,
  SUM((data->>'col_budget')::numeric) as total_budget,
  json_agg(json_build_object(
    'id', id,
    'data', data
  )) as records
FROM records
WHERE table_id = ? AND deleted_at IS NULL
GROUP BY 
  data->>'col_status',
  data->>'col_priority',
  data->>'col_department'
ORDER BY status, priority, department;
```

---

## API Changes

### No Changes Needed!
The API endpoints remain the same:
- `GET /api/tables/:tableId/views`
- `POST /api/tables/:tableId/views`
- `GET /api/views/:id`
- `PATCH /api/views/:id`
- `DELETE /api/views/:id`
- `GET /api/views/:id/records`

**Only the `config` JSONB structure changes** - it's now always a widgets array.

---

## Default View

When a table is created, create a default view with a full-screen table widget:

```json
{
  "name": "All Records",
  "is_default": true,
  "config": {
    "layout": "grid",
    "widgets": [
      {
        "id": "default_table",
        "type": "table",
        "title": "",
        "position": { "x": 0, "y": 0, "w": 12, "h": 12 },
        "config": {
          "visible_columns": ["all_columns"],
          "column_order": ["all_columns_in_order"],
          "filters": [],
          "sorts": []
        }
      }
    ]
  }
}
```

---

## Implementation Priority (POC)

**Phase 1 (Essential):**
- ✅ Views table (no type field)
- ✅ Table widget (basic + single-level grouping)
- ✅ Number widget (count, sum, average)
- ✅ Chart widget (bar chart only)

**Phase 2 (Enhanced):**
- Table widget with multi-level grouping
- Kanban widget
- Card widget
- More chart types

**Phase 3 (Full):**
- Calendar widget
- Gantt widget
- List widget
- Progress widget
- Advanced grouping features

---

This unified architecture is much cleaner, more flexible, and more powerful! 🚀

