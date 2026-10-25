# Gradual Community — realtime chat

[English](README.md) | [简体中文](README.zh-CN.md)

A realtime chat application built with React + TypeScript on the front end, Node.js + TypeScript,
Apollo GraphQL and MongoDB on the back end, and Socket.IO for realtime delivery.

Supports channel conversations, unread message counts, quote replies and @mentions, with frontend and backend tests.

---

## Table of contents

- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [What is implemented](#what-is-implemented)
- [Architecture](#architecture)
- [Data model](#data-model)
- [GraphQL API](#graphql-api)
- [Realtime protocol](#realtime-protocol)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Configuration](#configuration)
- [Design notes](#design-notes)
- [Trade-offs and what is next](#trade-offs-and-what-is-next)

---

## Quick start

Two startup paths are provided. No `.env` file is needed for the default demo; initial dependency and MongoDB
binary downloads require network access.

### Option A — npm (fastest)

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The demo workspace is seeded automatically; if no MongoDB is running locally the
server boots a temporary MongoDB process and prints a warning (data is then lost on restart).

### Option B — Docker (persistent demo)

Requires Docker with the compose plugin.

```bash
docker compose up --build
```

Open <http://localhost:4000>. MongoDB 7 runs in its own container with a persistent volume; the Node image serves
both the API and the built front end on a single port.

### Running against a real MongoDB

Copy `.env.example` to `.env` at the repository root and set your existing MongoDB connection string:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/gradual_chat
```

Then run `npm run dev`. Docker Compose uses `mongodb://mongo:27017/gradual_chat` inside its network and does
not publish MongoDB on the host.

### Resetting demo data

- Temporary MongoDB: stop and restart the app; it creates fresh demo data automatically.
- Existing persistent MongoDB: use `npm run seed -- --force` with the same `MONGODB_URI` as the app.
- Docker Compose: use `docker compose exec app node apps/server/dist/seed/cli.js --force`.

The force command deletes and recreates the demo collections. Confirm the database first, then sign in again
after resetting (the user IDs change). The standalone seed command rejects temporary databases because they
cannot reset the database owned by another app process.

---

## Demo accounts

Every seeded account uses the password **`password123`**. The sign-in screen lists them, so you can click one
to prefill the form before pressing **Sign in**. The page lists three example accounts; the seed contains twelve users.

| Person      | Email               | Best for                                                 |
| ----------- | ------------------- | -------------------------------------------------------- |
| Jenny White | `jenny@gradual.com` | Default account                                          |
| Devon Lane  | `devon@gradual.com` | Second window — send each other messages to see realtime |
| Jerry White | `jerry@gradual.com` | Author of the unread announcements                       |

> Tip: open two browser windows, sign in as Jenny in one and Devon in the other. Both are members of
> _Share your story_ and _Announcements_, so unread message badges and quote replies are visible
> immediately.

---

## What is implemented

| Feature or technology        | Implementation                                                     | Code                                     |
| ---------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| Chat interface               | ✅ Conversations, quote replies and @mention picker                | `apps/web/src/components`                |
| Realtime chat with socket.io | ✅ Per-channel rooms and per-user unread updates                   | `apps/server/src/realtime`               |
| MongoDB                      | ✅ Mongoose models, compound indexes, denormalised unread counters | `apps/server/src/models`                 |
| Node.js (TypeScript)         | ✅ Node 22, strict TypeScript, Express + Apollo                    | `apps/server`                            |
| GraphQL                      | ✅ Schema-first API for every read and write                       | `apps/server/src/graphql/schema.graphql` |
| React.js (TypeScript)        | ✅ React 18 + Vite + Apollo Client + Tailwind                      | `apps/web`                               |
| Unread message counts        | ✅ Per-channel message badges and read cursors                     | `apps/server/src/services/readState.ts`  |
| Quote replies                | ✅ Self-referencing `replyToId`, same-channel validation, quote UI | `apps/server/src/services/messages.ts`   |
| @mentions                    | ✅ Parsing, autocomplete and highlighting                          | `apps/server/src/services/mentions.ts`   |
| Frontend and backend tests   | ✅ 98 tests (42 backend, 56 frontend)                              | `apps/*/test`                            |

Additional features include message pagination,
a conversation-list filter, a `/healthz` endpoint, and a Docker image that serves the API
and the SPA from one origin (so there is no CORS setup at all).

---

## Architecture

```mermaid
sequenceDiagram
  participant A as Sender: React + Apollo Client
  participant API as Backend: Apollo Server / services
  participant DB as MongoDB
  participant RT as Socket.IO gateway
  participant B as Recipient: React + Apollo Client
  Note over A,B: After login, clients connect to Socket.IO and join rooms based on channel membership
  A->>API: 1. GraphQL / HTTP: sendMessage mutation
  API->>API: Validate message content and quote target
  API->>DB: 2. Save message and update unread counts via Mongoose
  DB-->>API: Write succeeded
  API->>RT: 3. Invoke event broadcast
  RT-->>A: 4. Push message:new to channel room (includes sender)
  RT-->>B: 4. Push message:new to channel room
  RT-->>A: Push channel:unread to sender's personal room
  RT-->>B: Push channel:unread to personal room
  API-->>A: 5. GraphQL / HTTP: return saved message
  Note over A,B: Update Apollo cache and render; sender deduplicates by message ID
  opt Recipient has this channel selected
    B->>API: GraphQL / HTTP: markChannelRead
    API->>DB: Set this user's unreadCount to zero
    API-->>B: Return channel with unreadCount = 0
  end
```

HTTP responses and socket events travel separately; their arrival order in the browser is not guaranteed.
Frontend and backend flow diagrams are included in [Architecture details](docs/architecture.md).

**Why GraphQL for writes and socket.io for pushes?** GraphQL handles queries and mutations, while
socket.io provides channel rooms for realtime delivery without a separate GraphQL subscription transport.
Chat messages are a broadcast problem: one write, N recipients. Rooms in socket.io model that directly, and the
mutation response already gives the author an authoritative copy of the message. The result is one HTTP API, one
WebSocket channel, and no duplicated data flow.

**Same origin everywhere.** In development Vite proxies `/graphql` and `/socket.io` to the API. In production the
Express server serves `apps/web/dist` alongside the API. There is no cross-origin request in either mode, so
the API and socket connection use the same origin.

**Read path.** `channels` returns the badge counts with every channel, so the sidebar renders from a single query.
`messages` is cursor-paginated by `_id`, which is monotonic and covered by the compound index.

**Write path (sending a message).**

1. `sendMessage` mutation with the selected user ID → body validation → quote-target validation in the same channel.
2. `@handles` are parsed and resolved to user ids in one query.
3. The message is inserted; unread message counters are incremented once for every other member, whether or not
   the message mentions them.
4. The author's own read cursor moves to the new message.
5. The socket gateway emits `message:new` to the channel room and per-user `channel:unread` to each member's
   personal room so each client receives that user's own counts.
6. The client patches the Apollo cache instead of refetching, so the list, the sidebar preview and the badge all
   update without a network round trip.

---

## Data model

See the [collection structure and relationship diagram](docs/architecture.md#4-数据库集合与关系) for all four
MongoDB collections, field types, references and indexes.

```
User      { id, name, username, email, passwordHash, avatarColor, title }
Channel   { id, name, slug, type: 'channel'|'dm', memberIds[], order }
Message   { id, channelId, authorId, body, replyToId?, mentionIds[] }
ReadState { channelId, userId, lastReadAt, lastReadMessageId, unreadCount }
```

Indexes:

| Collection  | Index                                | Purpose                                                    |
| ----------- | ------------------------------------ | ---------------------------------------------------------- |
| `Message`   | `{ channelId: 1, _id: -1 }`          | Cursor pagination (`_id` ordering is stable and monotonic) |
| `Message`   | `{ channelId: 1, createdAt: -1 }`    | Time-based queries if ever needed                          |
| `ReadState` | `{ channelId: 1, userId: 1 }` unique | One cursor per member per channel                          |
| `ReadState` | `{ userId: 1 }`                      | Sidebar fetch for one user                                 |
| `Channel`   | `{ memberIds: 1 }`                   | "Channels I belong to"                                     |
| `User`      | `username`, `email` unique           | Login and `@handle` resolution                             |

**Unread counts are denormalised on purpose.** The alternative — counting messages newer than `lastReadAt` on
every sidebar render — costs one aggregation per channel. Instead `ReadState.unreadCount` is incremented inside the
send path and reset when the channel is opened.

**Quote replies are a self-reference.** `replyToId` points at another `Message`; the resolver returns a trimmed
preview (`id`, `body`, `author`, `createdAt`) so rendering a quoted message never loads the whole history.

---

## GraphQL API

The full schema lives in [`apps/server/src/graphql/schema.graphql`](apps/server/src/graphql/schema.graphql).
When the server is running, the Apollo landing page is available at <http://localhost:4000/graphql>.

```graphql
type Query {
  user(id: ID!): User
  users(query: String!): [User!]! # @mention typeahead
  channels(userId: ID!): [Channel!]! # includes unreadCount + lastMessage
  messages(channelId: ID!, cursor: String, limit: Int): MessagePage!
}

type Mutation {
  login(email: String!, password: String!): User!
  sendMessage(input: SendMessageInput!, userId: ID!): Message!
  markChannelRead(channelId: ID!, userId: ID!, lastMessageId: ID): Channel!
}
```

Login returns user information after checking the password (stored as a bcrypt hash):

```graphql
mutation {
  login(email: "jenny@gradual.com", password: "password123") {
    id
    name
    username
  }
}
```

Use the returned ID as `userId` in channel queries, message sends and read updates. Requests do not require an
Authorization header. Login only checks the password; the demo has no JWT, server session or channel permission
checks. User IDs select demo data and do not prove identity.

Errors use `extensions.code` (`BAD_USER_INPUT` or `NOT_FOUND`) for invalid input and missing data.

---

## Realtime protocol

| Direction       | Event            | Payload                      |
| --------------- | ---------------- | ---------------------------- |
| server → client | `message:new`    | `{ message }`                |
| server → client | `channel:unread` | `{ channelId, unreadCount }` |

The client supplies `query.userId` when connecting. The gateway uses this ID to join `user:<id>` and the user's
`channel:<id>` rooms for event routing. Connections do not perform authentication.

---

## Project structure

```
.
├─ apps/
│  ├─ server/                  Node 22 · TypeScript · Apollo · Mongoose · socket.io
│  │  ├─ src/
│  │  │  ├─ db/                Mongo connection with in-memory fallback
│  │  │  ├─ graphql/           schema.graphql, resolvers, DTO mappers
│  │  │  ├─ models/            User, Channel, Message, ReadState
│  │  │  ├─ realtime/          socket.io gateway + emitter interface
│  │  │  ├─ seed/              demo data (mirrors the design)
│  │  │  └─ services/          business logic (messages, channels, mentions, read state)
│  │  └─ test/                 Vitest + in-memory MongoDB
│  └─ web/                     React 18 · Vite · Apollo Client · Tailwind
│     ├─ src/
│     │  ├─ components/        UI building blocks
│     │  ├─ graphql/           operations (fragments, queries, mutations)
│     │  ├─ lib/               Apollo client, socket client, cache helpers, formatting
│     │  └─ pages/             ChatPage
│     └─ test/                 Vitest + Testing Library
├─ scripts/                    realtime smoke test and build helpers
├─ docs/                       architecture diagrams and video script
├─ Dockerfile                  multi-stage build (single runtime image)
└─ docker-compose.yml          mongo + app
```

---

## Testing

```bash
npm test                 # both workspaces
npm run test:coverage    # with coverage
```

Run `npm run test:coverage` to generate current coverage results after code changes. Reports are written to
`apps/server/coverage` and `apps/web/coverage`; static percentages are intentionally omitted to avoid stale numbers.

**Backend (42 tests).** Database-backed test files each boot their own temporary MongoDB, so nothing touches the app's database.

- `mentions.test.ts` — parser edge cases: emails must not become mentions, handles stop at punctuation, case
  insensitivity, de-duplication.
- `cursor.test.ts` — cursor round-trip, malformed cursor rejection, page-size clamping.
- `passwords.test.ts` — password hashing and correct/incorrect password verification.
- `messages.test.ts` — unread increments only for others, mention resolution, quote validation across channels,
  empty body rejection, unknown user handling, pagination walking backwards, sidebar badge aggregation.
- `readState.test.ts` — read-state backfill is idempotent, author cursor moves on send.
- `realtime.test.ts` — a real socket.io server and clients: connections need no credentials, messages reach
  the other channel member, and unread message badges are pushed to the recipient.
- `http.test.ts` — the Express surface end to end: health check, GraphQL over POST, unauthenticated requests,
  malformed JSON returning 400 rather than crashing.
- `resolvers.test.ts` — GraphQL layer through `executeOperation`: password login, user lookup, unread in the
  channel list, `markChannelRead`, mentions, reading and sending without request authentication.

**Frontend (56 tests)** with Testing Library:

- `MessageBody` — bold/italic/strike/code, mention highlighting, lists, and a regression test proving raw HTML is
  never injected.
- `MessageItem` / `ChatHeader` — quote previews, quote actions, channel name and member count.
- `ChannelList` / `SideRail` / `TopBar` — unread message badges, active state, search filtering, account menu.
- `Composer` — Enter sends, Shift+Enter keeps a newline, quote bar wiring, cancel reply, bold wrapping,
  IME input, failed-send retries and mention keyboard navigation.
- `LoginPage` — demo accounts prefill, account switching, user hand-off, error state.
- `cache` / `messagesCache` — socket payload normalisation and cursor pagination.
- `ErrorBoundary` — a render error degrades to a recoverable card instead of a white screen.
- `format` — helpers degrade gracefully on missing data.

**End-to-end (optional, local only).** `npm run verify:realtime` drives two headless browser sessions (Jenny and
Devon), sends a message and asserts delivery, the unread badge appearing while the recipient is elsewhere, and
the badge clearing when the channel is opened, the selected user surviving a refresh, and signing out and back
in as another account.

**CI.** Pushing to `main` or opening/updating a pull request runs GitHub Actions: dependency installation,
formatting, lint, type checking, tests, and build. A second job builds Docker Compose, checks `/healthz`, and
queries GraphQL. This validates the app; it does not deploy a live demo. Browser smoke tests remain a local command.

---

## Configuration

All values have working defaults — `.env` is optional (see `.env.example`).

| Variable        | Default                       | Notes                                                  |
| --------------- | ----------------------------- | ------------------------------------------------------ |
| `PORT`          | `4000`                        | API port (also serves the built SPA)                   |
| `MONGODB_URI`   | local MongoDB, else in-memory | When set, the server fails loudly if it cannot connect |
| `SEED_ON_START` | `true`                        | Seeds only when the users collection is empty          |
| `LOG_LEVEL`     | `info`                        | pino                                                   |
| `WEB_ORIGIN`    | `http://localhost:5173`       | socket.io CORS allow-list for a split-origin setup     |

Development tools also accept `API_PROXY_TARGET` (Vite API proxy target, default `http://localhost:4000`),
`BASE_URL` (browser-script target, default `http://localhost:5173`) and `CHROME_PATH` (Chrome/Edge executable).

---

## Design notes

- **Palette** sampled from the Figma exports: rail `#0C0E12`, panels `#26252C`, own bubble `#82D8BD`, accent
  `#7FD8BD`, badge `#E5484D`, muted text `#8E8C99`.
- **Typography** is Inter (variable font bundled in `apps/web/public/fonts`, OFL licensed), so the layout does not
  depend on a CDN.
  The font's copyright notice and license are included in [OFL.txt](apps/web/public/fonts/OFL.txt).
- **Avatars** are generated from initials and a per-user colour instead of shipping third-party photos; this keeps
  the repository free of licensed assets and works offline.
- **Deviations from the design, on purpose:** the composer has an explicit Send button and a keyboard hint; message
  streams show a day divider. A quote reply action is available on every message.
- **Markdown-lite** formatting (`**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, lists) is rendered to React
  elements — never `innerHTML` — so a message cannot inject markup.

---

## Trade-offs and what is next

- **Single replica only.** Socket rooms live in process memory. Horizontal scaling would need the
  `@socket.io/redis-adapter` and a shared presence store; that is deliberately out of scope here.
- **No attachments.** Upload and file storage are out of scope; no attachment action is offered in the composer.
- **Limited search.** The single search field above the conversation list filters channel names and latest-message
  previews already loaded in the browser. It does not search message history. The top-bar search and static timezone
  label were removed.
- **Design placeholders.** Forum, Matches, Members, Contributors, notification/help icons and the member-count
  button retain the design's appearance but do not open additional views. Chat is the implemented section.
- **Simplified scope.** Only unread message counts are maintained. @mentions have autocomplete and highlighting,
  with no separate unread mention badge. Typing-status events and indicators are not implemented.
- **Sent messages.** Messages can be sent and quoted; editing and deleting sent messages are not supported.
- **Demo login.** Only the selected user ID is stored in `localStorage`; passwords are checked at login and
  never stored in the browser. Subsequent requests do not use authentication or access control.
- **Unread reconciliation.** Counters are maintained incrementally; a background job recomputing them from
  `lastReadAt` would be the safety net in production.
