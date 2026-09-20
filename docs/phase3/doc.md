# Cognis — Phase 3 (PRD)

**The mobile frontend.** This is a plan, not a record of what's built — unlike `phase1/doc.md` and `phase2/doc.md`, which describe the backend as it exists. Everything here lives in `apps/mobile` unless noted, and talks to the backend exactly as documented in the root README and phase 1/2 docs. No backend changes are expected to be needed for this phase.

---

## Where we're starting from

The `mobile` branch was merged in with some early screens already built. Audited against this PRD, here's what survives and what doesn't:

**Keep, as foundation:**

- Theme system (`lib/theme/*`, `@cognis/constants` themes) — sound, extend rather than replace.
- `lib/auth.ts` — the Better Auth client with the `expoClient` plugin and `SecureStore`, is the correct integration pattern.
- Root `_layout.tsx`'s `Stack.Protected` session guard.
- The React Hook Form + Zod pattern used in the auth screens.

**Rewrite:**

- Signin/Signup screens — logic is fine, but hardcoded `#EF4444` needs to become a theme token, and the flow is incomplete (see Auth screens below).
- `FileTree.tsx` — currently renders hardcoded dummy data. Needs real API wiring, a context menu, and a move-to-folder picker.
- `AiChat.tsx` (sidebar chat list) — currently a single `<Text>`. Needs the real chat list.
- `DrawerTabs.tsx` / `DrawerPager.tsx` — the swipeable-tabs approach doesn't match the mode-switch design below; replaced by a simpler mode-driven middle section.

**Replaced entirely:**

- `CognisEditor.tsx` and the `@10play/tentap-editor` dependency it's built on. See Editor below — this becomes a custom-built markdown editor, not a WYSIWYG rich-text one. TenTap has no markdown export path at all (confirmed against the installed package and its README), so it can't give us what we actually want here.

**New, doesn't exist yet:**

- An `axios` instance for the actual Cognis REST API (today only Better Auth's own client talks to the network).
- A socket.io client and the hooks/rooms around it.
- Workspace switcher, workspace creation, member invite.
- The chat screen itself (message list + streaming).
- Settings screen.
- The markdown editor itself: a small bundled CodeMirror 6 web app hosted in `react-native-webview`, the RN↔WebView bridge for it, and the native toolbar/keyboard plumbing around it. See Editor below — this is the one genuinely novel build in this phase, everything else here is wiring an existing pattern to our API.

---

## Scope

**In:** Auth (full Better Auth flow), Editor, Chat, Settings, the sidebar, workspace switching, workspace creation, inviting a member by email.

**Out, deliberately deferred:**

- **Workspace administration** — deferred out of the first pass, then built as its own later phase. See below.
- Trash browsing/restore UI (soft-deletes still happen; there's just no screen to browse or restore them yet).
- Offline support, local caching, push notifications.
- Any change to `apps/landing`.

### Workspace administration — built, as its own later phase

Deferred out of the first pass and picked up after responsiveness. The five routes below are now all in use.

**The UI question was where to put it.** Everything used to hang off the workspace popup in the sidebar's footer — create was a row in it, invite a small action beside owned workspaces. That popup is a _switcher_; adding rename, delete, a member list, role changes and removals would have made it a menu that happens to also switch.

So: the popup keeps one job, picking a workspace, and each row gets a trailing button opening **that workspace's own screen** — by id, not by switching to it first. Settings stays scoped to app preferences (theme, account, usage, sign out); the workspace screen holds everything about one workspace.

| Section     | Owner                                        | Editor / Viewer  |
| ----------- | -------------------------------------------- | ---------------- |
| Name        | tap to rename                                | read-only        |
| Members     | full list, rows open a menu                  | full list, inert |
| Invite      | button on the members header, opens a dialog | hidden           |
| Danger zone | Delete workspace, plain confirm              | hidden           |

Member actions live in the existing `ActionSheet` rather than inline pickers or swipe gestures: _Make editor / Make viewer_, _Remove from workspace_. The owner's own row gets no menu at all, because the API refuses to change or remove it — a menu whose every option 400s is worse than no menu.

`GET /workspaces/:id/members` is readable by **any** member, not just the owner, so the list renders for everyone. That closes the "invite someone and then never see who has access" gap for non-owners too.

**Invite is a dialog, not a route.** It began as a screen and had to move: the drawer navigator keeps a screen mounted once visited, so reopening invite showed the _previous_ invite's success message — for a person who had since been removed. A conditionally-mounted dialog can't hold state across opens, which removes the whole class of bug rather than patching this instance of it. Create-workspace stays a screen because onboarding renders it standalone with no drawer behind it; invite has no such need. It does still clear its error banner on focus, for the same reason.

**Decided against, for now:** a pending-invite flow. `addMember` looks the invitee up by email and 404s if they have no Cognis account, so invites only work for existing users; the invite dialog says so up front. And there is no "leave workspace" — `DELETE .../members/:memberId` is owner-only, so a non-owner can't remove themselves. Both are backend gaps, not screens, and neither is worth the work yet.

### Live reconciliation

Built straight after, as its own pass. The backend already emitted `workspace:updated`, `workspace:deleted`, `member:role_changed` and `member:removed`; the client listened to none of them, so a demoted user kept edit controls until they restarted the app.

All four now land in `WorkspaceProvider`, and nearly all of them resolve the same way: call `refresh`. `GET /workspaces` returns each workspace with the caller's **current** role and omits any they can no longer see, so one refetch settles a rename, a demotion, a removal and a deletion alike. No payload merging, nothing to get subtly wrong.

Three details that aren't obvious from the event names:

- **`member:removed` and `member:role_changed` carry a `userId` but no `workspaceId`.** They're actionable only because a client joins exactly one workspace room — the active one (`NotesProvider`). An arriving event therefore can't be about anything else. If the client ever joins several rooms, this breaks, and these handlers are where it breaks.
- **Events come back to whoever caused them.** `emitToWorkspace` includes the actor, so an owner deleting a workspace would be told their own workspace "was deleted by its owner". Suppressed by checking `ownerId === userId`: only an owner can delete, and there is exactly one, so an owned workspace vanishing is always your own doing. The removal and role-change handlers need no such guard — both are filtered to `userId === me`, and the API forbids an owner acting on their own row.
- **The editor's read-only toggle had to be re-seeded.** `readOnly` starts from `canWrite` and is then owned by the toggle, so a demotion mid-edit left the editor writable against a role that can no longer save. Corrected during render rather than in an effect, so no frame ever paints edit controls the server would reject.

Losing access is the only change announced with a dialog, because it moves you somewhere you didn't ask to go. A demotion isn't: the controls disappearing says it more plainly than a dialog would.

The workspace screen subscribes separately to keep its member list live, guarded on the workspace being the active one — otherwise a change where you're working would refetch the members of an unrelated workspace you happen to be looking at.

The routes this phase wires up:

| Route                                      | What it does                     | Who        |
| ------------------------------------------ | -------------------------------- | ---------- |
| `GET /workspaces/:id/members`              | List who's in the workspace      | Any member |
| `PATCH /workspaces/:id/members/:memberId`  | Change someone's role            | Owner      |
| `DELETE /workspaces/:id/members/:memberId` | Remove someone                   | Owner      |
| `PATCH /workspaces/:id`                    | Rename the workspace             | Owner      |
| `DELETE /workspaces/:id`                   | Delete it, and everything inside | Owner      |

`GET /workspaces/:id` stays unused regardless — the list endpoint already returns each workspace with the caller's role, so the screen reads its own role and name straight from the list it already has, with no fetch of its own.

---

## Screens

### Auth

The backend requires email verification before sign-in and supports Better Auth's standard password reset. Full flow:

| Screen          | Notes                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in         | Existing, needs the color-token fix.                                                                                                                                                                                          |
| Sign up         | Existing, needs the color-token fix.                                                                                                                                                                                          |
| Verify email    | New. Shown right after sign-up (and if a sign-in attempt fails because the account is unverified). Explains that an email was sent, with a resend action. No polling — the app just retries sign-in when the user comes back. |
| Forgot password | New. Email input, calls Better Auth's request-reset.                                                                                                                                                                          |
| Reset password  | New. Opens from the emailed link via the `cognis://` deep link (this is what `@better-auth/expo`'s `expoClient` scheme config exists for) and lets the user set a new password.                                               |

### Editor

An Obsidian-style live-preview markdown editor, purpose-built rather than adopted from a library — no existing RN package combines rich-enough editing with real markdown storage (see the library survey below). `note.content` stores clean markdown text throughout; there is no HTML involved anywhere in this design.

**Architecture.** A small bundled web app — CodeMirror 6 plus [`@atomic-editor/editor`](https://www.npmjs.com/package/@atomic-editor/editor) (MIT, actively maintained, vetted against the real npm registry metadata and its shipped type definitions rather than assumed) for the live-preview decorations — hosted inside `react-native-webview`. This is the same integration shape TenTap itself used (bundle a web editor, talk to it over a postMessage bridge), just pointed at CodeMirror instead of TipTap, and it's also literally how Obsidian's own mobile apps work: Live Preview is CodeMirror 6 in a WebView there too, chosen specifically because it's one of the only editors that performs well on mobile.

`@atomic-editor/editor` exports plain CM6 `Extension` factories rather than only a React component, so we use just the pieces we need directly in our own `EditorState`, with no React runtime involved in the actual bundle:

- `inlinePreview()` — the exact "raw markdown on the active line, rendered elsewhere" behavior.
- `readOnlyExtension(ro)` — designed to live in a `Compartment` for in-place Edit ↔ Read toggling with no remount and preserved scroll position; in read-only it already does what our Reading view needs (no caret, no focus, whole doc stays rendered) rather than us building that ourselves.
- `atomicEditorTheme` / `atomicMarkdownSyntax` — ready-made styling for the rendered markdown, so headings/bold/etc. don't need hand-written CSS.
- `edit-helpers` (auto-continue lists, auto-close code fences, smart emphasis pairing) — free quality-of-life wins we didn't have to build.

**Two modes, mapped onto Obsidian's own two view modes:**

- **Edit (Live Preview).** The line the cursor is on shows raw markdown syntax; every other line renders styled (headings look like headings, `**bold**` looks bold, etc.). A horizontally-scrollable toolbar is pinned above the keyboard while focused, via `react-native-keyboard-controller` (`InputAccessoryView` alone is iOS-only with no real Android equivalent, so this library's `KeyboardToolbar`/`KeyboardStickyView` covers both platforms). Default toolbar buttons: **Bold, Italic, Strikethrough, inline Code, Heading (cycles H1→H2→H3), Bulleted list, Numbered list, Checklist, Blockquote, Link.**
- **Read (Reading view).** Fully rendered, no raw markdown ever visible, no cursor, no keyboard, no toolbar. Tapping the note body does nothing (no focus, no keyboard).

**The toggle.** Top-right of the Editor screen, switches Edit ↔ Read. Visible only when the caller's workspace role is `owner` or `editor`. For a `viewer`, the screen is permanently in Read mode and the toggle doesn't render at all — there's nothing for them to edit, so no affordance to imply otherwise.

- Title is a separate field above the body (`note.title`, capped at 50 chars per the schema).
- Autosave: debounce PATCH `/notes/:id` a couple of seconds after typing stops, same spirit as the backend's own embedding debounce.
- Listens for `note:updated` on the currently open note; if it fires for a note the user has open, show a small non-blocking banner ("this note changed elsewhere") rather than clobbering their in-progress edit. Matches the backend's documented last-write-wins model — we're not building conflict resolution, just not being silent about it.

**Why not an existing library** (checked against each project's own repo/README, not memory):

| Option                                              | Verdict                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@10play/tentap-editor` (what was there before)     | No markdown path at all — confirmed via the installed package's bridge code (only `getHTML`/`getJSON`/`getText`) and its README (zero mentions of markdown, not even planned).                                                                                                                                                                                                                                    |
| `@expensify/react-native-live-markdown`             | Real markdown storage, production-proven at Expensify, but it's a flat `TextInput` replacement — no per-line raw/rendered switching, and its default parser only supports `h1` (no h2–h6) with unclear list support. Doesn't get us the Obsidian behavior without writing a custom parser anyway, at which point we're doing comparable work to the CodeMirror route without CodeMirror's mobile-proven pedigree. |
| `react-native-enriched-markdown` (Software Mansion) | The right shape (native rendering, real markdown, good pedigree — same team as `reanimated`/`gesture-handler` already here) but at `v0.1.0`, too early to build the core editor on. Worth revisiting in a future phase.                                                                                                                                                                                           |

**Risk note:** this is the one part of phase 3 that's a genuine build, not a wire-up — worth prototyping in isolation before the rest of the phase's screens are built around it.

### Chat

- Message list styled like ChatGPT/Claude's mobile apps: user bubbles right-aligned, assistant left-aligned, streaming text as `chat:token` events arrive.
- Citations render as tappable chips under an assistant message (from `citedNoteIds` → note titles), opening the cited note in the Editor.
- Shows a subtle indicator when `truncated: true` comes back on `chat:message_completed` (hit the token cap, not a natural stop).
- "+ New chat" creates via `POST /workspaces/:id/chats` and opens it with an empty message list.
- Joins `chat:{chatId}` on mount, leaves on unmount, per the realtime spec.

### Settings

Kept minimal per the brief:

- Theme switcher (light/dark/system) — `ThemeContext` already supports all three.
- Account email (read-only).
- AI usage: chat and indexing spend vs. limit from `GET /me/ai-usage`, shown as simple bars. Cheap to add, and the backend already computes it.
- Sign out.

Workspace creation and member invite are **not** in Settings (keeps it minimal, as asked) — they live in the workspace switcher instead, below.

---

## Sidebar

The one component with real interaction design to nail down. State: a persisted `mode` of `"notes" | "ai"`, which survives across sidebar opens.

**Top: two buttons, "Notes" and "AI"** (icons from `@expo/vector-icons`, no new dependency needed).

- Tapping a button sets `mode`, closes the sidebar, and navigates:
    - **Notes** → the most recently updated note in the active workspace (or an empty/create-first-note state if there are none).
    - **AI** → the most recently active chat (or the chat list/new-chat state if there are none).
- If the tapped button matches the mode you're already in, it just closes the sidebar — it doesn't re-navigate and blow away whatever you're looking at.
- Net effect: these are quick-switch shortcuts, not a live toggle you sit and flip while the sidebar stays open — confirmed this reading with you over the toggle-behavior question.

**Middle: reflects the current `mode` (this is what makes reopening the sidebar useful):**

- _Notes mode_ — the workspace's file tree (folders collapsible, notes as leaves).
    - Tap a note → closes sidebar, opens it in the Editor.
    - Tap a folder → expands/collapses in place, no navigation.
    - Long-press a note or folder → action sheet: **Rename**, **Delete** (soft-delete via the existing endpoint), **Move to...** (opens a folder picker, then `PATCH` with the new `parentFolderId`). Folders additionally get **New note here** / **New folder here**.
    - A persistent affordance at the top of the tree for creating a note/folder at the workspace root.
- _AI mode_ — flat list of the user's chats in this workspace, newest first (`GET /workspaces/:id/chats` is already sorted this way).
    - Tap a chat → closes sidebar, opens it in the Chat screen.
    - Long-press or swipe → Delete (`DELETE /chats/:id`).
    - "+ New chat" at the top.

**Bottom bar:**

- Workspace name, tap → an upward action-sheet-style popup listing the user's workspaces (`GET /workspaces`). Picking one switches the active workspace: refetches the tree/chat list, leaves the old workspace's socket room, joins the new one. The same popup has **"+ Create workspace"** at the bottom (`POST /workspaces`).
- A small gear icon next to it, tapping navigates straight to Settings and closes the sidebar — it doesn't open the workspace popup.

Where invite lives: originally a small "Invite" action in the workspace popup. Moved onto the workspace screen when workspace administration was built — see above. The popup's per-row button opens that screen; the popup itself now only switches workspaces and creates new ones.

---

## Responsiveness, as its own phase

Deferred out of phases 4–6 and picked up after Settings. This is a consolidation phase: nothing new appears on screen, the existing screens just stop assuming a portrait phone.

### Where it stands today

Three things already work app-wide and are not in question:

- **Safe-area insets.** `SafeAreaProvider` at the root, `SafeAreaView`/`useSafeAreaInsets` in every screen that touches an edge.
- **Flex layout.** No fixed container widths anywhere, so screens fill whatever width they are given.
- **Keyboard avoidance**, by three different mechanisms suited to their screens — `KeyboardAvoidingView` on the auth/workspace forms, `KeyboardStickyView` in the editor, a manual `keyboardDidShow` listener in chat.

The gap is orientation and width, and it is split cleanly down the middle of the build order:

- The **auth and workspace forms** (`Signin`, `Signup`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`, `CreateWorkspace`, `InviteMember`) each compute `isLandscape = width > height` from `useWindowDimensions()` and hand it to `createAuthStyles`, which tightens vertical padding, shrinks the logo and title, and widens the card's `maxWidth` from 400 to 500.
- The **screens built in phases 4–6** — editor, chat, settings, sidebar — have no `useWindowDimensions` at all. In landscape they stretch to the full window, so line length grows without limit.

`orientation` is `"default"` in `app.json`, so every screen can rotate. Nothing sets `drawerStyle.width`, which turns out to be correct — see the dropped item below.

### Scope

**In:**

- A shared breakpoint hook, replacing the `isLandscape = width > height` line currently written out in seven screens.
- A content `maxWidth` on the editor, chat and settings bodies, so text stops running the full width of a landscape window.
- Landscape padding/spacing passes on the phase 4–6 screens, matching what `createAuthStyles` already does for auth.
- ~~A drawer width cap~~ — **dropped during implementation.** `react-native-drawer-layout`'s default is `min(window.width - 56, 360)`, so it already caps itself at 360dp; a landscape window widens the content, not the sidebar. Capping it again only made the portrait drawer narrower than it is today.
- **Font scaling absorbed rather than clamped** — see below.

**Out:**

- Tablet-specific layouts: no permanent (non-overlay) sidebar, no two-pane notes/editor split. A tablet gets the landscape phone layout with wider gutters. Revisit only if tablets become a real target.
- `supportsTablet`, breakpoint-driven navigation changes, or anything that alters drawer _behaviour_ rather than its dimensions.

### Font scaling

Every font size in the app is a hardcoded number and nothing sets `allowFontScaling` or reads `fontScale`, so a large system font setting will overflow the tighter rows. The likeliest to break first are the drawer's workspace bar, the chat composer, and the drawer list rows.

The decision is to **let text scale and fix the layouts that break** — wrapping, flexible heights, no fixed row heights on anything containing text — rather than capping with `maxFontSizeMultiplier`. Clamping is less work but partially overrides an accessibility setting the user deliberately chose, which is the wrong trade for a note-taking app people read in.

### Acceptance

- Every screen rotates to landscape and back without clipped, overlapping or full-width-stretched text.
- `isLandscape` appears in exactly one place.
- At the largest system font size, no row clips its text on any screen.
- Portrait phone rendering is unchanged — this phase should be invisible in the orientation people actually use.

---

## Cross-cutting technical notes

Two different pieces of mobile code need the user's Better Auth session outside of `authClient` itself, and both hit the same underlying gap:

1. **The axios instance.** Per this repo's convention we use `axios` for REST calls, not `fetch` — but today only `authClient`'s own fetch (used solely for `/api/auth/*`) carries the session. The rest of the API (workspaces, folders, notes, chats) needs the same session attached to every axios request.
2. **The socket.io handshake.** The backend reads the session from `socket.handshake.headers.cookie`. A plain `socket.io-client` connection doesn't automatically carry what `@better-auth/expo` stores in `SecureStore`.

Both are solved the same way: `@better-auth/expo`'s client exposes a way to read the current session cookie for handing to something other than its own fetcher (used for things like WebViews) — need to confirm the exact method name against the installed package (not from memory, per this repo's own rule about bleeding-edge libraries) before wiring up axios interceptors and the socket's `extraHeaders`/`auth` option.

For the socket client itself: plain `socket.io-client`, with `transports: ["websocket"]` set explicitly to skip the polling handshake, which is unreliable over React Native's XHR shim.

---

## Visual conventions

- Icons: `@expo/vector-icons` (ships with Expo, no new dependency) — pick one family (likely Feather or Ionicons) and stick to it for a consistent minimal look.
- No more hardcoded hex colors in components. Add a `danger`/`error` token to the `Theme` type and both palettes in `@cognis/constants`, replacing the inline `#EF4444` currently in the auth screens.

## Dependency changes

- **Drop** `@10play/tentap-editor` — no longer used.
- **Add** `react-native-keyboard-controller` — cross-platform keyboard tracking and the above-keyboard toolbar for the editor.
- **Add** whatever CodeMirror 6 packages the custom editor bundle needs (`@codemirror/lang-markdown`, `@codemirror/state`, `@codemirror/view`, plus the vendored live-preview extension) — these live inside the bundled web app, not the RN bundle itself, the same way TenTap's own web bundle worked.
- `react-native-webview` is already a dependency and is reused rather than added.

---

## Open items to resolve during implementation

- Confirm the `@better-auth/expo` API for sharing the session with axios/socket (see above).
- Confirm verification/reset emails actually deep-link back into the app via `cognis://` on a real device/simulator — the plugin is built for this, but untested here.
- Read the exact Expo 57 docs before touching anything native-module-adjacent (drawer, gesture handler, pager, keyboard controller, webview), per `apps/mobile/AGENTS.md` — the version has moved past what's in general training data.
- Prototype the editor (WebView bridge + live preview + toolbar + read-only toggle) as its own spike before building the rest of phase 3's screens around it — it's the one piece here without a well-trodden path in this codebase already.
