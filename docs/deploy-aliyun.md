# 阿里云部署说明

本文档描述 `feishu-token-service` 的标准生产部署形态，已经从“服务器源码仓 + 远端 build”切换为“GitHub Actions 构建 + 镜像仓 + 服务器 pull 镜像重启”。

当前现网主路径已经切到 `ACR-first`：GitHub Actions 构建镜像并推送到 `crpi-vbmaa8d6ek5k7rjt.cn-beijing.personal.cr.aliyuncs.com/himark/*`，阿里云服务器只从 `ACR` pull。`GHCR` 不再作为默认镜像输出；只有显式启用兼容发布时才会再次参与构建与分发。

## 一、职责边界

- 服务仓 `feishu-token-service`
  - 保留 Dockerfile、测试命令、`.deploy/build.yaml`
  - `push main` 触发发布
  - 默认按公开仓维护

- 平台仓 `aliyun-deploy-platform`
  - 承载 reusable workflows
  - 承载 `deploy/rollback/bootstrap` 脚本
  - 承载生产 compose 模板与服务注册表

- 阿里云服务器
  - 只保留平台仓和运行配置
  - 不再保留 `/root/services/feishu-token-service` 应用源码仓
  - 不再执行 `docker build`

## 二、标准发布流程

1. 向 `main` push 代码
2. GitHub Actions 读取 `.deploy/build.yaml`
3. 运行 `npm test`
4. 构建并推送镜像：
   - 生产主路径：`crpi-vbmaa8d6ek5k7rjt.cn-beijing.personal.cr.aliyuncs.com/himark/feishu-token-service-api:sha-<gitsha>`
   - 生产主路径：`crpi-vbmaa8d6ek5k7rjt.cn-beijing.personal.cr.aliyuncs.com/himark/feishu-token-service-admin-web:sha-<gitsha>`
5. GitHub Actions SSH 到阿里云
6. 阿里云服务器拉取平台仓并执行：
   - `docker compose pull`
   - `docker compose up -d`
   - `docker compose exec -T api npx prisma db push`（`api/full`）
   - 健康检查

## 三、远端目录

默认远端平台目录：

```text
/opt/aliyun-deploy-platform
```

`feishu-token-service` 运行时文件位于：

```text
/opt/aliyun-deploy-platform/runtime/feishu-token-service
```

至少包括：

- `service.env`
- `compose.env`
- `releases/current.json`
- `releases/previous.json`

## 四、生产 compose

生产 compose 已经迁移到平台仓：

- `aliyun-deploy-platform/services/feishu-token-service/compose.prod.yml`

与本仓库根目录 `docker-compose.yml` 的职责不同：

- 根目录 `docker-compose.yml`
  - 继续用于本地开发和本地联调
- 平台仓 `compose.prod.yml`
  - 只用于生产镜像部署
  - 业务容器统一使用 `image:`

## 五、部署目标

平台层继续保留这三个目标语义：

- `api`
  - pull `api`
  - `up -d api`
  - 执行 `npx prisma db push`
  - 检查 `https://token.himark.me/health`

- `admin-web`
  - pull `admin-web`
  - `up -d admin-web caddy`
  - 检查 `https://admin.himark.me/login`

- `full`
  - pull `api admin-web`
  - `up -d api admin-web caddy`
  - 执行 `npx prisma db push`
  - 检查两个健康地址

## 六、首次初始化

### 1. 平台仓

在阿里云服务器上准备平台仓目录，并确保服务器能够拉取平台仓。

### 2. 运行时 env

以平台仓里的样例文件为起点：

```text
aliyun-deploy-platform/services/feishu-token-service/compose.prod.env.example
```

复制到远端：

```text
/opt/aliyun-deploy-platform/runtime/feishu-token-service/service.env
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

## 七、GitHub Secrets

当前生产最小 secrets 集合：

- `ALIYUN_HOST`
- `ALIYUN_SSH_USER`
- `ALIYUN_SSH_PRIVATE_KEY`
- `ACR_USERNAME`
- `ACR_PASSWORD`

可选：

- `ALIYUN_SSH_PORT`
- `ALIYUN_SSH_KNOWN_HOSTS`
- `PLATFORM_GIT_URL`
- `REMOTE_PLATFORM_DIR`

如果后续需要临时恢复 GHCR 兼容发布：

- 仅恢复构建输出时，额外配置 `GHCR_PUSH_USERNAME` / `GHCR_PUSH_TOKEN`，并在 `.deploy/build.yaml` 中显式启用 `ghcr`
- 如果还要把生产镜像源切回 `ghcr`，再额外配置 `GHCR_PULL_USERNAME` / `GHCR_PULL_TOKEN`

## 八、手动发布与回滚

自动发布是主路径。如果需要手动触发，可继续使用运维侧兼容入口：

```bash
deploy-feishu-token-service.sh --target api --image-tag sha-<gitsha>
deploy-feishu-token-service.sh --target admin-web --image-tag sha-<gitsha>
deploy-feishu-token-service.sh --target full --image-tag sha-<gitsha>
```

这个入口现在只会：

- 拉取平台仓
- 调用平台脚本
- pull 对应镜像
- 重启服务

不会再做远端源码 `git pull` 和 `docker build`

## 九、验证方式

每次部署后至少检查：

1. [https://token.himark.me/health](https://token.himark.me/health)
2. [https://admin.himark.me/login](https://admin.himark.me/login)
3. `/admin-api/session/me` 是否仍返回当前超管
4. `/auth/feishu/callback` 是否仍可用
5. Feishu personal auth、drive root list、docs/wiki/minutes/messages 是否继续正常

## 十、公开仓说明

本仓库默认按公开仓维护：

- `validate.yml` 只跑 `pull_request`
- `validate.yml` 不继承 deploy secrets
- 不使用 `pull_request_target`
- 不使用 self-hosted runner

只有承载主机拓扑、运行时配置和运维恢复逻辑的仓库才继续保持私有，例如 `openclaw-main-config`
