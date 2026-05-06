import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
          鼎
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">正在进入管理后台</h1>
        <p className="mt-2 text-sm text-muted-foreground">如果页面没有自动跳转，请点击下方按钮进入数据看板。</p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          进入数据看板
        </Link>
      </div>
    </div>
  );
}
