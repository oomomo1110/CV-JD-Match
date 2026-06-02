# 职简匹配助手 MVP

面向中国大学生和实习求职者的中文 AI 简历优化 Web App。第一版实现 JD 定向优化模式，不包含登录、数据库、支付和完整导出。

## 已实现功能

- 粘贴原始简历文本
- 上传 PDF / `.docx` Word 简历并自动提取文本
- 粘贴目标岗位 JD
- 调用 Next.js API Route 返回结构化优化结果
- 未配置 API Key 时自动使用 mock response

文件上传说明：

- 支持 PDF 和 `.docx`
- 单个文件不超过 8MB
- 暂不支持旧版 `.doc`，请另存为 `.docx` 或 PDF 后上传
- 扫描版 PDF 可能无法提取文字，需要先 OCR 或手动粘贴文本

## 运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000。

## AI 配置

未配置 API Key 时，后端会自动返回 mock response，前端可以完整跑通。

如需接入真实大模型，可在 `.env.local` 中配置：

```bash
AI_API_KEY=你的 API Key
AI_API_ENDPOINT=https://api.example.com/v1/chat/completions
AI_MODEL_NAME=你的模型名
```

真实请求封装在 `lib/ai.ts`，之后可以替换为 DeepSeek、OpenAI、通义千问等 OpenAI-compatible Chat Completions 接口。
