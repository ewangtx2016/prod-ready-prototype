import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/notification/wechat")({ component: () => <Placeholder title="社群模板" prd="§7.1" desc="微信/企业微信触达配置：模板消息、公众平台配置" /> });
