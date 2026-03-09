# Lightweight Feishu Token Service Design

## Goal

Build a lightweight standalone service on Aliyun that manages Feishu user tokens for OpenClaw without turning into a full OAuth platform.

## Scope

V1 supports only Feishu and only these responsibilities:

- create browser authorization links
- receive OAuth callback
- store and refresh per-user tokens
- expose internal status/token endpoints for OpenClaw
- provide a minimal admin UI

V1 explicitly does not do:

- multi-provider TokenOps
- business data analysis
- chat data storage
- token sharing across services beyond OpenClaw

## Architecture

- NestJS monolith
- Prisma + PostgreSQL for durable state
- Redis for refresh locking
- server-rendered admin pages

Logical modules:

- `auth`: status, auth-link creation, callback
- `token`: resolve, detail, refresh, invalidate, scheduled refresh
- `provider`: Feishu OAuth implementation behind a provider interface
- `alert`: webhook-backed alert emission
- `admin`: HTML dashboards for token state and recent events
- `common`: Prisma, crypto, Redis, API-key guard

## Data Model

Minimal models:

- `User`
- `Provider`
- `UserToken`
- `TokenEvent`
- `AuthSession`
- `Alert`

Tokens are stored encrypted. OpenClaw consumes status and resolved access tokens through internal API calls; it does not own token lifecycle.

## OpenClaw Integration

OpenClaw should:

1. decide whether a task requires user-scope Feishu access
2. call `GET /auth/feishu/status?user_open_id=...`
3. if unavailable, call `POST /auth/feishu/link` and send the returned link in chat
4. retry task after user authorization
5. use token-service status to drive reauthorization prompts

## Security

- AES-GCM encryption for token fields
- OAuth state stored in `AuthSession`
- API key guard for internal endpoints
- basic-auth for admin UI
- webhook alerts only carry status information, never raw tokens

## Verification

The implementation is considered ready when:

- Prisma client generates successfully
- Nest build succeeds
- Docker image can be built in a normal environment
- OpenClaw can use the auth-link and status APIs without owning user tokens
