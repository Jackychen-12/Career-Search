"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setStatus("success");
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      }
    });

    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.slice(1));
      if (params.get("error")) {
        setStatus("error");
        setErrMsg(params.get("error_description") || "认证失败");
        return;
      }
    }

    if (!hash && !window.location.search.includes("code=")) {
      setStatus("error");
      setErrMsg("缺少认证参数");
      return;
    }

    const timeout = setTimeout(() => {
      setStatus((prev) => {
        if (prev === "loading") {
          setErrMsg("登录超时，链接可能已过期");
          return "error";
        }
        return prev;
      });
    }, 10000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 text-center">
        {status === "loading" && <p className="text-gray-600">正在登录...</p>}
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
