CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "ai_usage_kind" AS ENUM('completion', 'embedding');--> statement-breakpoint
CREATE TABLE "chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"chat_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"cited_note_ids" uuid[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"note_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "note_chunk_noteId_chunkIndex_unique" UNIQUE("note_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "note_embedding_state" (
	"note_id" uuid PRIMARY KEY,
	"source_updated_at" timestamp NOT NULL,
	"content_hash" text NOT NULL,
	"chunk_count" integer NOT NULL,
	"embedded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"workspace_id" uuid,
	"kind" "ai_usage_kind" NOT NULL,
	"model" varchar(100) NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"message_id" uuid,
	"note_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ai_limit" (
	"user_id" text PRIMARY KEY,
	"chat_daily_micros" integer,
	"indexing_daily_micros" integer,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_userId_updatedAt_idx" ON "chat" ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "chat_workspaceId_userId_idx" ON "chat" ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "message_chatId_createdAt_idx" ON "message" ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "note_chunk_workspaceId_idx" ON "note_chunk" ("workspace_id");--> statement-breakpoint
CREATE INDEX "note_chunk_embedding_idx" ON "note_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "ai_usage_userId_createdAt_idx" ON "ai_usage" ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_chat_id_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "note_chunk" ADD CONSTRAINT "note_chunk_note_id_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "note"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "note_chunk" ADD CONSTRAINT "note_chunk_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "note_embedding_state" ADD CONSTRAINT "note_embedding_state_note_id_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "note"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_message_id_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_note_id_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "note"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_ai_limit" ADD CONSTRAINT "user_ai_limit_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;