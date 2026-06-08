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
    <header className="hero-gradient text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-white/70 mb-3">
              <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                每日自动更新
              </span>
              <span>暑期实习 · 秋招 · 校招</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Career-Search 求职信息聚合
            </h1>
            <p className="mt-3 text-white/80 max-w-2xl leading-relaxed">
              自动聚合互联网、金融、外企、快消等方向的 {total}+ 个岗位，支持多维筛选、
              个性化匹配排序与一键直达官方投递页。纯静态 · 零成本 · Fork 即用。
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <a
                href="https://github.com/keyuchen-del/Career-Search"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-white text-[#16213e] font-semibold hover:bg-white/90 transition"
              >
                GitHub 源码 / Fork 一份
              </a>
              <a
                href="#jobs"
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/25 hover:bg-white/20 transition"
              >
                开始找工作
              </a>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {loggedIn && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenTracking}
                  className="px-3 py-1.5 rounded-lg text-xs bg-white/10 border border-white/25 hover:bg-white/20 transition"
                >
                  我的投递
                </button>
                <button
                  onClick={() => { logout(); setLoggedIn(false); setUser(null); }}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/30 hover:border-white/60 transition"
                  title={`${user.login} · 点击登出`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={user.avatar_url} alt={user.login} className="w-full h-full" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/10 border border-white/25 hover:bg-white/20 transition"
              >
                GitHub 登录
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
