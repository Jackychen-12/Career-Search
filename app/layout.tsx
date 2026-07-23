import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Career-Search · 暑期实习 + 秋招信息聚合",
  description:
    "每日自动聚合互联网、金融、外企、快消等方向的暑期实习与秋招岗位，支持多维筛选、个性化匹配排序与一键直达官方投递页。纯静态、零成本、Fork 即用。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className={`${inter.className} min-h-screen`}>{children}</body>
    </html>
  );
}
