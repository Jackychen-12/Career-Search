"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signInWithGitHub, signOut, getUser, type GhUser } from "@/lib/auth";
import { hasPrefs } from "@/lib/ranking";
import { loadPrefs, savePrefs } from "@/lib/prefs";

function NotifyBell() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const prefs = loadPrefs();
    setEmail(prefs.notifyEmail ?? "");
    setEnabled(prefs.notifyEnabled ?? false);
  }, []);

  function save() {
    const prefs = loadPrefs();
    const updated = { ...prefs, notifyEmail: email, notifyEnabled: enabled };
    savePrefs(updated);
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${enabled ? "text-brand-600 bg-brand-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
        title="邮件推送设置"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {enabled && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-500" />}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-72 card p-4 shadow-lg z-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">每日岗位推送</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-brand-500" />
              <span className="text-xs text-gray-600">{enabled ? "开" : "关"}</span>
            </label>
          </div>
          {enabled && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="输入接收邮箱"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
            />
          )}
          <button onClick={save} className="w-full py-2 rounded-lg text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 transition">
            {saved ? "已保存 ✓" : "保存"}
          </button>
          <p className="text-[10px] text-gray-400">每天早上推送与你画像匹配的新增岗位，可随时关闭。</p>
        </div>
      )}
    </div>
  );
}

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
    { label: "求职报告", href: "/report/" },
    { label: "AI 工具", href: "/skills/" },
    { label: "时间线", href: "/timeline/" },
    { label: "宣讲活动", href: "/events/" },
    { label: "我的投递", href: "/timeline/" },
  ] : [
    { label: "宣讲活动", href: "/events/" },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-sm">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-sm group-hover:shadow-md transition">
            <span className="text-xs font-bold text-white">C</span>
          </div>
          <span className="text-[15px] font-semibold text-gray-900 group-hover:text-brand-600 transition">Career Search</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-gray-400 bg-gray-100/60 px-2 py-0.5 rounded-full">
            {total.toLocaleString()} 岗位
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-3 text-sm">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className={`text-[13px] transition ${item.highlight ? "text-brand-600 font-medium" : "text-gray-500 hover:text-brand-600"}`}>{item.label}</a>
          ))}
          {loggedIn && <NotifyBell />}
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
            <a key={item.label} href={item.href} className="block py-2 text-sm text-gray-700 hover:text-brand-600" onClick={() => setMenuOpen(false)}>{item.label}</a>
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
