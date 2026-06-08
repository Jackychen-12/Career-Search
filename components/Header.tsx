"use client";

import { useEffect, useState } from "react";
import { getUser, isLoggedIn, login, logout, type GhUser } from "@/lib/auth";
import { hasPrefs } from "@/lib/ranking";
import { loadPrefs } from "@/lib/prefs";

export default function Header({
  total,
  onOpenTracking,
  onOpenPrefs,
}: {
  total: number;
  onOpenTracking?: () => void;
  onOpenPrefs?: () => void;
}) {
  const [user, setUser] = useState<GhUser | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setUser(getUser());
    setHasProfile(hasPrefs(loadPrefs()));
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-sm">
            <span className="text-xs font-bold text-white">C</span>
          </div>
          <span className="text-[15px] font-semibold text-gray-900">Career Search</span>
          <span className="hidden sm:inline text-[11px] text-gray-400 bg-gray-100/60 px-2 py-0.5 rounded-full">
            {total.toLocaleString()} 岗位
          </span>
        </div>

        <nav className="flex items-center gap-3 text-sm">
          {loggedIn && user ? (
            <>
              <a
                href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/profile/"}
                className={`text-[13px] transition ${
                  hasProfile ? "text-brand-600 font-medium" : "text-gray-500 hover:text-brand-600"
                }`}
              >
                {hasProfile ? "画像 ✓" : "建立画像"}
              </a>
              <a
                href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/report/"}
                className="text-[13px] text-gray-500 hover:text-brand-600 transition"
              >
                求职报告
              </a>
              <a
                href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/events/"}
                className="text-[13px] text-gray-500 hover:text-brand-600 transition"
              >
                宣讲活动
              </a>
              <button
                onClick={onOpenTracking}
                className="text-[13px] text-gray-500 hover:text-brand-600 transition"
              >
                我的投递
              </button>
              <button
                onClick={() => { logout(); setLoggedIn(false); setUser(null); }}
                className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white shadow-sm hover:ring-brand-200 transition"
                title={`${user.login} · 点击登出`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.avatar_url} alt={user.login} className="w-full h-full" />
              </button>
            </>
          ) : (
            <>
              <a
                href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/events/"}
                className="text-[13px] text-gray-500 hover:text-brand-600 transition"
              >
                宣讲活动
              </a>
              <button
                onClick={login}
                className="text-[13px] font-medium text-white px-3 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 shadow-sm transition"
              >
                登录
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
