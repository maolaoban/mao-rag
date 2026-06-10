import React from "react";
import { SvgIcon } from "../SvgIcon";
import { useAuth } from "@client/context/AuthContext";

type Page = "query" | "knowledge";

interface SidebarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
  onLoginClick: () => void;
}

const menu = [
  { name: "智能问答", icon: "question", page: "query" },
  { name: "知识库管理", icon: "database", page: "knowledge" },
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange, onLoginClick }) => {
  const { user, loading, signOut } = useAuth();

  return (
    <aside className="w-60 min-w-60 bg-[#1a1a2e] flex flex-col text-white h-screen">
      <div className="flex items-center gap-2.5 px-5 py-6 border-b border-white/8">
        <span className="text-lg font-bold tracking-wide">RAG智能问答系统</span>
      </div>
      <nav className="flex-1 px-2.5 py-3 flex flex-col gap-1">
        {menu.map((item) => (
          <button
            key={item.page}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 border-none text-sm font-medium cursor-pointer rounded-lg transition-all duration-150 text-left ${
              activePage === item.page
                ? "bg-indigo-500 text-white"
                : "bg-transparent text-white/70 hover:bg-white/6 hover:text-white"
            }`}
            onClick={() => onPageChange(item.page as Page)}
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <SvgIcon name={item.icon as any} />
            </span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/8">
        {loading ? (
          <span className="text-xs text-white/40">加载中...</span>
        ) : user ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-white/60 truncate" title={user.email}>
              {user.email}
            </span>
            <button
              className="text-xs text-white/50 bg-transparent border-none cursor-pointer hover:text-white/80 transition-colors text-left px-0"
              onClick={signOut}
            >
              退出登录
            </button>
          </div>
        ) : (
          <button
            className="w-full py-1.5 px-3 bg-white/10 border border-white/15 rounded-lg text-xs text-white/70 cursor-pointer transition-colors hover:bg-white/15 hover:text-white"
            onClick={onLoginClick}
          >
            登录
          </button>
        )}
        <div className="mt-2">
          <span className="text-xs text-white/40">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
