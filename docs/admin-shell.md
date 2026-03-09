# `admin.himark.me` 统一后台壳站说明

## 一、目标

统一后台采用：

- 壳站
- 子应用
- 共享 UI 组件
- 统一超管登录
- 桌面端与 H5 一并支持

当前首个子应用是：

- `授权中心`

长期目标是让后续其他服务后台也按同一套规范接进来，而不是每个服务自己长一套后台。

## 二、为什么现在不引入微前端框架

当前阶段明确：

- 不引入 qiankun
- 不引入 single-spa
- 不引入复杂微前端通信机制

原因：

- 当前服务数量还不多
- 当前没有独立团队与独立发布节奏需求
- 当前技术栈不会明显分裂
- 微前端框架会显著增加构建、路由、依赖、调试和部署复杂度

当前采用的是：

- 微前端思想
  - 壳站
  - 子应用契约
  - 松耦合
  - 可插拔
- 非微前端框架
  - 同仓多应用
  - 路由级挂载
  - 共享 UI 包

## 三、前端结构

```text
apps/
├─ admin-shell/
│  ├─ src/
│  └─ nginx.conf
├─ auth-center-app/
│  └─ src/
└─ admin-web.Dockerfile

packages/
├─ ui/
│  └─ src/
└─ config/
```

职责分工：

- `admin-shell`
  - 登录、导航、路由、布局、移动端适配
- `auth-center-app`
  - 授权中心页面
- `packages/ui`
  - 共享组件与视觉 token

## 四、路由结构

统一后台域名：

- `https://admin.himark.me`

当前路由：

- `/login`
- `/dashboard`
- `/auth-center`
- `/auth-center/users/:userId`

预留路由：

- `/cars/*`
- `/openclaw/*`
- `/ops/*`

## 五、子应用接入契约

每个子应用至少提供：

- `meta.ts`
  - `key`
  - `label`
  - `routeBase`
  - `icon`
  - `order`
  - `mobileVisible`
- `routes.tsx`
- `pages/`
- `api/`
- `index.ts`

壳站通过静态注册表接入子应用，不允许每个子应用各自实现一套路由壳。

## 六、共享 UI 基线

共享 UI 组件目前包括：

- 布局
  - `AppShell`
  - `PageHeader`
  - `SectionCard`
  - `MetricCard`
- 状态
  - `StatusBadge`
  - `EmptyState`
- 导航
  - 桌面端侧栏
  - H5 抽屉导航

视觉基线：

- 信息架构参考飞书后台
- 视觉语义参考 Arco Design
- 中文文案优先
- 强调高引导、强反馈、低歧义

## 七、H5 目标

H5 不是桌面端缩小版，而是正式交付范围。

当前移动端必须可完成：

- 登录/退出
- 查看首页概览
- 查看用户详情
- 启用/禁用用户
- 查看和切换 Feishu personal 授权
- 查看全局 App 授权
- 查看最近事件与最近告警

移动端策略：

- 表格转卡片列表
- 侧栏转抽屉
- 核心指标优先展示
- 危险操作避免密集排列

## 八、后端配合方式

后端继续按服务拆分，不做统一后台聚合后端。

当前授权中心服务提供：

- `/admin-api/session/*`
- `/admin-api/dashboard`
- `/admin-api/users/*`
- `/admin-api/platform-accounts/*`
- `/admin-api/personal-authorizations/*`
- `/admin-api/app-authorizations/*`

后续新服务后台建议也提供类似风格的后台 API。

## 九、何时再升级到微前端框架

只有出现以下情况时，再考虑升级：

- 不同后台需要独立仓库
- 不同后台需要独立发布节奏
- 子应用由不同团队长期维护
- 技术栈明显分裂
- 统一壳站已经成为发布瓶颈

在此之前，同仓多应用 + 统一壳站足够。
