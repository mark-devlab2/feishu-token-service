# Feishu Token Service

Lightweight Feishu user token service for OpenClaw.

## What it does

- stores one Feishu user token per user
- generates browser-based authorization links
- handles OAuth callback
- refreshes expiring tokens
- exposes a small internal API for OpenClaw
- provides a simple admin UI

## Endpoints

- `GET /auth/feishu/status?user_open_id=...`
- `POST /auth/feishu/link`
- `GET /auth/feishu/callback`
- `GET /tokens/feishu/resolve?user_open_id=...`
- `GET /tokens/feishu/:user_open_id`
- `POST /tokens/feishu/refresh/:user_open_id`
- `POST /tokens/feishu/invalidate/:user_open_id`
- `GET /admin`

All `/tokens/*` and `/auth/feishu/status|link` endpoints require `X-API-Key`.

## Local setup

1. Copy `.env.example` to `.env`
2. Start dependencies:

```bash
docker compose up -d postgres redis
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. Start the app:

```bash
npm run start:dev
```

## OpenClaw integration

Suggested OpenClaw flow:

1. determine whether a task requires Feishu user-scope
2. call `GET /auth/feishu/status`
3. if no valid token, call `POST /auth/feishu/link`
4. send the auth URL back to the user in Feishu
5. after callback success, call `GET /tokens/feishu/resolve`
6. use the returned token for user-scope Feishu API calls

## Admin UI

Open:

```bash
http://localhost:3080/admin
```

Credentials come from:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## Docker

To run everything:

```bash
docker compose up --build
```

## Notes

- V1 only supports Feishu
- tokens are encrypted at rest
- the service is intended to be deployed on the Aliyun host and consumed by OpenClaw over a restricted internal API
