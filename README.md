# Feishu Token Service

一个面向 OpenClaw 的轻量 Feishu 用户令牌服务。

## 作用

这个服务只做一件事：把 Feishu 用户授权、用户 token 存储、刷新和状态查询从 OpenClaw 本体里拆出来，作为一个独立的服务部署在阿里云。

V1 目标：

- 按用户保存 Feishu user token
- 生成浏览器授权链接
- 处理 OAuth 回调
- 自动刷新即将过期的 token
- 为 OpenClaw 提供最小内部 API
- 提供一个简单管理后台

## 接口

- `GET /health`
- `GET /auth/feishu/status?user_open_id=...`
- `POST /auth/feishu/link`
- `GET /auth/feishu/callback`
- `GET /tokens/feishu/resolve?user_open_id=...`
- `GET /tokens/feishu/:user_open_id`
- `POST /tokens/feishu/refresh/:user_open_id`
- `POST /tokens/feishu/invalidate/:user_open_id`
- `GET /admin`

其中：

- `/tokens/*`
- `/auth/feishu/status`
- `/auth/feishu/link`

都需要通过 `X-API-Key` 访问。

## 本地启动

1. 复制环境变量文件：

```bash
cp .env.example .env
```

2. 启动依赖：

```bash
docker compose up -d postgres redis
```

3. 安装依赖：

```bash
npm install
```

4. 生成 Prisma Client 并初始化数据库：

```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. 启动服务：

```bash
npm run start:dev
```

## OpenClaw 对接方式

建议的 OpenClaw 调用顺序：

1. 判断当前任务是否需要 Feishu user-scope
2. 调用 `GET /auth/feishu/status`
3. 如果当前用户没有有效 token，则调用 `POST /auth/feishu/link`
4. 把授权链接回发到当前 Feishu 会话
5. 用户完成授权后，再调用 `GET /tokens/feishu/resolve`
6. 用返回的可用 token 去访问 Feishu user-scope 数据

## 管理后台

默认地址：

```bash
http://localhost:3080/admin
```

登录账号来自环境变量：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## Docker

整体启动：

```bash
docker compose up --build
```

## 说明

- V1 只支持 Feishu
- token 以加密形式存储
- 服务默认部署在阿里云，由 OpenClaw 通过受限内部 API 调用
- 当前不做通用 TokenOps，不做跨平台 token 中台
