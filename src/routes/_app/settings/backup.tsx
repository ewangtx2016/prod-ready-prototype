import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/settings/backup")({ component: () => <Placeholder title="备份设置" prd="§11.2" desc="备份周期/范围配置；删除/恢复需短信验证；不加密不脱敏" /> });
