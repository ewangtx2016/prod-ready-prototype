# 项目知识库 — 机构用户全生命周期管理系统

## 项目概述

- **名称**：机构用户全生命周期管理系统
- **定位**：高保真原型（PRD 驱动的前端演示系统）
- **核心功能**：机构用户资产保险柜 + 规划师服务展示台
- **数据模式**：纯前端 Mock，所有数据持久化到 localStorage，模拟真实 CRUD

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 路由 | TanStack Router（文件约定路由）+ TanStack Start |
| 样式 | Tailwind CSS v4 + tw-animate-css |
| UI 组件 | shadcn/ui（Radix UI 封装） |
| 构建 | Vite 7 + @cloudflare/vite-plugin |
| 表单 | react-hook-form + zod |
| 图表 | recharts |
| 日期 | date-fns + react-day-picker |

## 目录结构

```
src/
  routes/           # TanStack Router 路由（文件约定）
    __root.tsx      # 根路由：Provider 注入、全局初始化
    _app.tsx        # 布局路由：侧边栏 + 顶部栏 + 主内容区
    _app/dashboard.tsx
    _app/service/records.tsx
    _app/service/settings.tsx
    _app/sales/index.tsx
    _app/ledger/index.tsx
    _app/profit/rules.tsx
    _app/profit/dimensions.tsx
    _app/settings/org.tsx
    _app/settings/backup.tsx
    _app/settings/ip.tsx
    _app/settings/notification-events.tsx
    _app/role/index.tsx
    _app/user/accounts.tsx
    _app/audit-log.tsx
    _app/messages.tsx
    login.tsx
    index.tsx
  components/
    ui/             # shadcn/ui 基础组件（不可随意修改结构）
    layout/         # 布局组件（AppSidebar, AppHeader）
    dev/            # 业务/演示专用组件（RoleGate, DevNote, TemplateCrud 等）
  lib/
    store.tsx       # 全局状态：角色、机构名、DevNote 开关
    permissions.ts  # 权限树定义、角色矩阵、权限 Store
    roles.ts        # 角色枚举、菜单可见性矩阵、can() 权限检查
    mock.ts         # Mock 数据类型定义 + CRUD API
    utils.ts        # cn() 工具函数
  hooks/
    use-mobile.tsx  # 移动端检测 hook
```

## 路由约定

- 使用 TanStack Router 的**文件约定路由**
- `_app.tsx` 是带侧边栏的**布局父路由**，所有业务页面在其下
- `__root.tsx` 负责注入全局 Provider（AppStateProvider、Toaster）
- 路由文件**必须**导出 `Route = createFileRoute('/path')({ component: ... })`

## 状态管理

### 全局状态（React Context）

`lib/store.tsx` 的 `AppStateProvider`：
- `role`：当前角色（演示身份切换已隐藏，强制为 `org_admin`）
- `showDevNote`：开发注释显示开关（当前全局禁用，DevNote 组件直接返回 null）
- `orgName`：机构名称（localStorage 持久化）

### 权限状态

`lib/permissions.ts` 提供：
- `DEFAULT_TREE`：完整的菜单+按钮权限树（PRD §14）
- `DEFAULT_ROLES`：4 个预设角色的权限配置
- `permStore`：基于 localStorage 的权限状态（含 tree、roles）
- `useCanMenu(role, path)` / `useCanAction(role, code)`：权限检查 Hook

## 权限体系

### 4 个预设角色

| 角色 | 标识 | 数据范围 | 说明 |
|------|------|----------|------|
| 鼎校超管 | super_admin | all（跨机构） | 平台最高管理权限，配置分成规则 |
| 机构管理员 | org_admin | org（本机构） | 机构资产所有者，审核/配置/导出 |
| 规划师 | planner | self（本人） | 服务与转化执行者 |
| 学管师 | tutor | assigned（被分配） | 日常督学与基础服务执行者 |

### 权限码约定

- 菜单：`${menuKey}:view`，如 `dashboard:view`
- 按钮：`${menuKey}:${action}`，如 `dashboard:export`
- 子菜单：`parent.child:view`，如 `service.records:view`

### 权限检查方式

1. **菜单可见性**：`MENU_PERMS`（roles.ts）+ `SUBMENU_PERMS` 控制侧边栏渲染
2. **按钮级权限**：`can(role, action)`（roles.ts）或 `useCanAction(role, code)`（permissions.ts）
3. **页面级守卫**：`<RoleGate allow={['org_admin', 'super_admin']}>{children}</RoleGate>`

## Mock 数据架构

`lib/mock.ts` 是所有业务数据的中心：

| 数据类型 | 说明 |
|----------|------|
| ServiceRecord | 服务记录（沟通/督学/答疑/打卡/社群） |
| Order | 订单数据（课程/学习机/会员服务等） |
| ProfitRule | 分成规则（草稿/待审核/已生效/停用） |
| LedgerItem | 台账明细（订单级分润记录） |

- 所有数据通过 `localStorage` 持久化
- `seedIfNeeded()` 在首次访问时初始化演示数据
- 提供完整的 CRUD 模拟 API

## 组件开发规范

### shadcn/ui 组件

- 位于 `components/ui/`，通过 CLI 生成，**不要随意修改内部结构**
- 使用 `cn()` 合并类名：`import { cn } from "@/lib/utils"`
- 主题变量通过 CSS 变量控制（`bg-primary`, `text-muted-foreground` 等）

### 业务组件

- `components/dev/` 放演示/业务专用组件
- 布局组件放 `components/layout/`
- 表单使用 `react-hook-form` + `zod` 校验

## 开发注意事项

1. **无真实后端**：所有接口调用均为 localStorage 读写，不要引入真实 HTTP 请求
2. **角色切换已禁用**：顶栏角色切换功能已隐藏，强制使用 `org_admin`
3. **DevNote 已全局禁用**：`components/dev/DevNote.tsx` 直接返回 `null`
4. **内置权限节点不可删除**：权限树中带 `builtin: true` 的节点是演示基础，删除会导致页面异常
5. **优先使用现有依赖**：不要提议新增 npm 包
