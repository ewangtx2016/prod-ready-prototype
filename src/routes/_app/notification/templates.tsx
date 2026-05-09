import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dev/PageHeader";
import { TemplateCrud } from "@/components/dev/TemplateCrud";

export const Route = createFileRoute("/_app/notification/templates")({
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader
        title="通知模板"
        subtitle="虚拟号、短信、社群、邮件通过第三方平台进行配置；本页仅维护站内信模板。"
      />
      <TemplateCrud
        storageKey="demo.tpl.inbox.v2"
        channel="站内信"
        prd="§7.2"
        title=""
        subtitle=""
        helpers={["用户姓名", "机构名称", "课程名称", "订单金额", "分润金额", "结算月份", "到期日期", "操作链接"]}
        sample={[
          { id: "T1", key: "sys_audit_pending", name: "审核待处理通知", content: "{{用户姓名}} 提交了新规则，请尽快前往审核：{{操作链接}}", channel: "站内信", auto: true, createdAt: "2026-04-01 10:00" },
          { id: "T2", key: "sys_settlement_done", name: "账单生成提醒", content: "{{结算月份}} 账单已生成，订单金额 ¥{{订单金额}}，请到「已结算台账」查看。", channel: "站内信", auto: true, createdAt: "2026-04-10 09:00" },
          { id: "T3", key: "sys_split_abnormal", name: "异常分账预警", content: "订单分账失败：{{课程名称}}，金额 ¥{{分润金额}}，请尽快处理：{{操作链接}}", channel: "站内信", auto: true, createdAt: "2026-04-15 14:00" },
        ]}
      />
    </div>
  );
}