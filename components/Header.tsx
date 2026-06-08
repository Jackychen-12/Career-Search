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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-md bg-brand-500 text-white grid place-items-center font-bold text-sm">
            C
          </span>
          <span className="text-lg font-semibold tracking-tight">Career Search</span>
          <span className="hidden sm:inline text-xs text-gray-500 ml-1">
            {total} 个岗位
          </span>
        </div>

        <div className="flex-1" />

        <nav className="flex items-center gap-3 text-sm">
          {loggedIn && user ? (
            <>
              <button
                onClick={onOpenTracking}
                className="text-gray-600 hover:text-brand-600 transition"
              >
                我的投递
              </button>
              <button
                onClick={() => { logout(); setLoggedIn(false); setUser(null); }}
                className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 hover:border-brand-500 transition"
                title={`${user.login} · 点击登出`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.avatar_url} alt={user.login} className="w-full h-full" />
              </button>
            </>
          ) : (
            <button
              onClick={login}
              className="text-gray-600 hover:text-brand-600 transition"
            >
              登录
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
