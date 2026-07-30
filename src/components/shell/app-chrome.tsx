import { BrandMark, ModuleNav } from "@/components/shell/module-nav";
import { UserMenu } from "@/components/shell/user-menu";

type AppChromeProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

/** 登录后顶栏：品牌标识 · 首页+四大模块 · 头像菜单 */
export function AppChrome({ user }: AppChromeProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--panel)]/90 backdrop-blur-md">
      <div className="app-shell-width mx-auto flex items-center gap-3 py-2.5">
        <BrandMark />
        <ModuleNav />
        <div className="shrink-0">
          <UserMenu name={user.name} email={user.email} image={user.image} />
        </div>
      </div>
    </header>
  );
}
