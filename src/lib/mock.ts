/* Mock 数据 store —— 持久化到 localStorage，模拟真实 CRUD */

export type ServiceRecord = {
  id: string;
  userName: string;
  userPhone: string;
  serviceType: string; // 沟通/督学/答疑/打卡/社群
  content: string;
  duration: number; // 分钟
  createdBy: string; // 规划师/学管师 名
  createdByRole: "planner" | "tutor";
  createdAt: string;
  status: "submitted" | "pending_audit" | "approved" | "rejected";
  // 修改申请
  pendingChange?: { reason: string; newContent: string; submittedAt: string };
  rejectReason?: string;
};

export type Order = {
  id: string;
  userName: string;
  userPhone: string;
  course: string;
  courseType: "学科课" | "素养课" | "体验课";
  amount: number;
  source: "机构老用户" | "规划师新拓";
  channel: "鼎团团" | "甄选";
  payMethod: string;
  status: "待支付" | "已支付" | "退费中" | "已退费";
  refundStatus: "无" | "退费中" | "已退费";
  plannerName: string;
  createdAt: string;
};

export type ProfitRule = {
  id: string;
  name: string;
  version: string;
  status: "draft" | "pending_audit" | "ready" | "active" | "disabled" | "rejected";
  createdBy: string;
  createdAt: string;
  // 三维度
  dims: {
    courseType?: { weight: number; ratios: Record<string, { org: number; planner: number; platform: number }> };
    userSource?: { weight: number; ratios: Record<string, { org: number; planner: number; platform: number }> };
    convStage?: { weight: number; ratios: Record<string, { org: number; planner: number; platform: number }> };
  };
  rejectReason?: string;
  history: { time: string; action: string; operator: string }[];
};

export type LedgerItem = {
  id: string;
  orderId: string;
  userName: string;
  course: string;
  amount: number;
  orgAmount: number;
  plannerAmount: number;
  platformAmount: number;
  status: "settled" | "pending" | "estimated" | "refund_settled" | "refund_pending" | "abnormal";
  abnormalReason?: string;
  plannerName: string;
  settledAt?: string;
};

export type AuditLog = {
  id: string;
  time: string;
  operator: string;
  role: string;
  ip: string;
  module: string;
  action: string;
  detail: string;
};

const KEYS = {
  service: "demo.services",
  order: "demo.orders",
  rule: "demo.rules",
  ledger: "demo.ledger",
  log: "demo.logs",
  seeded: "demo.seeded.v1",
  auditMode: "demo.auditMode",
};

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v));
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

export function seedIfNeeded(force = false) {
  if (!force && localStorage.getItem(KEYS.seeded)) return;

  const services: ServiceRecord[] = [
    { id: rid(), userName: "张明轩", userPhone: "13812345678", serviceType: "沟通", content: "电话沟通孩子近期数学作业情况，建议加练应用题。", duration: 30, createdBy: "李规划", createdByRole: "planner", createdAt: "2026-04-25 10:30", status: "approved" },
    { id: rid(), userName: "王小宇", userPhone: "13987654321", serviceType: "督学", content: "督促完成今日打卡，已提醒家长配合。", duration: 15, createdBy: "陈学管", createdByRole: "tutor", createdAt: "2026-04-26 14:20", status: "submitted" },
    { id: rid(), userName: "李思琪", userPhone: "13511112222", serviceType: "答疑", content: "答疑物理浮力题，约 20 分钟。", duration: 20, createdBy: "陈学管", createdByRole: "tutor", createdAt: "2026-04-27 16:00", status: "submitted" },
    { id: rid(), userName: "赵晓彤", userPhone: "13633334444", serviceType: "沟通", content: "推荐艺考素养课，家长有意向，待二次回访。", duration: 45, createdBy: "李规划", createdByRole: "planner", createdAt: "2026-04-28 09:15", status: "pending_audit", pendingChange: { reason: "补充家长反馈", newContent: "推荐艺考素养课，家长已确认报名，下周缴费。", submittedAt: "2026-04-28 18:00" } },
    { id: rid(), userName: "孙文博", userPhone: "13755556666", serviceType: "社群", content: "社群答疑英语单词记忆方法。", duration: 10, createdBy: "陈学管", createdByRole: "tutor", createdAt: "2026-04-28 20:00", status: "rejected", rejectReason: "服务记录内容过于简单，请补充具体场景与时长证明。" },
  ];

  const orders: Order[] = [
    { id: "O" + rid(), userName: "张明轩", userPhone: "13812345678", course: "高三数学冲刺班", courseType: "学科课", amount: 6800, source: "机构老用户", channel: "鼎团团", payMethod: "微信", status: "已支付", refundStatus: "无", plannerName: "李规划", createdAt: "2026-04-20 11:00" },
    { id: "O" + rid(), userName: "王小宇", userPhone: "13987654321", course: "少儿编程素养课", courseType: "素养课", amount: 3600, source: "规划师新拓", channel: "甄选", payMethod: "支付宝", status: "已支付", refundStatus: "无", plannerName: "李规划", createdAt: "2026-04-22 15:00" },
    { id: "O" + rid(), userName: "李思琪", userPhone: "13511112222", course: "物理体验课", courseType: "体验课", amount: 199, source: "规划师新拓", channel: "鼎团团", payMethod: "微信", status: "待支付", refundStatus: "无", plannerName: "李规划", createdAt: "2026-04-28 10:00" },
    { id: "O" + rid(), userName: "赵晓彤", userPhone: "13633334444", course: "艺考素养课", courseType: "素养课", amount: 12800, source: "规划师新拓", channel: "鼎团团", payMethod: "信用卡", status: "退费中", refundStatus: "退费中", plannerName: "李规划", createdAt: "2026-04-15 09:00" },
    { id: "O" + rid(), userName: "孙文博", userPhone: "13755556666", course: "英语口语班", courseType: "学科课", amount: 4800, source: "机构老用户", channel: "甄选", payMethod: "微信", status: "已退费", refundStatus: "已退费", plannerName: "李规划", createdAt: "2026-04-10 14:00" },
  ];

  const rules: ProfitRule[] = [
    {
      id: "R" + rid(),
      name: "2026 Q2 默认分成规则",
      version: "v1.0",
      status: "active",
      createdBy: "鼎校超管",
      createdAt: "2026-03-15 10:00",
      dims: {
        courseType: { weight: 0.4, ratios: { 学科课: { org: 60, planner: 30, platform: 10 }, 素养课: { org: 50, planner: 35, platform: 15 }, 体验课: { org: 40, planner: 50, platform: 10 } } },
        userSource: { weight: 0.3, ratios: { 机构老用户: { org: 70, planner: 20, platform: 10 }, 规划师新拓: { org: 40, planner: 50, platform: 10 } } },
        convStage: { weight: 0.3, ratios: { 试听转正价课: { org: 50, planner: 40, platform: 10 }, 续报课: { org: 65, planner: 25, platform: 10 } } },
      },
      history: [
        { time: "2026-03-10 14:00", action: "创建草稿", operator: "鼎校超管" },
        { time: "2026-03-12 09:00", action: "机构管理员短信验证通过", operator: "机构管理员" },
        { time: "2026-03-13 11:00", action: "审核通过", operator: "机构管理员" },
        { time: "2026-03-15 10:00", action: "启用（机构短信验证通过）", operator: "鼎校超管" },
      ],
    },
    {
      id: "R" + rid(),
      name: "2026 Q3 续报激励规则",
      version: "v1.1",
      status: "pending_audit",
      createdBy: "鼎校超管",
      createdAt: "2026-04-25 16:00",
      dims: { courseType: { weight: 0.5, ratios: { 学科课: { org: 55, planner: 35, platform: 10 }, 素养课: { org: 50, planner: 40, platform: 10 } } }, userSource: { weight: 0.5, ratios: { 机构老用户: { org: 65, planner: 25, platform: 10 }, 规划师新拓: { org: 35, planner: 55, platform: 10 } } } },
      history: [
        { time: "2026-04-25 16:00", action: "提交规则", operator: "鼎校超管" },
        { time: "2026-04-25 16:05", action: "机构管理员短信验证通过", operator: "机构管理员" },
      ],
    },
  ];

  const ledger: LedgerItem[] = [
    { id: "L" + rid(), orderId: orders[0].id, userName: "张明轩", course: "高三数学冲刺班", amount: 6800, orgAmount: 4080, plannerAmount: 2040, platformAmount: 680, status: "settled", plannerName: "李规划", settledAt: "2026-04-21 00:30" },
    { id: "L" + rid(), orderId: orders[1].id, userName: "王小宇", course: "少儿编程素养课", amount: 3600, orgAmount: 1620, plannerAmount: 1620, platformAmount: 360, status: "pending", plannerName: "李规划" },
    { id: "L" + rid(), orderId: orders[2].id, userName: "李思琪", course: "物理体验课", amount: 199, orgAmount: 80, plannerAmount: 99, platformAmount: 20, status: "estimated", plannerName: "李规划" },
    { id: "L" + rid(), orderId: orders[3].id, userName: "赵晓彤", course: "艺考素养课", amount: 12800, orgAmount: 5760, plannerAmount: 5760, platformAmount: 1280, status: "refund_pending", plannerName: "李规划" },
    { id: "L" + rid(), orderId: orders[4].id, userName: "孙文博", course: "英语口语班", amount: 4800, orgAmount: 2880, plannerAmount: 1440, platformAmount: 480, status: "abnormal", abnormalReason: "规划师账户余额不足，退回款待补齐", plannerName: "李规划" },
  ];

  const logs: AuditLog[] = [
    { id: rid(), time: "2026-04-28 10:00", operator: "李规划", role: "规划师", ip: "192.168.1.20", module: "服务记录", action: "新增", detail: "新增服务记录 #" + services[0].id },
    { id: rid(), time: "2026-04-28 11:30", operator: "机构管理员", role: "机构管理员", ip: "192.168.1.5", module: "分成规则", action: "短信验证通过", detail: "Q3 续报激励规则" },
    { id: rid(), time: "2026-04-28 18:30", operator: "机构管理员", role: "机构管理员", ip: "192.168.1.5", module: "台账", action: "导出", detail: "导出 4 月已结算明细 (脱敏)" },
  ];

  write(KEYS.service, services);
  write(KEYS.order, orders);
  write(KEYS.rule, rules);
  write(KEYS.ledger, ledger);
  write(KEYS.log, logs);
  localStorage.setItem(KEYS.seeded, "1");
}

export const db = {
  services: () => read<ServiceRecord[]>(KEYS.service, []),
  setServices: (v: ServiceRecord[]) => write(KEYS.service, v),
  orders: () => read<Order[]>(KEYS.order, []),
  setOrders: (v: Order[]) => write(KEYS.order, v),
  rules: () => read<ProfitRule[]>(KEYS.rule, []),
  setRules: (v: ProfitRule[]) => write(KEYS.rule, v),
  ledger: () => read<LedgerItem[]>(KEYS.ledger, []),
  setLedger: (v: LedgerItem[]) => write(KEYS.ledger, v),
  logs: () => read<AuditLog[]>(KEYS.log, []),
  setLogs: (v: AuditLog[]) => write(KEYS.log, v),
  auditMode: () => (localStorage.getItem(KEYS.auditMode) as "realtime" | "review") || "realtime",
  setAuditMode: (v: "realtime" | "review") => localStorage.setItem(KEYS.auditMode, v),
  log: (entry: Omit<AuditLog, "id" | "time" | "ip">) => {
    const logs = read<AuditLog[]>(KEYS.log, []);
    logs.unshift({ id: rid(), time: new Date().toLocaleString("zh-CN"), ip: "192.168.1." + (Math.floor(Math.random() * 200) + 1), ...entry });
    write(KEYS.log, logs.slice(0, 200));
  },
  reset: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    seedIfNeeded(true);
  },
  rid,
};