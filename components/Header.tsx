"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signInWithGitHub, signOut, getUser, type GhUser } from "@/lib/auth";
import { hasPrefs } from "@/lib/ranking";
import { loadPrefs } from "@/lib/prefs";

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button onClick={toggle} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition" title={dark ? "切换亮色" : "切换暗色"}>
      {dark ? "☀" : "☾"}
    </button>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);

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

  const navItems = loggedIn && user ? [
    { label: hasProfile ? "画像 ✓" : "建立画像", href: "/profile/", highlight: !hasProfile },
    { label: "投递清单", onClick: onOpenWeekly },
    { label: "求职报告", href: "/report/" },
    { label: "AI 工具", href: "/skills/" },
    { label: "宣讲活动", href: "/events/" },
    { label: "我的投递", onClick: onOpenTracking },
  ] : [
    { label: "宣讲活动", href: "/events/" },
  ];

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

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-3 text-sm">
          {navItems.map((item) =>
            item.href ? (
              <a key={item.label} href={item.href} className={`text-[13px] transition ${item.highlight ? "text-brand-600 font-medium" : "text-gray-500 hover:text-brand-600"}`}>{item.label}</a>
            ) : (
              <button key={item.label} onClick={item.onClick} className="text-[13px] text-gray-500 hover:text-brand-600 transition">{item.label}</button>
            )
          )}
          <ThemeToggle />
          {loggedIn && user ? (
            <button
              onClick={() => signOut().then(() => { setLoggedIn(false); setUser(null); })}
              className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white shadow-sm hover:ring-brand-200 transition"
              title={`${user.login} · 点击登出`}
            >
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt={user.login} className="w-full h-full" />
              ) : (
                <div className="w-full h-full bg-brand-500 text-white grid place-items-center text-xs font-bold">{user.login[0]?.toUpperCase()}</div>
              )}
            </button>
          ) : (
            <button onClick={() => signInWithGitHub()} className="text-[13px] font-medium text-white px-3 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 shadow-sm transition">登录</button>
          )}
        </nav>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {navItems.map((item) =>
            item.href ? (
              <a key={item.label} href={item.href} className="block py-2 text-sm text-gray-700 hover:text-brand-600" onClick={() => setMenuOpen(false)}>{item.label}</a>
            ) : (
              <button key={item.label} onClick={() => { item.onClick?.(); setMenuOpen(false); }} className="block w-full text-left py-2 text-sm text-gray-700 hover:text-brand-600">{item.label}</button>
            )
          )}
          {loggedIn ? (
            <button onClick={() => { signOut(); setMenuOpen(false); }} className="block w-full text-left py-2 text-sm text-red-500">退出登录</button>
          ) : (
            <button onClick={() => { signInWithGitHub(); setMenuOpen(false); }} className="block w-full text-left py-2 text-sm font-medium text-brand-600">GitHub 登录</button>
          )}
        </div>
      )}
    </header>
  );
}
