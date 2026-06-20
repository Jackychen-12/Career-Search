"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signInWithGitHub, sendMagicLink, signOut, getUser, type GhUser } from "@/lib/auth";
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
  onOpenPrefs,
  onOpenWeekly,
}: {
  total: number;
  onOpenPrefs?: () => void;
  onOpenWeekly?: () => void;
}) {
  const [user, setUser] = useState<GhUser | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleEmailAuth() {
    setLoginErr("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setLoginErr("请输入有效的邮箱地址");
      return;
    }
    setLoginLoading(true);
    try {
      await sendMagicLink(loginEmail);
      setEmailSent(true);
      setCooldown(60);
    } catch (e) {
      setLoginErr((e as Error).message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleGitHubAuth() {
    try {
      await signInWithGitHub();
      setShowLogin(false);
    } catch (e) {
      setLoginErr((e as Error).message);
    }
  }

  function openLogin() {
    setLoginErr("");
    setLoginEmail("");
    setEmailSent(false);
    setShowLogin(true);
  }

  const navItems = loggedIn && user ? [
    { label: hasProfile ? "画像 ✓" : "建立画像", href: "/profile/", highlight: !hasProfile },
    { label: "求职报告", href: "/report/" },
    { label: "AI 工具", href: "/skills/" },
    { label: "投递 & 面试", href: "/timeline/" },
    { label: "宣讲活动", href: "/events/" },
  ] : [
    { label: "宣讲活动", href: "/events/" },
    { label: "投递 & 面试", href: "/timeline/" },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-sm group-hover:shadow-md transition">
            <span className="text-xs font-bold text-white">C</span>
          </div>
          <span className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition tracking-tight">Career Search</span>
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
            <button onClick={() => openLogin()} className="text-[13px] font-medium text-white px-3 py-1.5 rounded-full bg-brand-500 hover:bg-brand-600 shadow-sm transition">登录</button>
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
            <button onClick={() => { openLogin(); setMenuOpen(false); }} className="block w-full text-left py-2 text-sm font-medium text-brand-600">登录</button>
          )}
        </div>
      )}

      {/* Login modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowLogin(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 text-center">登录</h2>

            {emailSent ? (
              <div className="text-center space-y-3 py-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-green-50 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700">验证邮件已发送至</p>
                <p className="text-sm font-semibold text-gray-900">{loginEmail}</p>
                <p className="text-xs text-gray-400">请查收邮箱并点击链接完成登录</p>
                <p className="text-xs text-amber-500">如未收到，请检查垃圾箱/Spam 文件夹</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleEmailAuth}
                    disabled={cooldown > 0}
                    className="text-xs text-brand-600 hover:text-brand-700 disabled:text-gray-300"
                  >
                    {cooldown > 0 ? `重新发送 (${cooldown}s)` : "重新发送"}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => { setEmailSent(false); setLoginEmail(""); }}
                    className="text-xs text-brand-600 hover:text-brand-700"
                  >
                    使用其他邮箱
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="输入邮箱地址"
                  onKeyDown={(e) => e.key === "Enter" && loginEmail && handleEmailAuth()}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
                />
                {loginErr && <p className="text-xs text-red-500">{loginErr}</p>}
                <button
                  onClick={handleEmailAuth}
                  disabled={loginLoading || !loginEmail}
                  className="w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
                >
                  {loginLoading ? "发送中..." : "发送验证邮件"}
                </button>
                <p className="text-center text-[11px] text-gray-400">无需注册，输入邮箱即可收到登录链接</p>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">或</span></div>
            </div>

            <button
              onClick={handleGitHubAuth}
              className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub 登录
            </button>

            <p className="text-center text-[10px] text-gray-400">GitHub 登录需要科学上网</p>
          </div>
        </div>
      )}
    </header>
  );
}
