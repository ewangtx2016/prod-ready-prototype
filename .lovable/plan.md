## 目标

按 PRD v1.3 详细版交付一个**可交互的高保真 Web 原型**，覆盖 4 类角色（鼎校超管 / 机构管理员 / 规划师 / 学管师），全量模块（P0+P1+P2），所有按钮、表单、弹框、确认框、短信验证、审核流均可点击触发，并在关键位置加 **Tip 注释**（带角色权限说明、PRD 章节锚点），方便研发后期对照。

## 技术与视觉

- TanStack Start + React + Tailwind + shadcn/ui，本地 mock 数据持久化到 `localStorage`（无需后端），所有"短信验证码"输入任意 6 位即通过。
- 视觉：企业级中后台 (Ant Design 风) — 主色蓝 `#1677FF`、紧凑表格、左侧折叠菜单、顶部面包屑 + 角色切换器。
- 全局组件：`<RoleSwitcher>`（顶栏）、`<PermissionTip>`（鼠标悬停展示按钮权限矩阵）、`<DevNote>`（页面级 PRD 章节注释，可一键隐藏）、`<SmsVerifyDialog>`（统一短信验证）、`<ConfirmDialog>`、`Sonner` Toast。

## 路由结构（TanStack file-based）

```
src/routes/
  __root.tsx                          // 根布局
  login.tsx                           // 模拟登录(4 测试账号一键登录)
  _app.tsx                            // 已登录布局: 侧栏+顶栏+角色切换器
  _app/index.tsx                      // 跳转到 /dashboard
  _app/dashboard.tsx                  // 数据看板 §5
  _app/service/records.tsx            // 服务记录-已填写/已通过/未通过 §6.2
  _app/service/audit.tsx              // 服务审核-待审核 §6.3
  _app/service/settings.tsx           // 审核模式配置 §6.4
  _app/notification/virtual-no.tsx    // 虚拟号 §7.1
  _app/notification/sms.tsx           // 短信模板
  _app/notification/wechat.tsx        // 社群模板
  _app/notification/email.tsx         // 邮件模板
  _app/notification/inbox.tsx         // 站内信 §7.2
  _app/sales/index.tsx                // 销售明细(全部/待支付/已支付/退费中/已退费 Tabs) §8
  _app/profit/rules.tsx               // 分成规则(5 状态 Tabs) §9.1
  _app/profit/dimensions.tsx          // 分成维度配置 §9.2
  _app/profit/audit.tsx               // 规则审核 §9.3
  _app/ledger/settled.tsx             // 已结算
  _app/ledger/pending.tsx             // 待结算
  _app/ledger/estimated.tsx           // 预估收入
  _app/ledger/refund.tsx              // 分账退回
  _app/ledger/abnormal.tsx            // 异常台账 §10
  _app/settings/org.tsx               // 机构信息 §11.1
  _app/settings/ip.tsx                // IP 白名单
  _app/settings/backup.tsx            // 备份设置 §11.2
  _app/settings/alert.tsx             // 操作预警 §11.3
  _app/role/index.tsx                 // 角色管理 §12
  _app/user/accounts.tsx              // 后台账号 §13
  _app/user/groups.tsx                // 用户组
  _app/audit-log.tsx                  // 审计日志(贯穿所有模块的留痕)
```

## 4 类角色权限演示（顶栏切换即时生效）

切换角色后：①侧栏菜单刷新 ②按钮显隐/置灰 ③表格数据范围过滤 ④Tip 注释更新。

| 角色 | 可见菜单 | 关键差异 |
|------|---------|---------|
| 鼎校超管 | 看板(授权)、分成规则(新增/编辑/启停)、审计 | 启停规则触发"向机构管理员发送短信验证"演示弹框 |
| 机构管理员 | 全模块 | 审核、短信验证、导出、备份删除/恢复 |
| 规划师 | 看板(个人)、服务记录(本人)、销售(本人)、台账(个人，导出带"仅供参考") | 无导出隐私数据权限 |
| 学管师 | 看板(个人服务)、服务记录(本人)、通知使用 | 不可见销售/分成/台账 |

## 关键交互（全部走真实弹框）

1. **服务记录提交修改申请** → 表单弹框填写原因 → 进入待审核 → 机构管理员"通过/驳回(必填原因)" → toast + 流转
2. **审核模式切换** → Confirm → 写入审计日志
3. **分成规则全生命周期**：鼎校超管"新增" → 维度+权重表单(校验 ΣW=1) → 提交 → **触发 SmsVerifyDialog (机构管理员视角)** → 进待审核 → 机构审核通过 → 待使用 → 鼎校"启用" → **再次 SmsVerify** → 使用中 → "停用" → SmsVerify → 已停用 → "重新启用" → SmsVerify → 使用中
4. **销售明细**：Tabs 切换、来源标记(机构老用户/规划师新拓 Badge)、退费状态只读
5. **台账导出**：导出按钮 → Confirm 提示脱敏规则 → 生成 mock CSV 下载 + 写入审计日志
6. **备份**：手动备份(进度条)、删除/恢复均触发 SmsVerify
7. **异常台账**：模拟一条"规划师账户余额不足"，进入页面顶部 Alert + 红色行高亮
8. **预警阈值**：表单设置(默认导出>3次/日)，触发预警时顶栏 Bell 红点 + 站内信

## Dev Tip 注释系统

- 每个页面顶部一个 `<DevNote>` 折叠卡片：PRD 章节号、模块说明、本页角色权限矩阵、待确认问题(Q编号)。
- 每个关键按钮包一层 `<PermissionTip>`：hover 显示"权限项 / 4 角色可用性 / PRD 锚点"。
- 全局开关："显示开发注释" Switch 存 localStorage，交付后客户可一键关闭，UI 即变成纯净生产形态。

## Mock 数据

`src/lib/mock/` 下分 `users.ts / services.ts / orders.ts / rules.ts / ledger.ts / logs.ts`，初始化时 seed 到 localStorage，所有 CRUD 走本地 store；提供"重置演示数据"按钮（设置页）。

## 待你确认（不阻塞，可在开发中回复）

1. **品牌**：是否提供"鼎校"Logo / 主色？默认用 `#1677FF` + 文字 Logo。
2. **指标池**：PRD §5.4 说指标池由运营后台维护，首期数量待定。原型先放 12 个示例指标(含默认 4 项 + 8 项可勾选)，可后续替换。
3. **学管师服务记录字段**：PRD Q6 待确认。原型先用通用字段(用户、服务类型[督学/打卡/答疑/社群]、内容、时长、附件)。
4. **订单字段**：PRD Q9-Q14 待确认。原型先用 §8.1 列出的 8 个字段。

以上若不回复，我将按上述默认值实现，可后续替换。

## 交付节奏（单轮完成）

一次性搭建路由壳 → 4 角色权限上下文 → 全部 30+ 页面 + 弹框 + mock 数据 + Tip 注释系统。完成后给出"演示脚本"说明如何按角色走完整业务流。