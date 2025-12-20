-- Add description column
ALTER TABLE "data_tables" ADD COLUMN "description" text;

-- Remove old schema and view columns
ALTER TABLE "data_tables" DROP COLUMN IF EXISTS "schema";
ALTER TABLE "data_tables" DROP COLUMN IF EXISTS "default_card_view";
ALTER TABLE "data_tables" DROP COLUMN IF EXISTS "default_form";
ALTER TABLE "data_tables" DROP COLUMN IF EXISTS "default_detail_dashboard";

-- Add new JSON layout columns (all nullable)
ALTER TABLE "data_tables" ADD COLUMN "form_json" jsonb;
ALTER TABLE "data_tables" ADD COLUMN "card_json" jsonb;
ALTER TABLE "data_tables" ADD COLUMN "dashboard_json" jsonb;
ALTER TABLE "data_tables" ADD COLUMN "list_json" jsonb;

