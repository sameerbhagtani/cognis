CREATE TYPE "workspace_member_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"name" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_member_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_member_workspaceId_userId_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "folder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"parent_folder_id" uuid,
	"name" varchar(50) NOT NULL,
	"deleted_at" timestamp,
	"deleted_batch_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"folder_id" uuid,
	"title" varchar(50) NOT NULL,
	"content" text,
	"deleted_at" timestamp,
	"deleted_batch_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "workspace_member_userId_idx" ON "workspace_member" ("user_id");--> statement-breakpoint
CREATE INDEX "folder_parentFolderId_idx" ON "folder" ("parent_folder_id");--> statement-breakpoint
CREATE INDEX "folder_workspaceId_deletedAt_idx" ON "folder" ("workspace_id","deleted_at");--> statement-breakpoint
CREATE INDEX "folder_deletedBatchId_idx" ON "folder" ("deleted_batch_id");--> statement-breakpoint
CREATE INDEX "note_folderId_idx" ON "note" ("folder_id");--> statement-breakpoint
CREATE INDEX "note_workspaceId_deletedAt_idx" ON "note" ("workspace_id","deleted_at");--> statement-breakpoint
CREATE INDEX "note_deletedBatchId_idx" ON "note" ("deleted_batch_id");--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_owner_id_user_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_parent_folder_id_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "folder"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_folder_id_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folder"("id") ON DELETE CASCADE;