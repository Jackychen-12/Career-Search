"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setStatus("success");
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      }
    });

    const hash = window.location.hash;
    if (!hash && !window.location.search.includes("code=")) {
      setStatus("error");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 text-center">
        {status === "loading" && <p className="text-gray-600">正在登录...</p>}
        {status === "success" && <p className="text-brand-600 font-medium">登录成功，正在跳转...</p>}
        {status === "error" && (
          <div>
            <p className="text-red-600 font-medium">登录失败</p>
            <a href={"/"} className="text-sm text-brand-600 mt-2 inline-block">
              返回首页
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
