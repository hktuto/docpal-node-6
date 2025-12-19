<script setup lang="ts">
interface AppTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  tags: string[]
  features: string[]
}

const emit = defineEmits<{
  apply: [template: AppTemplate]
}>()

// App templates that users can apply
const templates: AppTemplate[] = [
  {
    id: 'crm',
    name: 'CRM',
    description: 'Customer Relationship Management system to track leads, contacts, deals, and customer interactions.',
    icon: 'lucide:users',
    category: 'Business',
    tags: ['Sales', 'Customers', 'Leads'],
    features: ['Contacts', 'Deals', 'Activities', 'Reports']
  },
  {
    id: 'project-management',
    name: 'Project Management',
    description: 'Manage projects, tasks, milestones, and team collaboration in one place.',
    icon: 'lucide:briefcase',
    category: 'Productivity',
    tags: ['Tasks', 'Projects', 'Team'],
    features: ['Projects', 'Tasks', 'Milestones', 'Team Members']
  },
  {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Track products, stock levels, suppliers, and manage your inventory efficiently.',
    icon: 'lucide:package',
    category: 'Business',
    tags: ['Products', 'Stock', 'Suppliers'],
    features: ['Products', 'Stock Levels', 'Suppliers', 'Orders']
  },
  {
    id: 'task-tracker',
    name: 'Task Tracker',
    description: 'Simple task management system to organize and track your personal or team tasks.',
    icon: 'lucide:check-square',
    category: 'Productivity',
    tags: ['Tasks', 'Todo', 'Personal'],
    features: ['Tasks', 'Priorities', 'Due Dates', 'Status']
  },
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Handle customer tickets, track issues, and manage support workflows.',
    icon: 'lucide:headphones',
    category: 'Support',
    tags: ['Tickets', 'Support', 'Issues'],
    features: ['Tickets', 'Customers', 'Status', 'Priority']
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and schedule your content, track publishing dates, and manage content workflow.',
    icon: 'lucide:calendar',
    category: 'Marketing',
    tags: ['Content', 'Calendar', 'Publishing'],
    features: ['Content Items', 'Schedule', 'Status', 'Channels']
  },
  {
    id: 'expense-tracker',
    name: 'Expense Tracker',
    description: 'Track expenses, receipts, budgets, and manage your financial records.',
    icon: 'lucide:receipt',
    category: 'Finance',
    tags: ['Expenses', 'Budget', 'Finance'],
    features: ['Expenses', 'Categories', 'Budget', 'Reports']
  },
  {
    id: 'hr-management',
    name: 'HR Management',
    description: 'Manage employees, leave requests, performance reviews, and HR processes.',
    icon: 'lucide:user-circle',
    category: 'Business',
    tags: ['Employees', 'HR', 'Leave'],
    features: ['Employees', 'Leave Requests', 'Reviews', 'Documents']
  }
]

const handleApply = (template: AppTemplate) => {
  emit('apply', template)
}
</script>

<template>
  <div class="app-templates">
    <div class="app-templates__header">
      <h2 class="app-templates__title">Get Started with Templates</h2>
      <p class="app-templates__subtitle">
        Choose a pre-built template to quickly set up your app with tables, views, and workflows
      </p>
    </div>

    <div class="app-templates__grid">
      <div
        v-for="template in templates"
        :key="template.id"
        class="template-card"
      >
        <div class="template-card__header">
          <div class="template-card__icon">
            <Icon :name="template.icon" size="32" />
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

          <div class="template-card__tags">
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
                v-for="feature in template.features"
                :key="feature"
                class="feature-item"
              >
                <Icon name="lucide:check" size="14" />
                {{ feature }}
              </li>
            </ul>
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

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--app-space-l);
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

