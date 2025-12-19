ALTER TABLE "apps" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_slug_unique" UNIQUE("slug");