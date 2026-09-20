# Cognis

**A collaborative note taking app that doubles as your second brain.**

Write and organise notes with your team, then ask questions about them in plain language. An AI assistant answers from your notes alone and cites the ones it used, turning a folder of documents into something you can actually talk to.

Website: [cognis.in](https://cognis.in)

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [How it works](#how-it-works)
- [API reference](#api-reference)
- [Realtime events](#realtime-events)
- [Spend limits](#spend-limits)
- [Local setup](#local-setup)
- [Background jobs](#background-jobs)
- [Further reading](#further-reading)

## What it does

**Workspaces.** Everything lives inside a workspace. A workspace holds folders, notes and chats, and you can belong to several.

**Folders and notes.** Folders nest inside each other. A note can sit inside a folder or at the workspace root.

**Sharing.** Invite someone to a workspace by email and give them a role. An editor can create and change things, a viewer can only read.

**Trash.** Deleting a folder or a note moves it to the trash rather than removing it. Everything deleted in one action is grouped together, so restoring brings back the whole group. Items older than the retention window are removed permanently by a scheduled job.

**Realtime updates.** When someone changes something in a workspace you have open, the change is pushed to you over a WebSocket. You never have to refresh.

**Chat with your notes.** Start a conversation inside a workspace and ask questions. The assistant answers from the notes in that workspace and tells you which notes it used. Chats are private to whoever created them.

## Tech stack

| Area        | Choice                                                                  |
| ----------- | ----------------------------------------------------------------------- |
| Runtime     | Node.js 22.12 or later, TypeScript                                      |
| API         | Express 5, Socket.IO                                                    |
| Auth        | Better Auth, email and password with email verification                 |
| Database    | PostgreSQL 17 with the pgvector extension                               |
| ORM         | Drizzle ORM and Drizzle Kit                                             |
| AI          | OpenAI, `gpt-5.6-luna` for answers, `text-embedding-3-small` for search |
| Email       | Brevo                                                                   |
| Mobile      | Expo and React Native, Expo Router                                      |
| Landing     | Astro and Tailwind CSS                                                  |
| Tooling     | pnpm workspaces, Turborepo, ESLint, Prettier, Husky                     |
| API testing | Bruno collection in `bruno/`                                            |

## Project structure

This is a pnpm monorepo managed with Turborepo.

```
apps/
  api/          Express API, WebSocket server, background jobs
  mobile/       Expo app
  landing/      Astro marketing site
packages/
  database/     Drizzle schema, migrations, database client
  constants/    Shared constants
  types/        Shared types
  eslint-config/
  typescript-config/
bruno/          API request collection
docs/           Design documents for each phase
```

Inside `apps/api/src`:

```
modules/        One folder per resource: routes, controller, service, validation
lib/            Third party integrations: OpenAI, email
realtime/       Socket server, rooms, events
shared/         Config, middleware, services and utilities used across modules
jobs/           Standalone scripts run outside the server
```

## Data model

![Cognis ER diagram](./docs/phase2/er.png)

| Table                  | What it holds                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `user`                 | Accounts. Managed by Better Auth, along with `session`, `account` and `verification`. |
| `workspace`            | The top level container. Has one owner.                                               |
| `workspace_member`     | Who belongs to a workspace, with a role of owner, editor or viewer.                   |
| `folder`               | Belongs to a workspace, and nests inside another folder.                              |
| `note`                 | Belongs to a workspace, and optionally sits inside a folder.                          |
| `chat`                 | One conversation, owned by a single user inside one workspace.                        |
| `message`              | One turn in a conversation, from the user or the assistant.                           |
| `note_chunk`           | A slice of a note with its embedding, used for search.                                |
| `note_embedding_state` | Tracks how far each note's search index has caught up with its content.               |
| `ai_usage`             | One row per paid AI call, used for spend limits.                                      |
| `user_ai_limit`        | Per user overrides of the default spend limits.                                       |

## How it works

### Writing and reading

All changes go through the REST API. After a change is saved, the server broadcasts it over the WebSocket to everyone else in that workspace. Clients only ever read from the socket, they never write to it.

### Making notes searchable

Notes are indexed in the background so they can be searched by meaning rather than by keyword.

```
note saved
   -> wait until typing stops
   -> has the text actually changed?
        no  -> stop, nothing to do
        yes -> split the note into overlapping chunks
            -> convert each chunk into an embedding
            -> replace the note's old chunks with the new ones
```

Three details make this cheap and reliable:

1. **A content check.** Before doing anything, the note's current text is compared against what was last indexed. Moving a note, renaming a folder around it or saving without changing anything all skip the work entirely.
2. **A short delay.** Indexing waits a few seconds after you stop typing, so a burst of autosaves becomes one update instead of many. There is also a limit of one update per note per minute.
3. **A background worker.** The delay above lives in memory, so a restart can lose it. A separate worker process looks for notes whose index has fallen behind and brings them up to date. It also indexes notes that existed before this feature was added, with no migration needed.

Trashed notes keep their chunks. That means restoring a note from the trash makes it searchable again immediately, with nothing to re-index.

### Answering a question

```
question
   -> is this a follow up in an existing conversation?
        yes -> rewrite it into a standalone question using the recent turns
   -> how much content is in this workspace?
        small -> include every note in full
        large -> search for the most relevant chunks and include those
   -> always include the list of note titles in the workspace
   -> send everything to the model
   -> stream the answer back over the WebSocket
   -> save the answer along with the notes it used
```

## API reference

All routes are prefixed with `/api`. Every route except the auth routes and the health check requires a signed in session, which is carried in a cookie.

Where a role is listed, `member` means any role including viewer.

### Auth

Handled by Better Auth at `ALL /api/auth/*`. This covers sign up, sign in, sign out, session checks, password reset and email verification. Email verification is required before a first sign in.

### Health

| Method | Route         | Description              |
| ------ | ------------- | ------------------------ |
| GET    | `/api/health` | Service status, no auth. |

### Workspaces

| Method | Route                      | Who      | Description                         |
| ------ | -------------------------- | -------- | ----------------------------------- |
| POST   | `/workspaces`              | any user | Create a workspace and become owner |
| GET    | `/workspaces`              | any user | Workspaces you belong to            |
| GET    | `/workspaces/:workspaceId` | member   | One workspace, with your role       |
| PATCH  | `/workspaces/:workspaceId` | owner    | Rename                              |
| DELETE | `/workspaces/:workspaceId` | owner    | Delete permanently, with contents   |

### Members

| Method | Route                                        | Who    | Description                          |
| ------ | -------------------------------------------- | ------ | ------------------------------------ |
| GET    | `/workspaces/:workspaceId/members`           | member | List members                         |
| POST   | `/workspaces/:workspaceId/members`           | owner  | Invite by email, as editor or viewer |
| PATCH  | `/workspaces/:workspaceId/members/:memberId` | owner  | Change role                          |
| DELETE | `/workspaces/:workspaceId/members/:memberId` | owner  | Remove from the workspace            |

Invited people receive an email. The workspace owner cannot change or remove their own membership.

### Folders

| Method | Route                              | Who           | Description                               |
| ------ | ---------------------------------- | ------------- | ----------------------------------------- |
| POST   | `/workspaces/:workspaceId/folders` | owner, editor | Create, optionally inside a parent folder |
| GET    | `/workspaces/:workspaceId/folders` | member        | List, optionally filtered by parent       |
| GET    | `/folders/:folderId`               | member        | One folder                                |
| PATCH  | `/folders/:folderId`               | owner, editor | Rename, move, or both                     |
| DELETE | `/folders/:folderId`               | owner, editor | Move to trash, with everything inside     |
| POST   | `/folders/:folderId/restore`       | owner, editor | Restore from trash                        |

### Notes

| Method | Route                            | Who           | Description                                       |
| ------ | -------------------------------- | ------------- | ------------------------------------------------- |
| POST   | `/workspaces/:workspaceId/notes` | owner, editor | Create, optionally inside a folder                |
| GET    | `/workspaces/:workspaceId/notes` | member        | List, optionally filtered by folder               |
| GET    | `/notes/:noteId`                 | member        | One note                                          |
| PATCH  | `/notes/:noteId`                 | owner, editor | Change title, content, folder, or any combination |
| DELETE | `/notes/:noteId`                 | owner, editor | Move to trash                                     |
| POST   | `/notes/:noteId/restore`         | owner, editor | Restore from trash                                |

### Trash

| Method | Route                            | Who           | Description                             |
| ------ | -------------------------------- | ------------- | --------------------------------------- |
| GET    | `/workspaces/:workspaceId/trash` | member        | Trashed items, grouped by delete action |
| POST   | `/trash/:deletedBatchId/restore` | owner, editor | Restore a whole group                   |

### Chats

| Method | Route                            | Who        | Description                                      |
| ------ | -------------------------------- | ---------- | ------------------------------------------------ |
| POST   | `/workspaces/:workspaceId/chats` | member     | Start a conversation                             |
| GET    | `/workspaces/:workspaceId/chats` | member     | Your conversations, most recent first            |
| GET    | `/chats/:chatId`                 | chat owner | One conversation with its messages               |
| DELETE | `/chats/:chatId`                 | chat owner | Delete permanently                               |
| POST   | `/chats/:chatId/messages`        | chat owner | Ask a question, the answer arrives on the socket |

Viewers can use chat, since reading a note and asking about it amount to the same thing. A conversation that does not exist and one belonging to someone else both return the same not found response.

### Account

| Method | Route          | Who      | Description                                    |
| ------ | -------------- | -------- | ---------------------------------------------- |
| GET    | `/me/ai-usage` | any user | AI spend used, the limits, and when they reset |

### Response shape

Successful responses look like this:

```json
{ "success": true, "message": "Notes fetched", "data": [] }
```

Failures look like this, with a validation error adding an `errors` object describing which fields were wrong:

```json
{ "success": false, "message": "Workspace not found" }
```

## Realtime events

Clients connect to the Socket.IO server using the same session cookie as the REST API. A socket without a valid session is rejected before it connects.

After connecting, a client joins a room for each workspace it has open, and a room for each conversation. Membership is checked on the server every time, so a client cannot subscribe to something it should not see.

### Sent by the client

| Event             | Payload       | Description                 |
| ----------------- | ------------- | --------------------------- |
| `workspace:join`  | `workspaceId` | Subscribe to a workspace    |
| `workspace:leave` | `workspaceId` | Unsubscribe                 |
| `chat:join`       | `chatId`      | Subscribe to a conversation |
| `chat:leave`      | `chatId`      | Unsubscribe                 |

Those are the only events a client sends. Every change is made through the REST API.

### Sent by the server

Workspace room:

| Event                 | Payload                              |
| --------------------- | ------------------------------------ |
| `workspace:updated`   | the workspace                        |
| `workspace:deleted`   | `{ id }`                             |
| `folder:created`      | the folder                           |
| `folder:updated`      | the folder                           |
| `folder:moved`        | `{ id, parentFolderId }`             |
| `folder:deleted`      | `{ id, deletedBatchId }`             |
| `folder:restored`     | `{ deletedBatchId, folderIds }`      |
| `note:created`        | the note                             |
| `note:updated`        | `{ id, title, folderId, updatedAt }` |
| `note:moved`          | `{ id, folderId }`                   |
| `note:deleted`        | `{ id, deletedBatchId }`             |
| `note:restored`       | `{ deletedBatchId, noteIds }`        |
| `member:role_changed` | `{ userId, role }`                   |
| `member:removed`      | `{ userId }`                         |

Chat room:

| Event                    | Payload                                                   |
| ------------------------ | --------------------------------------------------------- |
| `chat:message_started`   | `{ chatId, messageId }`                                   |
| `chat:token`             | `{ chatId, messageId, delta }`                            |
| `chat:message_completed` | `{ chatId, messageId, content, citedNoteIds, truncated }` |
| `chat:error`             | `{ chatId, messageId, message }`                          |

`note:updated` does not carry the note body, since it fires on every autosave. Clients viewing that note reload it when they see the event.

## Spend limits

AI calls cost money, so every call is recorded and capped. There are two budgets per user, measured over a rolling 24 hours:

- **Chat**, for asking questions.
- **Indexing**, for making notes searchable.

They are separate on purpose. A day spent importing a lot of notes should not take away your ability to ask questions about them.

There is also a ceiling across all users combined, so the total cost stays bounded no matter how many people sign up.

`GET /api/me/ai-usage` reports where a user stands. To raise or lower an individual's limits:

```bash
pnpm --filter @cognis/api ai:limit someone@example.com --chat 150000 --indexing 30000
pnpm --filter @cognis/api ai:limit someone@example.com --show
pnpm --filter @cognis/api ai:limit someone@example.com --clear
```

Amounts are in micro dollars per day, so 1000000 is one dollar. Each budget is independent, and passing only one leaves the other alone.

## Local setup

### Prerequisites

- Node.js 22.12 or later
- pnpm 12 or later
- Docker, for PostgreSQL

### Steps

1. Install dependencies.

```bash
pnpm install
```

2. Create the environment files.

```bash
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
```

Then fill in `apps/api/.env`:

| Variable               | Notes                                              |
| ---------------------- | -------------------------------------------------- |
| `DATABASE_URL`         | Matches the Docker setup out of the box            |
| `BETTER_AUTH_SECRET`   | Any long random string                             |
| `BETTER_AUTH_URL`      | The API's own URL, `http://localhost:5000` locally |
| `CLIENT_URL`           | Where the frontend runs, used for CORS             |
| `OPENAI_API_KEY`       | Required for chat and search                       |
| `BREVO_API_KEY`        | Required for verification and invite emails        |
| `EMAIL_FROM_ADDRESS`   | The sender address                                 |
| `TRASH_RETENTION_DAYS` | How long trashed items are kept, defaults to 30    |

`packages/database/.env` only needs `DATABASE_URL`, matching the one above.

3. Start PostgreSQL.

```bash
pnpm db:up
```

This runs a `pgvector/pgvector:pg17` container. The standard Postgres image does not include the vector extension, so the project will not work with it.

4. Apply the migrations.

```bash
pnpm db:migrate
```

5. Start the apps.

```bash
pnpm dev
```

    The API runs on port 5000 by default.

6. In a second terminal, start the note indexing worker.

```bash
pnpm --filter @cognis/api embed:dev
```

Without it, notes are still indexed while the API is running, but anything missed during a restart stays unindexed.

### Useful commands

| Command                              | What it does                               |
| ------------------------------------ | ------------------------------------------ |
| `pnpm dev`                           | Start every app in development             |
| `pnpm lint`                          | Lint everything                            |
| `pnpm check-types`                   | Type check everything                      |
| `pnpm format`                        | Format with Prettier                       |
| `pnpm db:up` / `pnpm db:down`        | Start or stop PostgreSQL                   |
| `pnpm db:reset`                      | Delete the database volume and start fresh |
| `pnpm db:generate`                   | Create a migration from schema changes     |
| `pnpm db:migrate`                    | Apply pending migrations                   |
| `pnpm --filter @cognis/database dev` | Open Drizzle Studio                        |

### Trying the API

The `bruno/` folder is a [Bruno](https://www.usebruno.com) collection covering every endpoint. Sign in first, and the rest of the requests reuse the session automatically. Ids are passed between requests, so most of them work without filling anything in.

## Background jobs

Two scripts run outside the API process. Starting the server does not start either of them.

| Job           | Command                           | When to run                             |
| ------------- | --------------------------------- | --------------------------------------- |
| Trash purge   | `pnpm --filter @cognis/api purge` | On a schedule, once a day is typical    |
| Note indexing | `pnpm --filter @cognis/api embed` | Continuously, as a long running service |

Both have `:dev` variants that run from source instead of the build output.

## Further reading

Design documents describing why things are built the way they are:

- [`docs/phase1/doc.md`](./docs/phase1/doc.md) covers auth, workspaces, folders, notes, trash and realtime.
- [`docs/phase2/doc.md`](./docs/phase2/doc.md) covers chat, search and spend limits.

Each folder also contains the entity relationship diagram in both image and source form.
