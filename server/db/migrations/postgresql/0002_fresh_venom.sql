CREATE TABLE "data_table_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_table_id" uuid NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"table_name" text NOT NULL,
	"app_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"schema" jsonb NOT NULL,
	"default_card_view" jsonb,
	"default_form" jsonb,
	"default_detail_dashboard" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_tables_table_name_unique" UNIQUE("table_name"),
	CONSTRAINT "data_tables_company_id_slug_unique" UNIQUE("company_id","slug")
);
--> statement-breakpoint
ALTER TABLE "apps" DROP CONSTRAINT "apps_slug_unique";--> statement-breakpoint
ALTER TABLE "data_table_columns" ADD CONSTRAINT "data_table_columns_data_table_id_data_tables_id_fk" FOREIGN KEY ("data_table_id") REFERENCES "public"."data_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_tables" ADD CONSTRAINT "data_tables_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_tables" ADD CONSTRAINT "data_tables_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_company_id_slug_unique" UNIQUE("company_id","slug");