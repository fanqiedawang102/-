import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI K线分析助手",
  description: "上传K线图，让 AI 帮你理解市场结构。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
