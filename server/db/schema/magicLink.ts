import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'

export const magicLinks = pgTable('magic_links', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  type: text('type').notNull(), // 'login', 'invite', 'verify_email'
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

