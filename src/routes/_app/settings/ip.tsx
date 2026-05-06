import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/settings/ip")({ component: () => <Placeholder title="IP 白名单" prd="§11.1" desc="限制机构后台访问来源 IP" /> });
