import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "职简匹配助手",
  description: "面向中国大学生和实习求职者的中文 AI 简历优化 Web App"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
