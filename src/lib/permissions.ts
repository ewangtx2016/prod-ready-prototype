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

/** 数据范围明细 —— 三维度精细化配置（已废弃，由 dataPerms 替代） */
export interface ScopeDetail {
  /** 可见机构列表，空数组 = 不限（全部） */
  orgs: string[];
  /** 可见规划师列表，空数组 = 不限（全部），["__self__"] = 仅本人 */
  planners: string[];
  /** 可见学管师列表，空数组 = 不限（全部），["__self__"] = 仅本人 */
  tutors: string[];
}

/* ============================== 数据权限（通用维度） ============================== */
/** 数据实体（业务模块） */
export type DataEntity =
  | "service"
  | "sales"
  | "ledger"
  | "audit"
  | "org"
  | "user"
  | "role";

export const DATA_ENTITIES: DataEntity[] = [
  "sales", "ledger", "audit", "org", "user", "role",
];

export const DATA_ENTITY_LABEL: Record<DataEntity, string> = {
  service: "服务记录",
  sales: "销售订单",
  ledger: "台账明细",
  audit: "审计日志",
  org: "机构信息",
  user: "用户账号",
  role: "角色数据",
};

/** 机构范围 */
export type OrgScope = "all" | "self_org" | "specified";
export const ORG_SCOPE_LABEL: Record<OrgScope, string> = {
  all: "全部机构",
  self_org: "本机构",
  specified: "指定机构",
};

/** 人员范围（数据归属） */
export type OwnerScope = "all" | "self" | "specified";
export const OWNER_SCOPE_LABEL: Record<OwnerScope, string> = {
  all: "全部人员",
  self: "仅本人",
  specified: "指定人员",
};

/** 数据权限规则 —— 按业务实体配置机构范围 × 人员范围 */
export interface DataPermRule {
  entity: DataEntity;
  /** 该模块数据权限是否启用（禁用后该角色完全看不到此模块数据） */
  enabled: boolean;
  orgScope: OrgScope;
  /** 指定机构列表（orgScope === "specified" 时生效） */
  orgs: string[];
  ownerScope: OwnerScope;
  /** 指定人员列表（ownerScope === "specified" 时生效） */
  owners: string[];
}

export interface RoleDef {
  key: string;
  name: string;
  short: string;
  color: string; // tailwind bg class
  desc: string;
  builtin?: boolean;
  /** @deprecated 由 dataPerms 替代 */
  scope: DataScope;
  /** @deprecated 由 dataPerms 替代 */
  scopeDetail?: ScopeDetail;
  /** 数据权限（按业务实体配置） */
  dataPerms: DataPermRule[];
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
      { id: "m_ledger_view", type: "menu", name: "台账列表", code: "ledger.list:view", api: "GET /api/ledger", path: "/ledger", builtin: true },
      { id: "b_ledger_export", type: "button", name: "导出台账", code: "ledger:export", api: "POST /api/ledger/export", builtin: true },
    ],
  },
  {
    id: "m_org", type: "menu", name: "机构管理", code: "org:view", api: "GET /api/org", path: "/settings/org", builtin: true,
    children: [
      { id: "b_org_edit", type: "button", name: "编辑机构", code: "org:edit", api: "PUT /api/org", builtin: true },
    ],
  },
  {
    id: "m_settings", type: "menu", name: "系统设置", code: "settings:view", api: "GET /api/settings", builtin: true,
    children: [
      { id: "m_settings_ip", type: "menu", name: "IP 白名单", code: "settings.ip:view", api: "GET /api/settings/ip", path: "/settings/ip", builtin: true },
    ],
  },
  {
    id: "m_permission", type: "menu", name: "权限管理", code: "permission:view", api: "GET /api/permission", builtin: true,
    children: [
      { id: "m_permission_users", type: "menu", name: "用户管理", code: "permission.users:view", api: "GET /api/permission/users", path: "/permission/users", builtin: true,
        children: [
          { id: "b_permission_user_create", type: "button", name: "新增用户", code: "permission.user:create", api: "POST /api/permission/users", builtin: true },
          { id: "b_permission_user_edit", type: "button", name: "编辑用户", code: "permission.user:edit", api: "PUT /api/permission/users", builtin: true },
          { id: "b_permission_user_reset", type: "button", name: "重置密码", code: "permission.user:reset_password", api: "POST /api/permission/users/reset-password", builtin: true },
          { id: "b_permission_user_toggle", type: "button", name: "启停用户", code: "permission.user:toggle", api: "PUT /api/permission/users/status", builtin: true },
        ],
      },
      { id: "m_permission_roles", type: "menu", name: "角色管理", code: "permission.roles:view", api: "GET /api/permission/roles", path: "/permission/roles", builtin: true,
        children: [
          { id: "b_permission_role_create", type: "button", name: "新增角色", code: "permission.role:create", api: "POST /api/permission/roles", builtin: true },
          { id: "b_permission_role_edit", type: "button", name: "编辑角色", code: "permission.role:edit", api: "PUT /api/permission/roles", builtin: true },
          { id: "b_permission_role_config", type: "button", name: "配置权限", code: "permission.role:config", api: "PUT /api/permission/roles/perms", builtin: true },
        ],
      },
      { id: "m_permission_menus", type: "menu", name: "菜单管理", code: "permission.menus:view", api: "GET /api/permission/menus", path: "/permission/menus", builtin: true,
        children: [
          { id: "b_permission_menu_create", type: "button", name: "新增菜单", code: "permission.menu:create", api: "POST /api/permission/menus", builtin: true },
          { id: "b_permission_menu_edit", type: "button", name: "编辑菜单", code: "permission.menu:edit", api: "PUT /api/permission/menus", builtin: true },
          { id: "b_permission_menu_delete", type: "button", name: "删除菜单", code: "permission.menu:delete", api: "DELETE /api/permission/menus", builtin: true },
        ],
      },
    ],
  },
  {
    id: "m_audit", type: "menu", name: "日志管理", code: "audit:view", api: "GET /api/audit", path: "/audit-log", builtin: true,
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

/** 生成角色的默认数据权限配置 */
function defaultDataPerms(role: Role): DataPermRule[] {
  const mk = (entity: DataEntity, enabled: boolean, orgScope: OrgScope, ownerScope: OwnerScope): DataPermRule =>
    ({ entity, enabled, orgScope, orgs: [], ownerScope, owners: [] });

  switch (role) {
    case "super_admin":
      return DATA_ENTITIES.map((e) => mk(e, true, "all", "all"));
    case "org_admin":
      return DATA_ENTITIES.map((e) => mk(e, true, "self_org", "all"));
    case "planner":
      return DATA_ENTITIES.map((e) => {
        const disabled = ["audit", "role", "user"].includes(e);
        return mk(e, !disabled, "self_org", ["sales", "ledger"].includes(e) ? "self" : "all");
      });
    case "tutor":
      return DATA_ENTITIES.map((e) => {
        const disabled = ["sales", "ledger", "audit", "role", "user"].includes(e);
        return mk(e, !disabled, "self_org", "all");
      });
    default:
      return DATA_ENTITIES.map((e) => mk(e, true, "self_org", "self"));
  }
}

/** 按 PRD §14 矩阵给每个角色分配权限 */
function presetIds(role: Role): string[] {
  const allowedMenus: Record<Role, string[]> = {
    super_admin: ["dashboard", "notification", "sales", "profit", "ledger", "org", "settings", "permission", "audit"],
    org_admin:   ["dashboard", "notification", "sales", "profit", "ledger", "org", "settings", "permission", "audit"],
    planner:     ["dashboard", "notification", "sales", "ledger", "org"],
    tutor:       ["notification", "org"],
  };
  const allowedBtns: Record<Role, string[]> = {
    super_admin: ["profit:create", "profit:edit", "profit:enable", "profit:disable"],
    org_admin: ["dashboard:export", "dashboard:customize",
                "sales:export", "profit:audit", "profit:sms_verify", "ledger:export",
                "org:edit",
                "permission.user:create", "permission.user:edit", "permission.user:reset_password", "permission.user:toggle",
                "permission.role:create", "permission.role:edit", "permission.role:config",
                "permission.menu:create", "permission.menu:edit", "permission.menu:delete"],
    planner: ["ledger:export"],
    tutor: [],
  };
  const menuPrefixes = allowedMenus[role];
  return ALL_IDS.filter((id) => {
    const node = findById(DEFAULT_TREE, id);
    if (!node) return false;
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
  { key: "super_admin", name: "鼎校超管", short: "超管", color: "bg-purple-500", desc: "平台最高管理权限",   builtin: true, scope: "all", scopeDetail: { orgs: [], planners: [], tutors: [] }, dataPerms: defaultDataPerms("super_admin"), permIds: presetIds("super_admin") },
  { key: "org_admin",   name: "机构管理员", short: "管理员", color: "bg-blue-500",   desc: "机构资产所有者",   builtin: true, scope: "org", scopeDetail: { orgs: [], planners: [], tutors: [] }, dataPerms: defaultDataPerms("org_admin"), permIds: presetIds("org_admin") },
  { key: "planner",     name: "规划师",     short: "规划",   color: "bg-emerald-500", desc: "服务与转化执行者", builtin: true, scope: "self", scopeDetail: { orgs: [], planners: ["__self__"], tutors: [] }, dataPerms: defaultDataPerms("planner"), permIds: presetIds("planner") },
  { key: "tutor",       name: "学管师",     short: "学管",   color: "bg-amber-500",   desc: "日常督学执行者",   builtin: true, scope: "assigned", scopeDetail: { orgs: [], planners: [], tutors: ["__self__"] }, dataPerms: defaultDataPerms("tutor"), permIds: presetIds("tutor") },
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
const LS_TREE = "demo.permTree.v7";
const LS_ROLES = "demo.permRoles.v7";

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

/** 数据范围「仅本人」标记（@deprecated 由 dataPerms 替代） */
export const SCOPE_SELF = "__self__";

/** 获取角色的数据范围明细（@deprecated 由 useDataPerm 替代） */
export function useScopeDetail(roleKey: string): ScopeDetail | undefined {
  const { roles } = usePermStore();
  const role = roles.find((r) => r.key === roleKey);
  return role?.scopeDetail;
}

/** 判断某角色是否是「执行者」角色（@deprecated） */
export function isServantRole(roleKey: string): boolean {
  return roleKey === "planner" || roleKey === "tutor";
}

/** 基于数据范围明细过滤数据（@deprecated 由 filterByDataPerm 替代） */
export function filterByScope<T extends { orgName?: string; plannerName?: string; tutorName?: string; createdBy?: string; createdByRole?: string }>(
  items: T[],
  scopeDetail: ScopeDetail | undefined,
  roleKey: string,
  currentUserName: string
): T[] {
  if (!scopeDetail) return items;
  const isPlanner = roleKey === "planner";
  const isTutor = roleKey === "tutor";

  return items.filter((item) => {
    // 机构维度
    if (scopeDetail.orgs.length > 0) {
      const org = item.orgName ?? "";
      if (org && !scopeDetail.orgs.includes(org)) return false;
    }

    // 规划师维度
    if (scopeDetail.planners.length > 0) {
      if (scopeDetail.planners.includes(SCOPE_SELF)) {
        if (isPlanner && item.createdByRole === "planner" && item.createdBy !== currentUserName) return false;
        if (!isPlanner && item.plannerName && item.plannerName !== currentUserName) return false;
        if (!isPlanner && item.createdByRole === "planner" && item.createdBy && item.createdBy !== currentUserName) return false;
      } else {
        const match = (name?: string) => name && scopeDetail.planners.includes(name);
        if (item.plannerName && !match(item.plannerName)) return false;
        if (item.createdByRole === "planner" && item.createdBy && !match(item.createdBy)) return false;
      }
    }

    // 学管师维度
    if (scopeDetail.tutors.length > 0) {
      if (scopeDetail.tutors.includes(SCOPE_SELF)) {
        if (isTutor && item.createdByRole === "tutor" && item.createdBy !== currentUserName) return false;
        if (!isTutor && item.tutorName && item.tutorName !== currentUserName) return false;
        if (!isTutor && item.createdByRole === "tutor" && item.createdBy && item.createdBy !== currentUserName) return false;
      } else {
        const match = (name?: string) => name && scopeDetail.tutors.includes(name);
        if (item.tutorName && !match(item.tutorName)) return false;
        if (item.createdByRole === "tutor" && item.createdBy && !match(item.createdBy)) return false;
      }
    }

    return true;
  });
}

/* ============================== 数据权限（新） ============================== */
/** 获取角色的某个数据实体权限规则 */
export function getDataPerm(roleKey: string, entity: DataEntity): DataPermRule | undefined {
  const state = permStore.get();
  const role = state.roles.find((r) => r.key === roleKey);
  return role?.dataPerms?.find((p) => p.entity === entity);
}

/** 基于数据权限过滤数据（通用维度）
 * 适用于 ServiceRecord / Order / LedgerItem / AuditLog 等含归属信息的数据
 */
export function filterByDataPerm<T extends {
  orgName?: string;
  plannerName?: string;
  tutorName?: string;
  createdBy?: string;
  createdByRole?: string;
  operator?: string;
}>(
  items: T[],
  entity: DataEntity,
  roleKey: string,
  currentUserName: string,
  currentOrgName: string
): T[] {
  const rule = getDataPerm(roleKey, entity);
  if (!rule || !rule.enabled) return [];

  return items.filter((item) => {
    // 机构范围过滤
    if (rule.orgScope === "self_org") {
      if (item.orgName && item.orgName !== currentOrgName) return false;
    } else if (rule.orgScope === "specified" && rule.orgs.length > 0) {
      if (item.orgName && !rule.orgs.includes(item.orgName)) return false;
    }

    // 人员范围过滤 —— 通用判断"数据归属人"
    if (rule.ownerScope === "self") {
      const creator = item.createdBy ?? item.operator ?? "";
      const relatedPlanner = item.plannerName ?? "";
      const relatedTutor = item.tutorName ?? "";
      if (creator && creator === currentUserName) return true;
      if (relatedPlanner && relatedPlanner === currentUserName) return true;
      if (relatedTutor && relatedTutor === currentUserName) return true;
      if (creator || relatedPlanner || relatedTutor) return false;
    } else if (rule.ownerScope === "specified" && rule.owners.length > 0) {
      const match = (name: string) => rule.owners.includes(name);
      const creator = item.createdBy ?? item.operator ?? "";
      const relatedPlanner = item.plannerName ?? "";
      const relatedTutor = item.tutorName ?? "";
      if (creator && match(creator)) return true;
      if (relatedPlanner && match(relatedPlanner)) return true;
      if (relatedTutor && match(relatedTutor)) return true;
      if (creator || relatedPlanner || relatedTutor) return false;
    }

    return true;
  });
}