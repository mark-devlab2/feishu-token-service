# 轻量 Feishu Token 服务设计

## 目标

构建一个独立部署在阿里云上的轻量服务，为 OpenClaw 提供 Feishu 用户授权、token 存储、刷新和状态查询能力，而不是继续把这部分逻辑塞回 OpenClaw 插件。

## 范围

V1 仅支持 Feishu，只覆盖这些职责：

- 生成浏览器授权链接
- 接收 OAuth 回调
- 按用户保存和刷新 token
- 向 OpenClaw 提供最小内部 API
- 提供一个简单的后台页面

V1 明确不做：

- 通用多平台 TokenOps
- 业务数据分析
- 聊天内容存储
- 提供给多个外部服务共享的统一 token 平台

## 架构

- NestJS 单体服务
- Prisma + PostgreSQL 持久化
- Redis 做刷新锁
- 服务端渲染后台页面

逻辑模块：

- `auth`：授权状态、授权链接、回调
- `token`：resolve、详情、刷新、失效、定时刷新
- `provider`：Feishu OAuth 实现与 provider 抽象
- `alert`：Webhook 告警
- `admin`：HTML 后台
- `common`：Prisma、加密、Redis、API key 鉴权

## 数据模型

最小模型：

- `User`
- `Provider`
- `UserToken`
- `TokenEvent`
- `AuthSession`
- `Alert`

用户 token 加密存储。OpenClaw 只消费状态和可解析 token，不负责 token 生命周期。

## OpenClaw 集成方式

OpenClaw 侧应这样接：

1. 判断任务是否需要 Feishu user-scope
2. 调用 `GET /auth/feishu/status?user_open_id=...`
3. 如果没有有效 token，调用 `POST /auth/feishu/link`
4. 在聊天里把授权链接发给用户
5. 用户完成授权后，再调用 `GET /tokens/feishu/resolve`
6. 用返回的 token 去访问真正的 Feishu user-scope 数据

## 安全要求

- token 字段使用 AES-GCM 加密
- OAuth state 落在 `AuthSession`
- 内部接口走 API key
- 后台走 basic auth
- Webhook 告警不输出明文 token

## 验收

以下条件满足即可认为 V1 可用：

- Prisma Client 可以成功生成
- Nest 项目可以成功构建
- Docker 镜像可在正常环境里构建
- OpenClaw 能使用授权链接和状态接口，而不持有用户 token
