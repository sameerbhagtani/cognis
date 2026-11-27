# syntax=docker/dockerfile:1

# One Dockerfile, several targets, all sharing one build stage:
#   api      - the API image; also runs the embedding worker and the trash purge
#   migrate  - one-shot: applies Drizzle migrations, then exits
#   web      - Caddy, serving the landing page and proxying the API, with HTTPS
#
# Built from deploy/compose.yaml. Node 24 rather than newer because Corepack,
# which installs the pinned pnpm, stopped shipping with Node from 25 onwards.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0
RUN corepack enable
WORKDIR /repo

# ---------------------------------------------------------------------------

FROM base AS build

COPY . .

# Only what the server side needs: the API, the landing page, and the root
# (which holds turbo). The mobile app's dependencies never get installed.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile \
        --filter=cognis \
        --filter="@cognis/api..." \
        --filter="@cognis/landing..."

RUN pnpm turbo run build --filter=@cognis/api --filter=@cognis/landing

# The build above type-checks; this bundles the API and its jobs into a handful
# of self-contained files, so the runtime image needs no node_modules.
RUN pnpm --filter=@cognis/api bundle

# A self-contained copy of the database package, keeping dev dependencies:
# that's where drizzle-kit lives, and migrations are all this copy is for.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter=@cognis/database deploy /out/database

# ---------------------------------------------------------------------------

FROM node:24-bookworm-slim AS migrate
WORKDIR /app
COPY --from=build --chown=node:node /out/database ./
USER node
CMD ["node_modules/.bin/drizzle-kit", "migrate"]

# ---------------------------------------------------------------------------

FROM node:24-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/api/bundle ./bundle
USER node
EXPOSE 5000
CMD ["node", "bundle/index.mjs"]

# ---------------------------------------------------------------------------

FROM caddy:2.10-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/landing/dist /srv/landing
