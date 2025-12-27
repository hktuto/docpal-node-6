import { readFile } from 'fs/promises'
import { join } from 'path'
import { db } from 'hub:db'
import { appTemplates } from 'hub:db:schema'
import { eq } from 'drizzle-orm'
import type { NewAppTemplate } from '#shared/types/db'
import { generateUUID } from '~~/server/utils/uuid'

/**
 * Seed Templates Utility
 * 
 * Reads template definitions from JSON files and seeds them to database
 * This separates data from logic for easier maintenance
 */

interface TemplateSeedData {
  templates: Array<{
    name: string
    description: string
    icon: string
    coverImage?: string
    category: string
    tags: string[]
    visibility: 'system' | 'public' | 'company' | 'personal'
    isFeatured: boolean
    includesSampleData: boolean
    includesViews: boolean
    templateDefinition: any
  }>
}

/**
 * Load templates from JSON file
 */
export async function loadTemplatesFromJSON(filename: string): Promise<TemplateSeedData> {
  const filePath = join(process.cwd(), 'server/data', filename)
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Seed templates from JSON data
 * Idempotent - checks if template exists before inserting
 */
export async function seedTemplatesFromData(
  data: TemplateSeedData,
  options: {
    skipExisting?: boolean // Skip if template already exists
    updateExisting?: boolean // Update if template exists
  } = {}
): Promise<{
  created: number
  skipped: number
  updated: number
  templates: any[]
}> {
  const { skipExisting = true, updateExisting = false } = options
  
  let created = 0
  let skipped = 0
  let updated = 0
  const seededTemplates = []

  for (const template of data.templates) {
    // Check if template already exists
    const existing = await db
      .select()
      .from(appTemplates)
      .where(eq(appTemplates.name, template.name))
      .limit(1)

    if (existing.length > 0) {
      if (updateExisting) {
        // Update existing template
        const [updatedTemplate] = await db
          .update(appTemplates)
          .set({
            description: template.description,
            icon: template.icon,
            coverImage: template.coverImage || null,
            category: template.category,
            tags: template.tags,
            visibility: template.visibility,
            isFeatured: template.isFeatured,
            templateDefinition: template.templateDefinition,
            includesSampleData: template.includesSampleData,
            includesViews: template.includesViews,
            updatedAt: new Date()
          })
          .where(eq(appTemplates.id, existing[0].id))
          .returning()
        
        seededTemplates.push(updatedTemplate)
        updated++
        console.log(`✓ Updated template: ${template.name}`)
      } else {
        skipped++
        seededTemplates.push(existing[0])
        console.log(`⊘ Skipped existing template: ${template.name}`)
      }
      continue
    }

    // Insert new template
    const [newTemplate] = await db
      .insert(appTemplates)
      .values({
        id: generateUUID(),
        name: template.name,
        description: template.description,
        icon: template.icon,
        coverImage: template.coverImage || null,
        category: template.category,
        tags: template.tags,
        visibility: template.visibility,
        isFeatured: template.isFeatured,
        templateDefinition: template.templateDefinition,
        includesSampleData: template.includesSampleData,
        includesViews: template.includesViews,
        createdBy: null, // System templates have no creator
        companyId: null, // System templates are global
      } as NewAppTemplate)
      .returning()

    seededTemplates.push(newTemplate)
    created++
    console.log(`✓ Created template: ${template.name}`)
  }

  return {
    created,
    skipped,
    updated,
    templates: seededTemplates
  }
}

/**
 * Seed advanced CRM template
 * 
 * This is the primary template with:
 * - Complete CRM structure
 * - Relations, lookups, rollups, formulas
 * - Sample data
 * - 5 interconnected tables
 */
export async function seedAdvancedTemplate(options?: { skipExisting?: boolean; updateExisting?: boolean }) {
  console.log('📦 Seeding Advanced CRM template...')
  const data = await loadTemplatesFromJSON('seed-templates-advanced.json')
  return await seedTemplatesFromData(data, options)
}

/**
 * Get template count by visibility
 */
export async function getTemplateStats() {
  const templates = await db.select().from(appTemplates)
  
  return {
    total: templates.length,
    system: templates.filter(t => t.visibility === 'system').length,
    public: templates.filter(t => t.visibility === 'public').length,
    company: templates.filter(t => t.visibility === 'company').length,
    personal: templates.filter(t => t.visibility === 'personal').length,
    featured: templates.filter(t => t.isFeatured).length,
  }
}

