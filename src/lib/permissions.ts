import { useSyncExternalStore } from "react";
import type { Role } from "./roles";

/** 权限树节点：菜单 (menu) 或 按钮 (button)
 *  - menu: 可对应路由（path）；可挂子节点（子菜单 / 按钮）
 *  - button: 叶子，挂在某个菜单下，代表页面内的操作
 */
export type PermNodeType = "menu" | "button";
export interface PermNode {
  id: string;
  type: PermNodeType;
  name: string;
  /** 权限码（如 user:create），用于前端渲染控制 */
  code: string;
  /** 接口码（如 POST /api/user, user.create），可逗号分隔多个 */
  api?: string;
  /** 菜单路由路径（仅 menu） */
  path?: string;
  /** 子节点（仅 menu） */
  children?: PermNode[];
  /** 内置节点不允许删除（避免影响演示） */
  builtin?: boolean;
}

/** 数据范围（可配置） */
export type DataScope = "all" | "org" | "self" | "assigned";
export const DATA_SCOPE_LABEL: Record<DataScope, string> = {
  all: "全部数据（跨机构）",
  org: "本机构数据",
  self: "本人数据",
  assigned: "被分配数据",
};

export interface RoleDef {
  key: string;
  name: string;
  short: string;
  color: string; // tailwind bg class
  desc: string;
  builtin?: boolean;
  scope: DataScope;
  /** 已授权的权限节点 id 列表（菜单+按钮统一管理） */
  permIds: string[];
}

/* ============================== 默认权限树（PRD §14） ============================== */
/** 约定：菜单 code = `${menuKey}:view`，按钮 code = `${menuKey}:${action}` */
export const DEFAULT_TREE: PermNode[] = [
  {
    id: "m_dashboard", type: "menu", name: "数据看板", code: "dashboard:view",
    api: "GET /api/dashboard", path: "/dashboard", builtin: true,
    children: [
      { id: "b_dashboard_export", type: "button", name: "导出", code: "dashboard:export", api: "POST /api/dashboard/export", builtin: true },
      { id: "b_dashboard_customize", type: "button", name: "自定义看板", code: "dashboard:customize", api: "PUT /api/dashboard/layout", builtin: true },
    ],
  },
  {
    id: "m_service", type: "menu", name: "服务记录", code: "service:view",
    api: "GET /api/service/records", builtin: true,
    children: [
      { id: "m_service_records", type: "menu", name: "服务列表", code: "service.records:view", api: "GET /api/service/records", path: "/service/records", builtin: true,
        children: [
          { id: "b_service_create", type: "button", name: "新增服务", code: "service:create", api: "POST /api/service/records", builtin: true },
          { id: "b_service_edit_request", type: "button", name: "申请编辑", code: "service:edit_request", api: "POST /api/service/records/edit-request", builtin: true },
          { id: "b_service_audit", type: "button", name: "审核服务", code: "service:audit", api: "POST /api/service/records/audit", builtin: true },
          { id: "b_service_export", type: "button", name: "导出", code: "service:export", api: "POST /api/service/records/export", builtin: true },
        ],
      },
      { id: "m_service_settings", type: "menu", name: "审核模式", code: "service.settings:view", api: "GET /api/service/settings", path: "/service/settings", builtin: true,
        children: [
          { id: "b_service_mode_switch", type: "button", name: "切换审核模式", code: "service:mode_switch", api: "PUT /api/service/settings/mode", builtin: true },
        ],
      },
    ],
  },
  {
    id: "m_notification", type: "menu", name: "通知管理", code: "notification:view",
    api: "GET /api/notification", builtin: true,
    children: [
      { id: "m_notification_templates", type: "menu", name: "通知模板", code: "notification.templates:view", api: "GET /api/notification/templates", path: "/notification/templates", builtin: true },
      { id: "m_notification_events", type: "menu", name: "通知事件", code: "notification.events:view", api: "GET /api/settings/notification-events", path: "/settings/notification-events", builtin: true },
    ],
  },
  {
    id: "m_sales", type: "menu", name: "销售管理", code: "sales:view",
    api: "GET /api/sales", path: "/sales", builtin: true,
    children: [
      { id: "b_sales_export", type: "button", name: "导出销售", code: "sales:export", api: "POST /api/sales/export", builtin: true },
    ],
  },
  {
    id: "m_profit", type: "menu", name: "分成管理", code: "profit:view",
    api: "GET /api/profit", builtin: true,
    children: [
      { id: "m_profit_rules", type: "menu", name: "分成规则", code: "profit.rules:view", api: "GET /api/profit/rules", path: "/profit/rules", builtin: true,
        children: [
          { id: "b_profit_create", type: "button", name: "新增规则", code: "profit:create", api: "POST /api/profit/rules", builtin: true },
          { id: "b_profit_edit", type: "button", name: "编辑规则", code: "profit:edit", api: "PUT /api/profit/rules", builtin: true },
          { id: "b_profit_enable", type: "button", name: "启用规则", code: "profit:enable", api: "POST /api/profit/rules/enable", builtin: true },
          { id: "b_profit_disable", type: "button", name: "停用规则", code: "profit:disable", api: "POST /api/profit/rules/disable", builtin: true },
          { id: "b_profit_audit", type: "button", name: "审核规则", code: "profit:audit", api: "POST /api/profit/rules/audit", builtin: true },
          { id: "b_profit_sms_verify", type: "button", name: "短信验证", code: "profit:sms_verify", api: "POST /api/profit/rules/sms-verify", builtin: true },
        ],
      },
      { id: "m_profit_dimensions", type: "menu", name: "维度配置", code: "profit.dimensions:view", api: "GET /api/profit/dimensions", path: "/profit/dimensions", builtin: true },
    ],
  },
  {
    id: "m_ledger", type: "menu", name: "台账管理", code: "ledger:view", api: "GET /api/ledger", builtin: true,
    children: [
      { id: "m_ledger_settled", type: "menu", name: "已结算", code: "ledger.settled:view", api: "GET /api/ledger/settled", path: "/ledger/settled", builtin: true },
      { id: "m_ledger_pending", type: "menu", name: "待结算", code: "ledger.pending:view", api: "GET /api/ledger/pending", path: "/ledger/pending", builtin: true },
      { id: "m_ledger_estimated", type: "menu", name: "预估收入", code: "ledger.estimated:view", api: "GET /api/ledger/estimated", path: "/ledger/estimated", builtin: true },
      { id: "m_ledger_refund", type: "menu", name: "分账退回", code: "ledger.refund:view", api: "GET /api/ledger/refund", path: "/ledger/refund", builtin: true },
      { id: "m_ledger_abnormal", type: "menu", name: "异常台账", code: "ledger.abnormal:view", api: "GET /api/ledger/abnormal", path: "/ledger/abnormal", builtin: true },
      { id: "b_ledger_export", type: "button", name: "导出台账", code: "ledger:export", api: "POST /api/ledger/export", builtin: true },
    ],
  },
  {
    id: "m_settings", type: "menu", name: "系统设置", code: "settings:view", api: "GET /api/settings", builtin: true,
    children: [
      { id: "m_settings_org", type: "menu", name: "机构信息", code: "settings.org:view", api: "GET /api/settings/org", path: "/settings/org", builtin: true,
        children: [
          { id: "b_settings_org_edit", type: "button", name: "编辑机构", code: "settings:org_edit", api: "PUT /api/settings/org", builtin: true },
        ],
      },
      { id: "m_settings_ip", type: "menu", name: "IP 白名单", code: "settings.ip:view", api: "GET /api/settings/ip", path: "/settings/ip", builtin: true },
      { id: "m_settings_backup", type: "menu", name: "备份设置", code: "settings.backup:view", api: "GET /api/settings/backup", path: "/settings/backup", builtin: true,
        children: [
          { id: "b_settings_backup_restore", type: "button", name: "恢复备份", code: "settings:backup_restore", api: "POST /api/settings/backup/restore", builtin: true },
          { id: "b_settings_backup_delete", type: "button", name: "删除备份", code: "settings:backup_delete", api: "DELETE /api/settings/backup", builtin: true },
        ],
      },
    ],
  },
  {
    id: "m_role", type: "menu", name: "角色管理", code: "role:view", api: "GET /api/roles", path: "/role", builtin: true,
    children: [
      { id: "b_role_config_scope", type: "button", name: "配置数据范围", code: "role:config_scope", api: "PUT /api/roles/scope", builtin: true },
      { id: "b_role_create", type: "button", name: "新增角色", code: "role:create", api: "POST /api/roles", builtin: true },
      { id: "b_role_edit", type: "button", name: "编辑角色", code: "role:edit", api: "PUT /api/roles", builtin: true },
      { id: "b_role_delete", type: "button", name: "删除角色", code: "role:delete", api: "DELETE /api/roles", builtin: true },
    ],
  },
  {
    id: "m_user", type: "menu", name: "账号管理", code: "user:view", api: "GET /api/users", builtin: true,
    children: [
      { id: "m_user_accounts", type: "menu", name: "后台账号", code: "user.accounts:view", api: "GET /api/users/accounts", path: "/user/accounts", builtin: true,
        children: [
          { id: "b_user_create", type: "button", name: "新增账号", code: "user:create", api: "POST /api/users", builtin: true },
          { id: "b_user_edit", type: "button", name: "编辑账号", code: "user:edit", api: "PUT /api/users", builtin: true },
          { id: "b_user_reset", type: "button", name: "重置密码", code: "user:reset_password", api: "POST /api/users/reset-password", builtin: true },
          { id: "b_user_toggle", type: "button", name: "启停账号", code: "user:toggle", api: "PUT /api/users/status", builtin: true },
        ],
      },
    ],
  },
  {
    id: "m_customer", type: "menu", name: "用户管理", code: "customer:view", api: "GET /api/customers", builtin: true,
    children: [
      { id: "m_customer_list", type: "menu", name: "用户列表", code: "customer.list:view", api: "GET /api/customers", path: "/customer", builtin: true,
        children: [
          { id: "b_customer_export", type: "button", name: "导出用户", code: "customer:export", api: "POST /api/customers/export", builtin: true },
        ],
      },
    ],
  },
  {
    id: "m_audit", type: "menu", name: "审计日志", code: "audit:view", api: "GET /api/audit", path: "/audit-log", builtin: true,
  },
];

/* ============================== 默认角色（4 个预设，PRD §14） ============================== */
/** 收集树中所有节点 id（按角色矩阵裁剪用） */
function collectIds(nodes: PermNode[], filter: (n: PermNode) => boolean, parentMatched = true): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    const ok = filter(n);
    if (ok) ids.push(n.id);
    if (n.children) ids.push(...collectIds(n.children, filter, ok));
  }
  return ids;
}
const ALL_IDS = collectIds(DEFAULT_TREE, () => true);

/** 按 PRD §14 矩阵给每个角色分配权限 */
function presetIds(role: Role): string[] {
  const allowedMenus: Record<Role, string[]> = {
    super_admin: ["dashboard", "service", "notification", "sales", "profit", "ledger", "settings", "role", "user", "customer", "audit"],
    org_admin:   ["dashboard", "service", "notification", "sales", "profit", "ledger", "settings", "role", "user", "customer", "audit"],
    planner:     ["dashboard", "service", "notification", "sales", "ledger", "customer"],
    tutor:       ["service", "notification", "customer"],
  };
  const allowedBtns: Record<Role, string[]> = {
    super_admin: ["profit:create", "profit:edit", "profit:enable", "profit:disable", "service.records 查看"],
    org_admin: ["dashboard:export", "dashboard:customize", "service:audit", "service:export", "service:mode_switch",
                "sales:export", "profit:audit", "profit:sms_verify", "ledger:export",
                "settings:org_edit", "settings:backup_restore", "settings:backup_delete",
                "user:create", "user:edit", "user:reset_password", "user:toggle",
                "customer:export",
                "role:config_scope", "role:create", "role:edit", "role:delete"],
    planner: ["service:create", "service:edit_request", "ledger:export"],
    tutor: ["service:create", "service:edit_request"],
  };
  const menuPrefixes = allowedMenus[role];
  return ALL_IDS.filter((id) => {
    const node = findById(DEFAULT_TREE, id);
    if (!node) return false;
    // 学管师不需要「审核模式」菜单
    if (role === "tutor" && (id === "m_service_settings" || node.code === "service:mode_switch")) return false;
    if (node.type === "menu") {
      // 菜单 code 形如 dashboard:view / service.records:view ;取首段
      const top = node.code.split(":")[0].split(".")[0];
      return menuPrefixes.includes(top);
    }
    // 按钮：按 code 白名单 + 父菜单必须可见
    if (!allowedBtns[role].includes(node.code)) return false;
    return true;
  });
}

export const DEFAULT_ROLES: RoleDef[] = [
  { key: "super_admin", name: "鼎校超管", short: "超管", color: "bg-purple-500", desc: "平台最高管理权限",   builtin: true, scope: "all", permIds: presetIds("super_admin") },
  { key: "org_admin",   name: "机构管理员", short: "管理员", color: "bg-blue-500",   desc: "机构资产所有者",   builtin: true, scope: "org", permIds: presetIds("org_admin") },
  { key: "planner",     name: "规划师",     short: "规划",   color: "bg-emerald-500", desc: "服务与转化执行者", builtin: true, scope: "self", permIds: presetIds("planner") },
  { key: "tutor",       name: "学管师",     short: "学管",   color: "bg-amber-500",   desc: "日常督学执行者",   builtin: true, scope: "assigned", permIds: presetIds("tutor") },
];

/* ============================== 工具 ============================== */
export function findById(nodes: PermNode[], id: string): PermNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const r = findById(n.children, id); if (r) return r; }
  }
  return null;
}
export function flattenTree(nodes: PermNode[]): PermNode[] {
  const out: PermNode[] = [];
  const walk = (ns: PermNode[]) => ns.forEach((n) => { out.push(n); n.children && walk(n.children); });
  walk(nodes); return out;
}
/** 获取所有祖先 id（用于勾选子节点时自动勾选父菜单） */
export function getAncestors(nodes: PermNode[], id: string, trail: string[] = []): string[] | null {
  for (const n of nodes) {
    if (n.id === id) return trail;
    if (n.children) { const r = getAncestors(n.children, id, [...trail, n.id]); if (r) return r; }
  }
  return null;
}

/* ============================== Mock Store ============================== */
const LS_TREE = "demo.permTree.v2";
const LS_ROLES = "demo.permRoles.v2";

type State = { tree: PermNode[]; roles: RoleDef[] };
let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  try {
    const t = localStorage.getItem(LS_TREE);
    const r = localStorage.getItem(LS_ROLES);
    return {
      tree: t ? JSON.parse(t) : DEFAULT_TREE,
      roles: r ? JSON.parse(r) : DEFAULT_ROLES,
    };
  } catch {
    return { tree: DEFAULT_TREE, roles: DEFAULT_ROLES };
  }
}
function persist() {
  try {
    localStorage.setItem(LS_TREE, JSON.stringify(state.tree));
    localStorage.setItem(LS_ROLES, JSON.stringify(state.roles));
  } catch {}
  listeners.forEach((l) => l());
}

export const permStore = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  setTree: (tree: PermNode[]) => { state = { ...state, tree }; persist(); },
  setRoles: (roles: RoleDef[]) => { state = { ...state, roles }; persist(); },
  reset: () => { state = { tree: DEFAULT_TREE, roles: DEFAULT_ROLES }; persist(); },
};

export function usePermStore() {
  return useSyncExternalStore(permStore.subscribe, permStore.get, permStore.get);
}

/** 当前角色是否拥有某个菜单路径 */
export function useCanMenu(roleKey: string, path: string): boolean {
  const { tree, roles } = usePermStore();
  const role = roles.find((r) => r.key === roleKey);
  if (!role) return false;
  const node = flattenTree(tree).find((n) => n.path === path);
  return node ? role.permIds.includes(node.id) : false;
}
/** 当前角色是否拥有某个按钮 code */
export function useCanAction(roleKey: string, code: string): boolean {
  const { tree, roles } = usePermStore();
  const role = roles.find((r) => r.key === roleKey);
  if (!role) return false;
  const node = flattenTree(tree).find((n) => n.code === code);
  return node ? role.permIds.includes(node.id) : false;
}