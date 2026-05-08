import type { Role } from "./roles";

/** PRD §16.5：机构管理员可见明文，其余角色脱敏 */
export function maskPhone(phone: string, role: Role) {
  if (role === "org_admin") return phone;
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

export function maskName(name: string, role: Role) {
  // 机构管理员 / 规划师 / 学管师 可见明文姓名（业务方需要）
  if (role === "org_admin" || role === "planner" || role === "tutor") return name;
  if (!name) return name;
  return name[0] + "**";
}

export function maskAddress(addr: string, role: Role) {
  if (role === "org_admin") return addr;
  // 截到区级
  const m = addr.match(/(.{2,4}省)?(.{2,4}市)?(.{2,4}区|县)?/);
  return (m?.[0] || addr.slice(0, 6)) + "****";
}