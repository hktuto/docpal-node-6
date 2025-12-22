CREATE TABLE "data_table_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_table_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'table' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"visible_columns" jsonb,
	"column_widths" jsonb,
	"filters" jsonb,
	"sort" jsonb,
	"view_config" jsonb,
	"page_size" jsonb DEFAULT '50'::jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_table_views_data_table_id_slug_unique" UNIQUE("data_table_id","slug")
);
--> statement-breakpoint
ALTER TABLE "data_table_columns" ADD COLUMN "default_value" text;--> statement-breakpoint
ALTER TABLE "data_table_columns" ADD COLUMN "is_unique" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "data_table_columns" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "data_table_columns" ADD COLUMN "validation_rules" jsonb;--> statement-breakpoint
ALTER TABLE "data_table_views" ADD CONSTRAINT "data_table_views_data_table_id_data_tables_id_fk" FOREIGN KEY ("data_table_id") REFERENCES "public"."data_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_table_views" ADD CONSTRAINT "data_table_views_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;