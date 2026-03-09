# 阿里云部署说明

本文档对应当前这套部署结构：

- `token.himark.me`
  - 授权、回调、Gateway、健康检查
- `admin.himark.me`
  - 统一后台壳站
  - 当前首个子应用：`/auth-center`

## 一、部署目标

阿里云上最终运行这些容器：

- `api`
  - NestJS 后端
- `admin-web`
  - 统一后台前端
- `postgres`
  - 数据库
- `redis`
  - 缓存与辅助状态
- `caddy`
  - HTTPS、域名入口与路由分流

## 二、部署目录

建议目录：

```text
/root/services/feishu-token-service
```

## 三、部署前准备

### 1. 域名解析

请确保：

- `token.himark.me` -> 阿里云公网 IP
- `admin.himark.me` -> 阿里云公网 IP

### 2. 环境变量

从 `.env.aliyun.example` 复制一份：

```bash
cp .env.aliyun.example .env
```

至少补齐这些值：

- `DATABASE_URL`
- `TOKEN_ENCRYPTION_KEY`
- `INTERNAL_API_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_TTL_HOURS`
- `ADMIN_SHELL_URL`
- `ADMIN_WEB_ORIGINS`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_REDIRECT_URI`

推荐值：

- `ADMIN_SHELL_URL=https://admin.himark.me/auth-center`
- `ADMIN_WEB_ORIGINS=https://admin.himark.me`
- `FEISHU_REDIRECT_URI=https://token.himark.me/auth/feishu/callback`

## 四、首次部署

### 1. 上传代码

把以下内容同步到服务器：

- `apps/`
- `packages/`
- `prisma/`
- `src/`
- `views/`
- `Dockerfile`
- `apps/admin-web.Dockerfile`
- `docker-compose.yml`
- `Caddyfile`
- `package.json`
- `package-lock.json`
- `nest-cli.json`
- `tsconfig.json`
- `.env`

### 2. 启动服务

```bash
docker compose up -d --build
```

### 3. 初始化数据库结构

如果容器内尚未自动完成，请执行：

```bash
docker compose exec api npx prisma db push
```

## 五、验证方式

### 1. 后端健康检查

```bash
curl -fsS http://127.0.0.1:3080/health
```

期望返回：

```json
{"status":"ok"}
```

### 2. 公网健康检查

- [https://token.himark.me/health](https://token.himark.me/health)

### 3. 统一后台入口

- [https://admin.himark.me](https://admin.himark.me)

期望行为：

- 未登录自动进入 `/login`
- 登录后进入后台首页
- 可跳转到 `/auth-center`

### 4. 旧入口兼容

访问：

- [https://token.himark.me/admin](https://token.himark.me/admin)

期望行为：

- 跳转到 `https://admin.himark.me/auth-center`

## 六、Caddy 路由说明

当前路由规则：

- `token.himark.me`
  - `/admin` 和 `/admin/*` -> 301/308 跳转到 `admin.himark.me/auth-center`
  - 其余请求 -> `api:3080`

- `admin.himark.me`
  - `/admin-api/*` -> `api:3080`
  - 其余请求 -> `admin-web:80`

这样可以保证：

- 后端 API 继续独立
- 前端后台壳站独立
- 统一后台通过单独域名承载

## 七、前端与后端更新流程

### 更新后端或 Prisma

```bash
docker compose up -d --build api
docker compose exec api npx prisma db push
```

### 更新后台前端

```bash
docker compose up -d --build admin-web caddy
```

### 全量更新

```bash
docker compose up -d --build
```

## 八、当前架构边界

已经实现：

- `admin.himark.me` 统一后台壳站
- 授权中心子应用
- 超管登录与 Session
- 桌面端与 H5 后台

当前不做：

- 微前端框架
- 普通用户后台
- 复杂角色权限
- 邮箱重置密码

## 九、建议检查项

每次部署后至少检查：

1. `token.himark.me/health` 是否正常
2. `admin.himark.me/login` 是否可打开
3. 登录后是否能看到首页数据
4. `/admin-api/session/me` 是否返回当前超管
5. `/auth/feishu/callback` 是否仍可用
6. OpenClaw 与授权中心的 allowlist / token 状态查询是否不受影响
