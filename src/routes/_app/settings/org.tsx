import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/settings/org")({ component: () => <Placeholder title="机构信息" prd="§11.1" desc="品牌LOGO、机构名称、联系方式、重置密码" /> });
