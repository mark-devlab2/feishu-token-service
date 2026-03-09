# 个人助手授权中心与平台数据 Gateway

这是 `himark.me` 体系下的授权中心与平台数据访问服务。

当前定位：

- 只服务个人助手场景
- 不做统一用户体系
- 不做组架同步
- 不做业务中台
- 当前实际跑通 `Feishu personal` 的第一批只读能力

当前项目同时承担两类职责：

1. `token.himark.me`
   - 平台授权与 token 生命周期管理
   - 平台数据 Gateway
2. `admin.himark.me`
   - 统一后台壳站
   - 当前第一个子应用是“授权中心”

## 当前架构

### 后端

NestJS 单体服务，负责：

- 用户目录与对话准入
- 平台账号映射
- `personal / app` 授权中心
- Feishu 数据 Gateway
- 后台 API
- 授权回调与事件记录

### 前端

前端已经升级为：

- `apps/admin-shell`
  - 统一后台壳站
  - 统一登录、导航、路由、H5 适配
- `apps/auth-center-app`
  - 授权中心子应用
- `packages/ui`
  - 共享设计系统与基础组件

第一阶段明确：

- 不引入微前端框架
- 采用“壳站 + 子应用 + 同仓多应用”模式
- 桌面端与 H5 移动端一并实现

## 目录结构

```text
feishu-token-service/
├─ apps/
│  ├─ admin-shell/         # 统一后台壳站（React + Arco）
│  ├─ auth-center-app/     # 授权中心子应用
│  └─ admin-web.Dockerfile # 后台前端构建与部署
├─ packages/
│  └─ ui/                  # 共享 UI 组件与设计 token
├─ prisma/
│  └─ schema.prisma
├─ src/
│  ├─ admin/               # 后台 API、登录与会话
│  ├─ auth/                # 平台授权
│  ├─ directory/           # 用户目录与平台账号映射
│  ├─ gateway/             # Feishu 数据 Gateway
│  ├─ provider/            # provider 实现
│  └─ ...
├─ docs/
│  ├─ deploy-aliyun.md
│  └─ plans/
├─ docker-compose.yml
├─ Caddyfile
└─ README.md
```

## 核心模型

当前核心模型固定为：

- `User`
  - 轻量用户目录
- `Provider`
  - 平台定义
- `PlatformAccount`
  - 平台入口身份映射，用于识别发送者属于哪个系统用户
- `PlatformAuthorization`
  - `personal / app` 授权中心
- `AuthSession`
- `AuthEvent`
- `Alert`
- `AdminAccount`
  - 后台超管账号
- `AdminSession`
  - 后台登录会话

明确不做：

- 统一用户主键体系
- 多平台身份归并
- 组织树/部门树/岗位业务表

## 当前接口

### 公共与授权接口

- `GET /health`
- `GET /auth/feishu/status?user_open_id=...`
- `POST /auth/feishu/link`
- `GET /auth/feishu/callback`
- `GET /tokens/feishu/resolve?user_open_id=...`
- `GET /tokens/feishu/:user_open_id`
- `POST /tokens/feishu/refresh/:user_open_id`
- `POST /tokens/feishu/invalidate/:user_open_id`

### Gateway

- `GET /gateway/feishu/docs/:document_id?user_open_id=...`
- `GET /gateway/feishu/wiki/nodes/:node_token?user_open_id=...`
- `GET /gateway/feishu/minutes/:minutes_token?user_open_id=...`
- `GET /gateway/feishu/messages?user_open_id=...&container_id_type=...&container_id=...`
- `GET /gateway/feishu/messages/:message_id?user_open_id=...`

### OpenClaw 同步

- `GET /integrations/openclaw/feishu/allowlist`

### 后台 API

- `POST /admin-api/session/login`
- `POST /admin-api/session/logout`
- `GET /admin-api/session/me`
- `GET /admin-api/dashboard`
- `GET /admin-api/users/:id`
- `POST /admin-api/users`
- `POST /admin-api/users/:id/enable`
- `POST /admin-api/users/:id/disable`
- `POST /admin-api/users/:id/platform-accounts`
- `POST /admin-api/platform-accounts/:id/enable`
- `POST /admin-api/platform-accounts/:id/disable`
- `POST /admin-api/personal-authorizations/:provider/:userId/enable`
- `POST /admin-api/personal-authorizations/:provider/:userId/disable`
- `GET /admin-api/app-authorizations`
- `POST /admin-api/app-authorizations/:provider/enable`
- `POST /admin-api/app-authorizations/:provider/disable`

## 域名与入口

### 服务域名

- `https://token.himark.me`
  - 授权、回调、Gateway、健康检查

### 统一后台

- `https://admin.himark.me`
  - 统一后台壳站

当前第一个子应用：

- `https://admin.himark.me/auth-center`

兼容入口：

- `https://token.himark.me/admin`
  - 仅做跳转或过渡入口

## 本地开发

### 1. 准备环境变量

```bash
cp .env.example .env
```

至少补齐：

- `DATABASE_URL`
- `TOKEN_ENCRYPTION_KEY`
- `INTERNAL_API_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_REDIRECT_URI`

### 2. 启动依赖

```bash
docker compose up -d postgres redis
```

### 3. 安装依赖

```bash
npm install
cd apps/admin-shell && npm install
cd ../..
```

### 4. 生成 Prisma Client

```bash
npx prisma generate
```

### 5. 推送数据库结构

```bash
npx prisma db push
```

### 6. 启动后端

```bash
npm run start:dev
```

### 7. 启动前端

```bash
cd apps/admin-shell
npm run dev
```

本地默认访问：

- 后端健康检查：`http://127.0.0.1:3080/health`
- 后台壳站：`http://127.0.0.1:5173`

## Docker 启动

整体启动：

```bash
docker compose up --build
```

服务包括：

- `api`
- `admin-web`
- `postgres`
- `redis`
- `caddy`

## 当前阶段能力边界

### 已实现

- 用户目录
- 平台账号映射
- `personal / app` 授权中心
- 后台 API
- 统一后台壳站与授权中心子应用
- H5 移动端可用的后台基础能力
- Feishu docs/wiki/minutes/messages 基础只读 Gateway
- OpenClaw Feishu allowlist 导出

### 未实现

- 复杂消息搜索
- `calendar`
- `drive`
- 平台写操作
- 微信 / 钉钉真实接入
- 组架同步
- 普通用户后台
- 更复杂角色系统
- 邮箱重置密码
- 微前端框架

## 当前后台策略

- 统一后台入口：`admin.himark.me`
- 统一超管登录
- 不做普通用户后台入口
- 桌面端与 H5 一起交付
- 不引入微前端框架，只采用可插拔子应用结构

## 相关文档

- [阿里云部署说明](./docs/deploy-aliyun.md)
- [授权中心与数据 Gateway 设计稿](./docs/plans/2026-03-10-assistant-auth-gateway-design.md)
