# 个人助手授权中心与平台数据 Gateway

一个面向 OpenClaw 的轻量服务，负责：

- 用户目录与对话准入
- 平台账号映射
- `personal` / `app` 授权管理
- Feishu 个人数据 Gateway

当前阶段只实际实现 `Feishu personal` 的第一批只读能力，不实现组架同步，不做统一用户体系。

## 当前定位

这不是通用 OAuth 中台，也不是业务平台。

当前服务只做 4 件事：

1. 维护“谁可以和 OpenClaw 对话”
2. 维护“谁可以启用某个平台 personal 授权”
3. 管理平台授权状态与 token 生命周期
4. 作为 OpenClaw 的外部数据 gateway，读取平台个人数据

## 核心模型

- `users`
  - 本系统轻量用户目录
- `platform_accounts`
  - 平台入口身份映射，用于识别聊天发送者属于哪个系统用户
- `platform_authorizations`
  - 授权中心
  - `personal`：按用户隔离
  - `app`：全局共享
- `auth_sessions`
- `auth_events`
- `alerts`

其他人的平台信息只作为资源元数据出现在 gateway 返回结果里，不会进入系统级用户模型。

## OpenClaw 对接方式

OpenClaw 的推荐调用顺序：

1. 先根据当前平台消息拿到发送者身份
2. 查授权中心，确认发送者是否是“已添加且已启用用户”
3. 若不是，直接拒绝对话
4. 若任务需要平台个人数据：
   - 查该用户对应平台的 `personal` 授权状态
   - 无授权则生成浏览器授权链接
   - 有授权则调用对应 gateway 接口
5. OpenClaw 再对返回内容做分析和输出

## 当前接口

### 准入与授权

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

### 管理后台

- `GET /admin`
- `GET /admin/users/:id`
- `POST /admin/users`
- `POST /admin/users/:id/enable`
- `POST /admin/users/:id/disable`
- `POST /admin/users/:id/platform-accounts`
- `POST /admin/platform-accounts/:id/enable`
- `POST /admin/platform-accounts/:id/disable`
- `POST /admin/users/:id/personal-authorizations/feishu/enable`
- `POST /admin/users/:id/personal-authorizations/feishu/disable`
- `POST /admin/app-authorizations/feishu/enable`
- `POST /admin/app-authorizations/feishu/disable`

## 安全边界

- OpenClaw 默认不拿原始 token，只调 gateway
- 所有 personal 数据访问都必须先通过：
  - 对话准入
  - personal 授权开关
  - token 可用状态检查
- 管理后台使用密码登录
- token 加密存储
- 日志默认不输出明文 token

## 环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

关键变量：

- `INTERNAL_API_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `DEFAULT_SUPER_ADMIN_USERNAME`
- `DEFAULT_SUPER_ADMIN_DISPLAY_NAME`
- `BOOTSTRAP_FEISHU_OWNER_OPEN_ID`
- `BOOTSTRAP_FEISHU_OWNER_DISPLAY_NAME`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_REDIRECT_URI`

## 本地启动

1. 启动依赖：

```bash
docker compose up -d postgres redis
```

2. 安装依赖：

```bash
npm install
```

3. 生成 Prisma Client：

```bash
npx prisma generate
```

4. 同步数据库结构：

```bash
npx prisma db push
```

5. 启动服务：

```bash
npm run start:dev
```

## Docker

整体启动：

```bash
docker compose up --build
```

## 当前阶段能力边界

已实现：

- 用户目录
- Feishu 平台账号映射
- `personal` / `app` 授权中心
- 管理后台
- Feishu docs/wiki/minutes/messages 基础只读 gateway
- OpenClaw Feishu allowlist 导出

未实现：

- 复杂消息搜索
- `calendar`
- `drive`
- 写操作
- 微信 / 钉钉真实接入
- 组架同步
- 普通用户后台自助
