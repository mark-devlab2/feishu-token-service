# 个人助手授权中心与平台数据 Gateway 设计

## 目标

本服务只服务于个人助手场景，不做统一用户体系，不做组架同步，不做业务中台。

当前阶段的职责只有四类：

1. 维护可与 OpenClaw 对话的轻量用户目录
2. 维护平台账号映射，用于识别消息发送者属于哪个系统用户
3. 维护 `personal` / `app` 两类授权及其生命周期
4. 通过 gateway 提供平台个人数据只读访问能力

## 核心模型

- `users`
  - 系统轻量用户目录
- `providers`
  - 平台定义
- `platform_accounts`
  - 平台入口身份映射
- `platform_authorizations`
  - 平台授权中心
- `auth_sessions`
  - 浏览器授权会话
- `auth_events`
  - 授权事件日志
- `alerts`
  - 告警

## 权限边界

- 只有后台手动添加并启用的用户，才能与 OpenClaw 对话
- 只有开启某平台 `personal` 授权开关的用户，才能触发该平台个人数据能力
- `app` 授权是全局共享资源，只允许超管管理
- OpenClaw 默认不持有原始 token，只查状态、发授权链接、调 gateway

## 第一阶段范围

第一阶段只实际实现：

- `feishu` provider
- 后台密码登录
- 用户目录
- 平台账号映射
- `personal` / `app` 授权中心
- Feishu 只读 gateway：
  - `docs`
  - `wiki`
  - `minutes`
  - `messages` 基础读取

明确不做：

- 复杂消息搜索
- `calendar` / `drive`
- 平台写操作
- 微信 / 钉钉真实接入
- 组架同步
- 普通用户后台自助

## OpenClaw 集成原则

OpenClaw 的集成顺序固定为：

1. 先识别发送者是否命中后台已启用用户
2. 命中后允许普通对话
3. 若任务需要平台个人数据，再检查该用户该平台的 `personal` 授权状态
4. 无授权时返回浏览器授权链接
5. 授权可用后调用 gateway
6. OpenClaw 对读取到的数据做分析与输出

## 演进方向

未来如需接入微信、钉钉，只扩展：

- `providers`
- 对应平台授权逻辑
- 对应平台 gateway

不引入统一用户体系，不改变当前用户目录与授权中心职责。
