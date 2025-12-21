-- Create sessions table
CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "company_id" uuid REFERENCES "companies"("id") ON DELETE SET NULL,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create magic_links table
CREATE TABLE "magic_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "type" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create company_members table
CREATE TABLE "company_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create company_invites table
CREATE TABLE "company_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "invite_code" text NOT NULL UNIQUE,
  "invited_by" uuid NOT NULL REFERENCES "users"("id"),
  "accepted_at" timestamp,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "changes" jsonb,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_token_idx" ON "sessions"("token");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

CREATE INDEX "magic_links_email_idx" ON "magic_links"("email");
CREATE INDEX "magic_links_token_idx" ON "magic_links"("token");
CREATE INDEX "magic_links_expires_at_idx" ON "magic_links"("expires_at");

CREATE INDEX "company_members_company_id_idx" ON "company_members"("company_id");
CREATE INDEX "company_members_user_id_idx" ON "company_members"("user_id");

CREATE INDEX "company_invites_company_id_idx" ON "company_invites"("company_id");
CREATE INDEX "company_invites_email_idx" ON "company_invites"("email");
CREATE INDEX "company_invites_invite_code_idx" ON "company_invites"("invite_code");

CREATE INDEX "audit_logs_company_id_idx" ON "audit_logs"("company_id");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

