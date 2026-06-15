"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center space-y-4">
        <div className="text-4xl">😵</div>
        <h2 className="text-lg font-bold text-gray-900">出了点问题</h2>
        <p className="text-sm text-gray-500">{error.message || "页面加载失败，请稍后再试"}</p>
        <div className="flex justify-center gap-3">
          <button onClick={reset} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition">
            重试
          </button>
          <a href="/" className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
