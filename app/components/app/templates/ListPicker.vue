<script setup lang="ts">
import type { AppTemplate, AppTemplateDefinition } from '#shared/types/db'

interface TemplateListItem {
  id: string
  name: string
  description: string | null
  icon: string | null
  coverImage: string | null
  category: string | null
  tags: string[] | null
  visibility: string
  isFeatured: boolean | null
  includesSampleData: boolean | null
  includesViews: boolean | null
  usageCount: number | null
  createdAt: Date
  templateDefinition?: AppTemplateDefinition
}

interface TemplateWithDefinition extends AppTemplate {
  templateDefinition: AppTemplateDefinition
}

const emit = defineEmits<{
  apply: [template: TemplateWithDefinition]
}>()

// Search and filter state
const searchQuery = ref('')
const categoryFilter = ref('all')
const visibilityFilter = ref('all')

// Fetch templates from API
const { data: templatesData, pending, error, refresh } = await useFetch('/api/app-templates', {
  query: {
    visibility: visibilityFilter,
    category: computed(() => categoryFilter.value === 'all' ? undefined : categoryFilter.value),
    search: searchQuery,
    sort: 'popular'
  },
  watch: [searchQuery, categoryFilter, visibilityFilter]
})

const templates = computed((): TemplateListItem[] => {
  return (templatesData.value?.data || []) as TemplateListItem[]
})

// Get unique categories from templates
const categories = computed((): string[] => {
  const cats = new Set(templates.value.map(t => t.category).filter((c): c is string => Boolean(c)))
  return ['all', ...Array.from(cats)]
})

// Group templates by visibility
const systemTemplates = computed(() => 
  templates.value.filter((t: TemplateListItem) => t.visibility === 'system')
)

const companyTemplates = computed(() => 
  templates.value.filter((t: TemplateListItem) => t.visibility === 'company')
)

const personalTemplates = computed(() => 
  templates.value.filter((t: TemplateListItem) => t.visibility === 'personal')
)

// Get table names from template definition for "features" display
const getTemplateFeatures = (template: TemplateListItem) => {
  if (!template.templateDefinition?.tables) return []
  return template.templateDefinition.tables.map((t: any) => t.name)
}

const handleApply = async (template: TemplateListItem) => {
  // Fetch full template details including definition
  const { data: fullTemplate } = await useFetch(`/api/app-templates/${template.id}`)
  if (fullTemplate.value?.data) {
    emit('apply', fullTemplate.value.data as TemplateWithDefinition)
  }
}
</script>

<template>
  <div class="app-templates">
    <div class="app-templates__header">
      <h2 class="app-templates__title">Get Started with Templates</h2>
      <p class="app-templates__subtitle">
        Choose a pre-built template to quickly set up your workspace with tables, columns, and data
      </p>
    </div>

    <!-- Search and Filters -->
    <div class="app-templates__filters">
      <el-input
        v-model="searchQuery"
        placeholder="Search templates..."
        clearable
        class="search-input"
      >
        <template #prefix>
          <Icon name="lucide:search" />
        </template>
      </el-input>
      <el-select
        v-model="categoryFilter"
        placeholder="Category"
        class="category-select"
      >
        <el-option
          v-for="cat in categories"
          :key="cat"
          :label="cat === 'all' ? 'All Categories' : cat"
          :value="cat"
        />
      </el-select>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="app-templates__loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Loading templates...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="app-templates__error">
      <Icon name="lucide:alert-circle" size="32" />
      <p>Failed to load templates</p>
      <el-button @click="() => refresh()">Retry</el-button>
    </div>

    <!-- Templates Grid -->
    <div v-else>
      <!-- System Templates -->
      <div v-if="systemTemplates.length > 0" class="template-section">
        <h3 class="section-title">
          <Icon name="lucide:star" size="20" />
          Official Templates
        </h3>
        <div class="app-templates__grid">
          <div
            v-for="template in systemTemplates"
            :key="template.id"
            class="template-card"
          >
            <div class="template-card__header">
              <div class="template-card__icon">
                <Icon :name="template.icon || 'lucide:box'" size="32" />
              </div>
              <div class="template-card__badge">
                {{ template.category }}
              </div>
            </div>

            <div class="template-card__content">
              <h3 class="template-card__title">{{ template.name }}</h3>
              <p class="template-card__description">
                {{ template.description }}
              </p>

              <div class="template-card__tags" v-if="template.tags && template.tags.length > 0">
                <span
                  v-for="tag in template.tags"
                  :key="tag"
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>

              <div class="template-card__features">
                <div class="features-title">Includes:</div>
                <ul class="features-list">
                  <li
                    v-for="feature in getTemplateFeatures(template)"
                    :key="feature"
                    class="feature-item"
                  >
                    <Icon name="lucide:check" size="14" />
                    {{ feature }}
                  </li>
                </ul>
              </div>

              <div class="template-card__meta">
                <span class="usage-count">
                  <Icon name="lucide:download" size="14" />
                  Used {{ template.usageCount }} times
                </span>
              </div>
            </div>

            <div class="template-card__footer">
              <el-button
                type="primary"
                @click="handleApply(template)"
                class="template-card__button"
              >
                <Icon name="lucide:sparkles" class="button-icon" />
                Apply Template
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Company Templates -->
      <div v-if="companyTemplates.length > 0" class="template-section">
        <h3 class="section-title">
          <Icon name="lucide:building" size="20" />
          Company Templates
        </h3>
        <div class="app-templates__grid">
          <div
            v-for="template in companyTemplates"
            :key="template.id"
            class="template-card"
          >
            <div class="template-card__header">
              <div class="template-card__icon">
                <Icon :name="template.icon || 'lucide:box'" size="32" />
              </div>
              <div class="template-card__badge">
                {{ template.category }}
              </div>
            </div>

            <div class="template-card__content">
              <h3 class="template-card__title">{{ template.name }}</h3>
              <p class="template-card__description">
                {{ template.description }}
              </p>

              <div class="template-card__tags" v-if="template.tags && template.tags.length > 0">
                <span
                  v-for="tag in template.tags"
                  :key="tag"
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>

              <div class="template-card__features">
                <div class="features-title">Includes:</div>
                <ul class="features-list">
                  <li
                    v-for="feature in getTemplateFeatures(template)"
                    :key="feature"
                    class="feature-item"
                  >
                    <Icon name="lucide:check" size="14" />
                    {{ feature }}
                  </li>
                </ul>
              </div>

              <div class="template-card__meta">
                <span class="usage-count">
                  <Icon name="lucide:download" size="14" />
                  Used {{ template.usageCount }} times
                </span>
              </div>
            </div>

            <div class="template-card__footer">
              <el-button
                type="primary"
                @click="handleApply(template)"
                class="template-card__button"
              >
                <Icon name="lucide:sparkles" class="button-icon" />
                Apply Template
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Personal Templates -->
      <div v-if="personalTemplates.length > 0" class="template-section">
        <h3 class="section-title">
          <Icon name="lucide:user" size="20" />
          My Templates
        </h3>
        <div class="app-templates__grid">
          <div
            v-for="template in personalTemplates"
            :key="template.id"
            class="template-card"
          >
            <div class="template-card__header">
              <div class="template-card__icon">
                <Icon :name="template.icon || 'lucide:box'" size="32" />
              </div>
              <div class="template-card__badge">
                {{ template.category }}
              </div>
            </div>

            <div class="template-card__content">
              <h3 class="template-card__title">{{ template.name }}</h3>
              <p class="template-card__description">
                {{ template.description }}
              </p>

              <div class="template-card__tags" v-if="template.tags && template.tags.length > 0">
                <span
                  v-for="tag in template.tags"
                  :key="tag"
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>

              <div class="template-card__features">
                <div class="features-title">Includes:</div>
                <ul class="features-list">
                  <li
                    v-for="feature in getTemplateFeatures(template)"
                    :key="feature"
                    class="feature-item"
                  >
                    <Icon name="lucide:check" size="14" />
                    {{ feature }}
                  </li>
                </ul>
              </div>

              <div class="template-card__meta">
                <span class="usage-count">
                  <Icon name="lucide:download" size="14" />
                  Used {{ template.usageCount }} times
                </span>
              </div>
            </div>

            <div class="template-card__footer">
              <el-button
                type="primary"
                @click="handleApply(template)"
                class="template-card__button"
              >
                <Icon name="lucide:sparkles" class="button-icon" />
                Apply Template
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="templates.length === 0 && !pending" class="app-templates__empty">
        <Icon name="lucide:inbox" size="48" />
        <p>No templates found</p>
        <p class="empty-subtitle">Try adjusting your search or filters</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-templates {
  width: 100%;

  &__header {
    text-align: center;
    margin-bottom: var(--app-space-m);
  }

  &__title {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: var(--app-font-size-xxl);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  &__filters {
    display: flex;
    gap: var(--app-space-m);
    margin-bottom: var(--app-space-l);
    
    .search-input {
      flex: 1;
      max-width: 400px;
    }
    
    .category-select {
      min-width: 180px;
    }
  }

  &__loading,
  &__error,
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--app-space-xxl);
    gap: var(--app-space-m);
    color: var(--app-text-color-secondary);
    
    .empty-subtitle {
      font-size: var(--app-font-size-s);
      margin: 0;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--app-space-l);
  }
}

.template-section {
  margin-bottom: var(--app-space-xxl);
  
  .section-title {
    display: flex;
    align-items: center;
    gap: var(--app-space-xs);
    margin: 0 0 var(--app-space-l) 0;
    font-size: var(--app-font-size-l);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
  }
}

.template-card {
  display: flex;
  flex-direction: column;
  background: var(--app-paper);
  border: 1px solid var(--app-border-color-light);
  border-radius: var(--app-border-radius-m);
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--app-primary-color);
    box-shadow: var(--app-shadow-l);
    transform: translateY(-4px);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--app-space-m);
    padding-bottom: var(--app-space-m);
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: var(--app-primary-alpha-10);
    border-radius: var(--app-border-radius-m);
    color: var(--app-primary-color);
  }

  &__badge {
    padding: var(--app-space-xs) var(--app-space-s);
    background: var(--app-fill-color);
    border: 1px solid var(--app-border-color-light);
    border-radius: var(--app-border-radius-s);
    font-size: var(--app-font-size-xs);
    color: var(--app-text-color-secondary);
    font-weight: 500;
  }

  &__content {
    flex: 1;
    padding: 0 var(--app-space-l) var(--app-space-l);
  }

  &__title {
    margin: 0 0 var(--app-space-xs) 0;
    font-size: var(--app-font-size-l);
    font-weight: var(--app-font-weight-title);
    color: var(--app-text-color-primary);
  }

  &__description {
    margin: 0 0 var(--app-space-m) 0;
    font-size: var(--app-font-size-m);
    color: var(--app-text-color-secondary);
    line-height: 1.5;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--app-space-xs);
    margin-bottom: var(--app-space-m);
  }

  &__features {
    margin-top: var(--app-space-m);
    padding-top: var(--app-space-m);
    border-top: 1px solid var(--app-border-color-light);
  }

  &__meta {
    margin-top: var(--app-space-m);
    padding-top: var(--app-space-m);
    border-top: 1px solid var(--app-border-color-light);
    
    .usage-count {
      display: flex;
      align-items: center;
      gap: var(--app-space-xs);
      font-size: var(--app-font-size-xs);
      color: var(--app-text-color-secondary);
    }
  }

  &__footer {
    padding: var(--app-space-l);
    padding-top: 0;
    margin-top: auto;
  }

  &__button {
    width: 100%;
  }
}

.tag {
  display: inline-block;
  padding: var(--app-space-xxs) var(--app-space-xs);
  background: var(--app-fill-color);
  border: 1px solid var(--app-border-color-light);
  border-radius: var(--app-border-radius-s);
  font-size: var(--app-font-size-xs);
  color: var(--app-text-color-secondary);
}

.features-title {
  font-size: var(--app-font-size-s);
  font-weight: var(--app-font-weight-title);
  color: var(--app-text-color-primary);
  margin-bottom: var(--app-space-xs);
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--app-space-xs);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--app-space-xs);
  font-size: var(--app-font-size-s);
  color: var(--app-text-color-secondary);

  svg {
    color: var(--app-success-color);
    flex-shrink: 0;
  }
}

.button-icon {
  margin-right: var(--app-space-xs);
}

// Responsive
@media (max-width: 768px) {
  .app-templates {
    &__grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>

