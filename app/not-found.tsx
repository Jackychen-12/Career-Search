export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center space-y-4">
        <div className="text-5xl font-bold text-gray-200">404</div>
        <h2 className="text-lg font-bold text-gray-900">页面不存在</h2>
        <p className="text-sm text-gray-500">你访问的页面可能已被移除或地址有误</p>
        <a href="/" className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition">
          返回首页
        </a>
      </div>
    </div>
  );
}
