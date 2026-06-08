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
    <header className="nav-dark sticky top-0 z-40 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-400 to-indigo-500 grid place-items-center">
              <span className="text-[10px] font-bold text-white">CS</span>
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">Career Search</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 ml-3">
            <span className="text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
              {total.toLocaleString()} jobs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loggedIn && user ? (
            <>
              <button
                onClick={onOpenTracking}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                我的投递
              </button>
              <button
                onClick={() => { logout(); setLoggedIn(false); setUser(null); }}
                className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/20 hover:ring-cyan-400/50 transition"
                title={`${user.login} · 点击登出`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.avatar_url} alt={user.login} className="w-full h-full" />
              </button>
            </>
          ) : (
            <button
              onClick={login}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
