DROP INDEX "chat_userId_updatedAt_idx";--> statement-breakpoint
DROP INDEX "chat_workspaceId_userId_idx";--> statement-breakpoint
CREATE INDEX "chat_workspaceId_userId_updatedAt_idx" ON "chat" ("workspace_id","user_id","updated_at" DESC);--> statement-breakpoint
CREATE INDEX "ai_usage_workspaceId_idx" ON "ai_usage" ("workspace_id");--> statement-breakpoint
CREATE INDEX "ai_usage_messageId_idx" ON "ai_usage" ("message_id");--> statement-breakpoint
CREATE INDEX "ai_usage_noteId_idx" ON "ai_usage" ("note_id");