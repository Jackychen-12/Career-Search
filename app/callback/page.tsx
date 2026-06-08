"use client";

import { useEffect, useState } from "react";
import { handleCallback } from "@/lib/auth";

export default function CallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setStatus("error");
      return;
    }
    handleCallback(code).then((ok) => {
      if (ok) {
        setStatus("success");
        setTimeout(() => {
          window.location.href = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/";
        }, 800);
      } else {
        setStatus("error");
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 text-center">
        {status === "loading" && <p className="text-gray-600">正在登录...</p>}
        {status === "success" && <p className="text-emerald-600 font-medium">登录成功，正在跳转...</p>}
        {status === "error" && (
          <div>
            <p className="text-red-600 font-medium">登录失败</p>
            <a href={(process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/"} className="text-sm text-brand-600 mt-2 inline-block">
              返回首页
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
