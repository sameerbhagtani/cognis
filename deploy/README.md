# Deploying

The whole production stack runs from `deploy/compose.yaml` on one server with Docker installed. Nothing else needs installing on the host.

| Service    | What it is                                                         |
| ---------- | ------------------------------------------------------------------ |
| `web`      | Caddy. Serves `cognis.in`, proxies `api.cognis.in`, handles HTTPS  |
| `api`      | The Express + Socket.IO server                                     |
| `worker`   | The note indexing loop                                             |
| `purge`    | Empties expired trash daily at 03:00 UTC                           |
| `migrate`  | Applies database migrations on every start, then exits             |
| `postgres` | PostgreSQL 17 with pgvector. Not reachable from outside the server |

## First deploy

1. Point DNS at the server: `A` records for `cognis.in`, `www.cognis.in` and `api.cognis.in`.
2. Open ports 80 and 443 (TCP), and 443 UDP for HTTP/3.
3. Create the env file:

    ```bash
    cd deploy
    cp .env.example .env
    ```

    Fill it in. Generate the two secrets with `openssl rand -hex 24` (database password) and `openssl rand -base64 32` (auth secret).

4. Start everything:

    ```bash
    docker compose up -d --build
    ```

Caddy requests certificates on first start, which only works once DNS resolves to this server.

## Updating

```bash
git pull
cd deploy
docker compose up -d --build
```

Migrations run automatically before the API restarts.

## Day to day

```bash
docker compose ps                    # what's running
docker compose logs -f api           # follow a service's logs
docker compose exec api node bundle/jobs/purgeTrash.mjs   # purge now
```

## Backups

The database lives in the `cognis-prod_postgres_data` volume, which only exists on this server. Dump it somewhere else regularly:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > cognis-$(date +%F).dump
```

Don't delete the `cognis-prod_caddy_data` volume either: it holds the HTTPS certificates, and Let's Encrypt rate-limits re-issuing them.
