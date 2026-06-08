"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signInWithGitHub, signOut, getUser, type GhUser } from "@/lib/auth";
import { hasPrefs } from "@/lib/ranking";
import { loadPrefs } from "@/lib/prefs";

export default function Header({
  total,
  onOpenTracking,
  onOpenPrefs,
  onOpenWeekly,
}: {
  total: number;
  onOpenTracking?: () => void;
  onOpenPrefs?: () => void;
  onOpenWeekly?: () => void;
}) {
  const [user, setUser] = useState<GhUser | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      setLoggedIn(!!u);
      setHasProfile(hasPrefs(loadPrefs()));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        const u = await getUser();
        setUser(u);
        setLoggedIn(!!u);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setLoggedIn(false);
      }
    });

    return () => subscription.unsubscribe();
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
                className={`text-[13px] transition ${hasProfile ? "text-brand-600 font-medium" : "text-gray-500 hover:text-brand-600"}`}
              >
                {hasProfile ? "画像 ✓" : "建立画像"}
              </a>
              <button onClick={onOpenWeekly} className="text-[13px] text-gray-500 hover:text-brand-600 transition">
                投递清单
              </button>
              <a href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/report/"} className="text-[13px] text-gray-500 hover:text-brand-600 transition">
                求职报告
              </a>
              <a href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/events/"} className="text-[13px] text-gray-500 hover:text-brand-600 transition">
                宣讲活动
              </a>
              <button onClick={onOpenTracking} className="text-[13px] text-gray-500 hover:text-brand-600 transition">
                我的投递
              </button>
              <button
                onClick={() => { signOut().then(() => { setLoggedIn(false); setUser(null); }); }}
                className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white shadow-sm hover:ring-brand-200 transition"
                title={`${user.login} · 点击登出`}
              >
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt={user.login} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-brand-500 text-white grid place-items-center text-xs font-bold">
                    {user.login[0]?.toUpperCase()}
                  </div>
                )}
              </button>
            </>
          ) : (
            <>
              <a href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/events/"} className="text-[13px] text-gray-500 hover:text-brand-600 transition">
                宣讲活动
              </a>
              <button
                onClick={() => signInWithGitHub()}
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
