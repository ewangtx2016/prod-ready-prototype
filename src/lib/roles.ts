export type Role = "super_admin" | "org_admin" | "planner" | "tutor";

export const ROLE_META: Record<Role, { name: string; short: string; color: string; desc: string }> = {
  super_admin: { name: "鼎校超管", short: "超管", color: "bg-purple-500", desc: "平台最高管理权限，配置分成规则等" },
  org_admin: { name: "机构管理员", short: "管理员", color: "bg-blue-500", desc: "机构用户资产所有者，审核/配置/导出" },
  planner: { name: "规划师", short: "规划", color: "bg-emerald-500", desc: "服务与转化执行者" },
  tutor: { name: "学管师", short: "学管", color: "bg-amber-500", desc: "日常督学与基础服务执行者" },
};

export const ROLE_LIST: Role[] = ["org_admin", "super_admin", "planner", "tutor"];

/** 菜单可见性矩阵（PRD §14） */
export const MENU_PERMS: Record<string, Role[]> = {
  dashboard: ["org_admin", "super_admin", "planner"],
  student: ["org_admin", "super_admin"],
  service: ["org_admin", "super_admin", "planner", "tutor"],
  notification: ["org_admin", "super_admin", "planner", "tutor"],
  sales: ["org_admin", "super_admin", "planner"],
  profit: ["org_admin", "super_admin"],
  ledger: ["org_admin", "super_admin", "planner"],
  settings: ["org_admin", "super_admin"],
  permission: ["org_admin", "super_admin"],
  audit: ["org_admin", "super_admin"],
};

/** 子菜单可见性（按路径）。未配置则继承父级 MENU_PERMS。 */
export const SUBMENU_PERMS: Record<string, Role[]> = {
  // 学管师仅可见：服务列表、站内信
  "/service/records": ["org_admin", "super_admin", "planner", "tutor"],
  "/service/settings": [],
  "/notification/templates": ["org_admin", "super_admin", "planner"],
  "/settings/notification-events": ["org_admin", "super_admin"],
  "/permission/users": ["org_admin", "super_admin"],
  "/permission/roles": ["org_admin", "super_admin"],
  "/permission/menus": ["org_admin", "super_admin"],
};

export function can(role: Role, action: string): boolean {
  // 中心化按钮权限矩阵（PRD §4.2 / §14）
  const matrix: Record<string, Role[]> = {
    "dashboard.export": ["org_admin"],
    "dashboard.customize": ["org_admin"],
    "service.audit": ["org_admin"],
    "service.create": ["planner", "tutor"],
    "service.edit_request": ["planner", "tutor"],
    "service.export": ["org_admin"],
    "service.mode_switch": ["org_admin"],
    "sales.export": ["org_admin"],
    "profit.create": ["super_admin"],
    "profit.edit": ["super_admin"],
    "profit.enable": ["super_admin"],
    "profit.disable": ["super_admin"],
    "profit.audit": ["org_admin"],
    "profit.sms_verify": ["org_admin"],
    "ledger.export": ["org_admin", "planner"],
    "settings.org_edit": ["org_admin"],
    "permission.user_create": ["org_admin"],
    "permission.user_edit": ["org_admin"],
    "permission.user_reset": ["org_admin"],
    "permission.user_toggle": ["org_admin"],
    "permission.role_create": ["org_admin"],
    "permission.role_edit": ["org_admin"],
    "permission.role_config": ["org_admin"],
    "permission.menu_create": ["org_admin"],
    "permission.menu_edit": ["org_admin"],
    "permission.menu_delete": ["org_admin"],
    "audit.view": ["org_admin", "super_admin"],
    "student.export": ["org_admin", "super_admin"],
  };
  return matrix[action]?.includes(role) ?? false;
}