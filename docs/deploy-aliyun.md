# 阿里云部署说明

## 运行目录

建议部署目录：

```text
/root/services/feishu-token-service
```

需要同步到服务器的文件：

- `Dockerfile`
- `docker-compose.yml`
- `.env`
- `package.json`
- `package-lock.json`
- `nest-cli.json`
- `tsconfig.json`
- `prisma/`
- `src/`
- `views/`

## 环境变量

从 `.env.aliyun.example` 复制一份 `.env`，至少补齐这些值：

- `TOKEN_ENCRYPTION_KEY`
- `INTERNAL_API_KEY`
- `ADMIN_PASSWORD`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_REDIRECT_URI`

## 启动

```bash
docker compose up -d --build
```

## 健康检查

```bash
curl -fsS http://127.0.0.1:3080/health
```

期望返回：

```json
{"status":"ok"}
```

## OpenClaw 接入

OpenClaw 侧应调用：

- `GET /auth/feishu/status?user_open_id=...`
- `POST /auth/feishu/link`
- `GET /tokens/feishu/resolve?user_open_id=...`

如果服务与 OpenClaw 跑在同一台阿里云主机，推荐先用：

```text
http://127.0.0.1:3080
```

如果浏览器授权回调需要公网访问，再通过反向代理暴露 callback 路径。
