"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function handleAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            setStatus("error");
            setErrMsg(error.message);
            return;
          }
          setStatus("success");
          setTimeout(() => { window.location.href = "/"; }, 800);
          return;
        } catch (e) {
          if (cancelled) return;
          setStatus("error");
          setErrMsg((e as Error).message);
          return;
        }
      }

      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.slice(1));
        if (hashParams.get("error")) {
          if (!cancelled) {
            setStatus("error");
            setErrMsg(hashParams.get("error_description") || "认证失败");
          }
          return;
        }
        if (hashParams.get("access_token")) {
          return;
        }
      }

      if (!cancelled) {
        setStatus("error");
        setErrMsg("缺少认证参数");
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && !cancelled) {
        setStatus("success");
        setTimeout(() => { window.location.href = "/"; }, 800);
      }
    });

    handleAuth();

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setStatus((prev) => {
          if (prev === "loading") {
            setErrMsg("登录超时，链接可能已过期，请重新发送验证邮件");
            return "error";
          }
          return prev;
        });
      }
    }, 15000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 text-center max-w-sm">
        {status === "loading" && (
          <div className="space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-gray-600 text-sm">正在登录...</p>
          </div>
        )}
        {status === "success" && <p className="text-brand-600 font-medium">登录成功，正在跳转...</p>}
        {status === "error" && (
          <div className="space-y-3">
            <p className="text-red-600 font-medium">登录失败</p>
            {errMsg && <p className="text-sm text-gray-500">{errMsg}</p>}
            <div className="flex items-center justify-center gap-3">
              <a href="/" className="text-sm text-brand-600 hover:text-brand-700">
                返回首页
              </a>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                重试
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
