import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/notification/virtual-no")({ component: () => <Placeholder title="虚拟号配置" prd="§7.1" desc="号码池配置：范围、数量、有效期、绑定用户、呼叫限制、号码隐匿" /> });
