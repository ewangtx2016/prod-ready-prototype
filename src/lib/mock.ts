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
  /** 记录类型：交付类(绑定订单) / 日常跟进(售前或一般沟通) */
  recordType?: "delivery" | "presales";
  /** 关联订单 id（可多个，仅 delivery 类有意义） */
  orderIds?: string[];
  /** 服务附件：图片 / 视频 / 文件 */
  attachments?: ServiceAttachment[];
  // 修改申请
  pendingChange?: { reason: string; newContent: string; submittedAt: string };
  rejectReason?: string;
};

export type ServiceAttachment = {
  id: string;
  type: "image" | "video" | "file";
  name: string;
  url: string;
  /** 文件大小（字节，可选；mock 用） */
  size?: number;
  /** 视频/图片 缩略图（可选） */
  thumb?: string;
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
  orgName: string;
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
  /** 操作前快照（JSON），可选 */
  before?: any;
  /** 操作后快照（JSON），可选 */
  after?: any;
};

/** 服务记录审核规则（仅在「需要审核」模式下生效） */
export type ReviewRuleType = "sensitive_word" | "duration" | "frequency" | "amount";

export type ReviewRule = {
  id: string;
  type: ReviewRuleType;
  name: string;
  enabled: boolean;
  /** 类型化配置（按 type 解释） */
  config: {
    /** sensitive_word: 词列表 */
    words?: string[];
    /** duration: 时长（分钟） */
    minMinutes?: number;
    maxMinutes?: number;
    /** frequency: 时窗（小时）+ 次数 */
    windowHours?: number;
    maxCount?: number;
    /** amount: 单笔金额上下限（元） */
    minAmount?: number;
    maxAmount?: number;
  };
  /** 命中后通知方式：站内信 / 短信 / 社群（企业微信、飞书群等） */
  notify: { inbox: boolean; sms: boolean; group: boolean };
  updatedBy: string;
  updatedAt: string;
};

// 兼容旧引用
export type AlertRule = ReviewRule;
export type AlertRuleType = ReviewRuleType;

/** 通知事件：把"业务事件 → 渠道 → 模板"集中绑定，业务页只引用事件 key */
export type NotifyChannelKey = "inbox" | "sms" | "group" | "email";
export type NotifyEvent = {
  key: string;            // 业务代码引用，唯一
  name: string;           // 中文名
  category: "服务审核" | "操作预警" | "续报提醒" | "财务结算" | "账号安全" | "数据备份";
  description: string;
  recipients: string[];   // 角色 key 列表
  channels: Record<NotifyChannelKey, { enabled: boolean; templateId?: string }>;
  system: boolean;        // 系统预设（不可删除，可改）
  /** 事件总开关：关闭后所有渠道都不发送 */
  enabled?: boolean;
  /** 触发阈值（仅"操作预警"类事件使用） */
  threshold?: { value: number; unit: string };
  updatedBy?: string;
  updatedAt?: string;
};

const KEYS = {
  service: "demo.services",
  order: "demo.orders",
  rule: "demo.rules",
  ledger: "demo.ledger",
  log: "demo.logs",
  seeded: "demo.seeded.v8",
  // 注：模型变更需提升版本以触发重置
  auditMode: "demo.auditMode",
  alertRule: "demo.alertRules",
  notifyEvent: "demo.notifyEvents",
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
    { id: rid(), userName: "周俊辉", userPhone: "13822221111", serviceType: "沟通", content: "电话回访高考志愿规划方案，家长确认主选 985 工科，同步推荐冲刺一对一。", duration: 40, createdBy: "李规划", createdByRole: "planner", createdAt: "2026-04-22 11:10", status: "approved" },
    { id: rid(), userName: "陈雨桐", userPhone: "13966667777", serviceType: "答疑", content: "答疑高一化学方程式配平 3 道，已发讲解视频。", duration: 25, createdBy: "陈学管", createdByRole: "tutor", createdAt: "2026-04-23 19:40", status: "approved" },
    { id: rid(), userName: "吴泽凯", userPhone: "13700008888", serviceType: "督学", content: "督学连续 7 天打卡完成，奖励学分 +20。", duration: 12, createdBy: "陈学管", createdByRole: "tutor", createdAt: "2026-04-24 21:30", status: "approved" },
    { id: rid(), userName: "黄诗涵", userPhone: "13599998888", serviceType: "沟通", content: "家长来电咨询艺考集训费用结构，已发送报价单与课程大纲。", duration: 35, createdBy: "李规划", createdByRole: "planner", createdAt: "2026-04-26 15:00", status: "pending_audit", pendingChange: { reason: "用户姓名拼写错误，需修正", newContent: "家长来电咨询艺考集训费用结构，已发送报价单与课程大纲；用户姓名修正为 黄诗晗。", submittedAt: "2026-04-27 09:20" } },
    { id: rid(), userName: "林梓豪", userPhone: "13422223333", serviceType: "答疑", content: "答疑初三物理电路图分析，约 30 分钟。", duration: 30, createdBy: "陈学管", createdByRole: "tutor", createdAt: "2026-04-27 20:10", status: "pending_audit", pendingChange: { reason: "时长录入有误，实际为 45 分钟", newContent: "答疑初三物理电路图分析，含 2 道拓展题，实际 45 分钟。", submittedAt: "2026-04-28 08:30" } },
    { id: rid(), userName: "苏婉清", userPhone: "13311114444", serviceType: "社群", content: "组织社群早读打卡，参与 28 人。", duration: 20, createdBy: "陈学管", createdByRole: "tutor", createdAt: "2026-04-28 07:30", status: "pending_audit", pendingChange: { reason: "补充服务对象明细", newContent: "组织社群早读打卡，参与 28 人，重点跟进 5 名落后学员。", submittedAt: "2026-04-28 22:00" } },
  ];
  // 存量服务记录默认全部标记为「日常跟进」（无订单绑定）
  services.forEach((s) => { s.recordType = "presales"; s.orderIds = []; });

  // 演示用附件：图片 / 视频 / 文件（外链 mock）
  const PIC = (seed: string) => `https://picsum.photos/seed/${seed}/800/600`;
  const PIC_THUMB = (seed: string) => `https://picsum.photos/seed/${seed}/200/150`;
  const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
  if (services[0]) services[0].attachments = [
    { id: rid(), type: "image", name: "作业反馈截图1.png", url: PIC("svc1a"), thumb: PIC_THUMB("svc1a"), size: 184320 },
    { id: rid(), type: "image", name: "作业反馈截图2.png", url: PIC("svc1b"), thumb: PIC_THUMB("svc1b"), size: 220160 },
    { id: rid(), type: "file", name: "数学应用题加练计划.pdf", url: "#mock-pdf", size: 524288 },
  ];
  if (services[2]) services[2].attachments = [
    { id: rid(), type: "image", name: "浮力题板书.jpg", url: PIC("svc3a"), thumb: PIC_THUMB("svc3a"), size: 312000 },
    { id: rid(), type: "video", name: "答疑录屏.mp4", url: SAMPLE_VIDEO, thumb: PIC_THUMB("svcv1"), size: 4 * 1024 * 1024 },
  ];
  if (services[6]) services[6].attachments = [
    { id: rid(), type: "video", name: "化学方程式讲解.mp4", url: SAMPLE_VIDEO, thumb: PIC_THUMB("svcv2"), size: 6 * 1024 * 1024 },
    { id: rid(), type: "file", name: "配平习题.docx", url: "#mock-doc", size: 81920 },
  ];

  const orders: Order[] = [
    { id: "O" + rid(), userName: "张明轩", userPhone: "13812345678", course: "高三数学冲刺班", courseType: "学科课", amount: 6800, source: "机构老用户", channel: "鼎团团", payMethod: "微信", status: "已支付", refundStatus: "无", plannerName: "李规划", orgName: "启明教育", createdAt: "2026-04-20 11:00" },
    { id: "O" + rid(), userName: "王小宇", userPhone: "13987654321", course: "少儿编程素养课", courseType: "素养课", amount: 3600, source: "规划师新拓", channel: "甄选", payMethod: "支付宝", status: "已支付", refundStatus: "无", plannerName: "王规划", orgName: "启明教育", createdAt: "2026-04-22 15:00" },
    { id: "O" + rid(), userName: "李思琪", userPhone: "13511112222", course: "物理体验课", courseType: "体验课", amount: 199, source: "规划师新拓", channel: "鼎团团", payMethod: "微信", status: "待支付", refundStatus: "无", plannerName: "李规划", orgName: "卓越学堂", createdAt: "2026-04-28 10:00" },
    { id: "O" + rid(), userName: "赵晓彤", userPhone: "13633334444", course: "艺考素养课", courseType: "素养课", amount: 12800, source: "规划师新拓", channel: "鼎团团", payMethod: "信用卡", status: "退费中", refundStatus: "退费中", plannerName: "周规划", orgName: "启明教育", createdAt: "2026-04-15 09:00" },
    { id: "O" + rid(), userName: "孙文博", userPhone: "13755556666", course: "英语口语班", courseType: "学科课", amount: 4800, source: "机构老用户", channel: "甄选", payMethod: "微信", status: "已退费", refundStatus: "已退费", plannerName: "李规划", orgName: "卓越学堂", createdAt: "2026-04-10 14:00" },
  ];

  // 演示用「交付类」服务记录，绑定到具体订单
  const deliveryServices: ServiceRecord[] = [
    { id: rid(), userName: orders[0].userName, userPhone: orders[0].userPhone, serviceType: "督学", content: "高三数学冲刺班开课首周督学，确认每日刷题计划。", duration: 25, createdBy: "陈学管", createdByRole: "tutor", createdAt: "2026-04-21 20:30", status: "approved", recordType: "delivery", orderIds: [orders[0].id], attachments: [
      { id: rid(), type: "image", name: "刷题计划表.png", url: PIC("d1a"), thumb: PIC_THUMB("d1a"), size: 256000 },
      { id: rid(), type: "image", name: "首周打卡截图.png", url: PIC("d1b"), thumb: PIC_THUMB("d1b"), size: 198000 },
    ] },
    { id: rid(), userName: orders[0].userName, userPhone: orders[0].userPhone, serviceType: "答疑", content: "数学函数综合题答疑 4 道，已发送视频讲解。", duration: 35, createdBy: "陈学管", createdByRole: "tutor", createdAt: "2026-04-25 19:00", status: "approved", recordType: "delivery", orderIds: [orders[0].id], attachments: [
      { id: rid(), type: "video", name: "函数题讲解.mp4", url: SAMPLE_VIDEO, thumb: PIC_THUMB("d2v"), size: 8 * 1024 * 1024 },
      { id: rid(), type: "file", name: "函数综合题.pdf", url: "#mock-pdf", size: 614400 },
    ] },
    { id: rid(), userName: orders[1].userName, userPhone: orders[1].userPhone, serviceType: "沟通", content: "少儿编程素养课入学沟通，确认上课时间与班级群。", duration: 20, createdBy: "李规划", createdByRole: "planner", createdAt: "2026-04-23 10:00", status: "approved", recordType: "delivery", orderIds: [orders[1].id], attachments: [
      { id: rid(), type: "image", name: "班级群二维码.png", url: PIC("d3a"), thumb: PIC_THUMB("d3a"), size: 102400 },
    ] },
    { id: rid(), userName: orders[3].userName, userPhone: orders[3].userPhone, serviceType: "沟通", content: "艺考素养课退费沟通，已记录原因并提交退费流程。", duration: 30, createdBy: "李规划", createdByRole: "planner", createdAt: "2026-04-26 16:30", status: "approved", recordType: "delivery", orderIds: [orders[3].id], attachments: [
      { id: rid(), type: "file", name: "退费申请书.pdf", url: "#mock-pdf", size: 245760 },
      { id: rid(), type: "file", name: "沟通录音.m4a", url: "#mock-audio", size: 1048576 },
    ] },
  ];
  services.push(...deliveryServices);

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
    { id: rid(), time: "2026-04-28 09:55", operator: "李规划", role: "规划师", ip: "192.168.1.20", module: "登录", action: "登录成功", detail: "Web 端账号密码登录", before: null, after: { method: "password", device: "Chrome/Windows", location: "北京" } },
    { id: rid(), time: "2026-04-28 09:52", operator: "王老师", role: "辅导老师", ip: "10.0.3.18", module: "登录", action: "登录失败", detail: "密码错误（第 2 次）", before: null, after: { method: "password", reason: "wrong_password", attempts: 2 } },
    { id: rid(), time: "2026-04-28 08:40", operator: "机构管理员", role: "机构管理员", ip: "192.168.1.5", module: "登录", action: "登录成功", detail: "短信验证码登录 · 新设备", before: null, after: { method: "sms", device: "Safari/iPhone", location: "北京", newDevice: true } },
    { id: rid(), time: "2026-04-28 08:30", operator: "鼎校超管", role: "超级管理员", ip: "203.0.113.7", module: "登录", action: "登录成功", detail: "Web 端账号密码登录", before: null, after: { method: "password", device: "Chrome/macOS", location: "上海" } },
    { id: rid(), time: "2026-04-27 19:10", operator: "李规划", role: "规划师", ip: "192.168.1.20", module: "登录", action: "退出登录", detail: "用户主动退出", before: null, after: null },
    { id: rid(), time: "2026-04-28 10:00", operator: "李规划", role: "规划师", ip: "192.168.1.20", module: "服务记录", action: "新增", detail: "新增服务记录 #" + services[0].id, before: null, after: { id: services[0].id, userName: "张明轩", serviceType: "沟通", duration: 30 } },
    { id: rid(), time: "2026-04-28 11:30", operator: "机构管理员", role: "机构管理员", ip: "192.168.1.5", module: "分成规则", action: "短信验证通过", detail: "Q3 续报激励规则", before: { status: "draft" }, after: { status: "pending_audit" } },
    { id: rid(), time: "2026-04-28 18:30", operator: "机构管理员", role: "机构管理员", ip: "192.168.1.5", module: "台账", action: "导出", detail: "导出 4 月已结算明细 (脱敏)", before: null, after: { exportType: "已结算", month: "2026-04", rows: 128, masked: true } },
  ];

  write(KEYS.service, services);
  write(KEYS.order, orders);
  write(KEYS.rule, rules);
  write(KEYS.ledger, ledger);
  write(KEYS.log, logs);

  const alertRules: AlertRule[] = [
    { id: rid(), type: "sensitive_word", name: "敏感词 · 投诉/退费/转介", enabled: true, config: { words: ["投诉", "退费", "转介", "举报", "差评"] }, notify: { inbox: true, sms: false, group: false }, updatedBy: "鼎校超管", updatedAt: "2026-04-20 10:00" },
    { id: rid(), type: "duration", name: "服务时长异常（<5min 或 >240min）", enabled: true, config: { minMinutes: 5, maxMinutes: 240 }, notify: { inbox: true, sms: false, group: false }, updatedBy: "鼎校超管", updatedAt: "2026-04-20 10:00" },
    { id: rid(), type: "frequency", name: "同一用户 24h 内服务 > 5 次", enabled: true, config: { windowHours: 24, maxCount: 5 }, notify: { inbox: true, sms: false, group: true }, updatedBy: "鼎校超管", updatedAt: "2026-04-20 10:00" },
    { id: rid(), type: "amount", name: "单笔金额异常（< 1 元 或 > 50000 元）", enabled: true, config: { minAmount: 1, maxAmount: 50000 }, notify: { inbox: true, sms: true, group: true }, updatedBy: "鼎校超管", updatedAt: "2026-04-20 10:00" },
  ];
  write(KEYS.alertRule, alertRules);

  const events: NotifyEvent[] = [
    { key: "service.audit.hit", name: "服务审核 · 命中规则", category: "服务审核", description: "服务记录命中任一审核规则时触发，提醒管理员处理。", recipients: ["org_admin"], channels: { inbox: { enabled: true }, sms: { enabled: false }, group: { enabled: false }, email: { enabled: false } }, system: true, updatedBy: "鼎校超管", updatedAt: "2026-04-20 10:00" },
    { key: "service.audit.pass", name: "服务审核 · 审核通过", category: "服务审核", description: "审核通过后通知服务创建人。", recipients: ["planner", "tutor"], channels: { inbox: { enabled: true }, sms: { enabled: false }, group: { enabled: false }, email: { enabled: false } }, system: true },
    { key: "service.audit.reject", name: "服务审核 · 审核驳回", category: "服务审核", description: "审核驳回后通知服务创建人。", recipients: ["planner", "tutor"], channels: { inbox: { enabled: true }, sms: { enabled: true }, group: { enabled: false }, email: { enabled: false } }, system: true },
    { key: "alert.export.bulk", name: "操作预警 · 单日导出超阈值", category: "操作预警", description: "敏感数据批量导出次数超阈值。", recipients: ["org_admin", "super_admin"], channels: { inbox: { enabled: true }, sms: { enabled: true }, group: { enabled: false }, email: { enabled: false } }, system: true, enabled: true, threshold: { value: 5, unit: "次/日" } },
    { key: "alert.split.abnormal", name: "操作预警 · 异常分账", category: "操作预警", description: "异常分账次数超阈值。", recipients: ["org_admin", "super_admin"], channels: { inbox: { enabled: true }, sms: { enabled: true }, group: { enabled: false }, email: { enabled: true } }, system: true, enabled: true, threshold: { value: 3, unit: "次/日" } },
    { key: "alert.audit.reject_rate", name: "操作预警 · 服务记录驳回率", category: "操作预警", description: "服务记录驳回率超阈值。", recipients: ["org_admin"], channels: { inbox: { enabled: true }, sms: { enabled: false }, group: { enabled: false }, email: { enabled: false } }, system: true, enabled: false, threshold: { value: 30, unit: "%" } },
    { key: "alert.login.failure", name: "操作预警 · 登录失败次数", category: "操作预警", description: "登录失败次数超阈值。", recipients: ["org_admin"], channels: { inbox: { enabled: false }, sms: { enabled: true }, group: { enabled: false }, email: { enabled: false } }, system: true, enabled: true, threshold: { value: 5, unit: "次/小时" } },
    { key: "backup.failed", name: "数据备份 · 备份失败", category: "数据备份", description: "任意备份目标写入失败时触发。", recipients: ["org_admin"], channels: { inbox: { enabled: true }, sms: { enabled: true }, group: { enabled: false }, email: { enabled: true } }, system: true, enabled: true, threshold: { value: 1, unit: "次/日" } },
    { key: "backup.capacity", name: "数据备份 · 目标容量超阈值", category: "数据备份", description: "任一备份目标占用空间超过阈值时触发。", recipients: ["org_admin"], channels: { inbox: { enabled: true }, sms: { enabled: false }, group: { enabled: false }, email: { enabled: true } }, system: true, enabled: true, threshold: { value: 80, unit: "%" } },
    { key: "backup.success", name: "数据备份 · 备份成功", category: "数据备份", description: "自动/手动备份成功完成时触发。", recipients: ["org_admin"], channels: { inbox: { enabled: true }, sms: { enabled: false }, group: { enabled: false }, email: { enabled: false } }, system: true, enabled: false },
    { key: "backup.restore", name: "数据备份 · 数据恢复", category: "数据备份", description: "管理员发起或完成数据恢复（覆盖当前数据库）时触发。", recipients: ["org_admin", "super_admin"], channels: { inbox: { enabled: true }, sms: { enabled: true }, group: { enabled: false }, email: { enabled: true } }, system: true, enabled: true },
    { key: "renewal.expiring.7d", name: "续报提醒 · 7 天到期", category: "续报提醒", description: "课程将于 7 天内到期，提醒家长续报。", recipients: ["planner"], channels: { inbox: { enabled: true }, sms: { enabled: true }, group: { enabled: true }, email: { enabled: false } }, system: true },
    { key: "settlement.arrived", name: "财务 · 分润到账", category: "财务结算", description: "结算款到账后通知规划师。", recipients: ["planner"], channels: { inbox: { enabled: true }, sms: { enabled: true }, group: { enabled: false }, email: { enabled: true } }, system: true },
    { key: "ledger.abnormal", name: "财务 · 异常台账", category: "财务结算", description: "出现异常台账时通知机构管理员。", recipients: ["org_admin"], channels: { inbox: { enabled: true }, sms: { enabled: false }, group: { enabled: false }, email: { enabled: true } }, system: true },
    { key: "account.login.newDevice", name: "账号安全 · 新设备登录", category: "账号安全", description: "账号在新设备登录时通知本人。", recipients: ["org_admin", "super_admin", "planner", "tutor"], channels: { inbox: { enabled: true }, sms: { enabled: true }, group: { enabled: false }, email: { enabled: false } }, system: true },
  ];
  write(KEYS.notifyEvent, events);

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
  alertRules: () => read<AlertRule[]>(KEYS.alertRule, []),
  setAlertRules: (v: AlertRule[]) => write(KEYS.alertRule, v),
  notifyEvents: () => read<NotifyEvent[]>(KEYS.notifyEvent, []),
  setNotifyEvents: (v: NotifyEvent[]) => write(KEYS.notifyEvent, v),
  notifyEvent: (key: string) => read<NotifyEvent[]>(KEYS.notifyEvent, []).find((e) => e.key === key),
  log: (entry: Omit<AuditLog, "id" | "time" | "ip">) => {
    const logs = read<AuditLog[]>(KEYS.log, []);
    logs.unshift({ id: rid(), time: new Date().toLocaleString("zh-CN"), ip: "192.168.1." + (Math.floor(Math.random() * 200) + 1), ...entry });
    write(KEYS.log, logs.slice(0, 200));
  },
  addService: (s: ServiceRecord) => {
    const list = read<ServiceRecord[]>(KEYS.service, []);
    list.unshift(s);
    write(KEYS.service, list);
  },
  reset: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    seedIfNeeded(true);
  },
  rid,
};