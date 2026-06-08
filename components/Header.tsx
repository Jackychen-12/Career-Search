"use client";

import { useEffect, useState } from "react";
import { getUser, isLoggedIn, login, logout, type GhUser } from "@/lib/auth";

export default function Header({ total, onOpenTracking }: { total: number; onOpenTracking?: () => void }) {
  const [user, setUser] = useState<GhUser | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setUser(getUser());
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold tracking-tight text-gray-900">
            Career<span className="text-brand-500">Search</span>
          </h1>
          <span className="hidden sm:inline-flex text-[11px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            {total} 岗位
          </span>
        </div>

        <div className="flex items-center gap-2">
          {loggedIn && user ? (
            <>
              <button
                onClick={onOpenTracking}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              >
                我的投递
              </button>
              <button
                onClick={() => { logout(); setLoggedIn(false); setUser(null); }}
                className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 hover:border-gray-400 transition"
                title={`${user.login} · 点击登出`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.avatar_url} alt={user.login} className="w-full h-full" />
              </button>
            </>
          ) : (
            <button
              onClick={login}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
            >
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
