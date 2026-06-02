"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import type { ChatMessage, OptimizationResult } from "@/types/optimization";

type UploadedResume = {
  fileName: string;
  text: string;
};

const resumePlaceholder = `示例：
华南某大学 计算机科学与技术 本科

- 参与校园二手交易小程序项目，负责前端页面开发和接口联调
- 在学生会新媒体部门负责活动推文排版和数据复盘
- 参加数据分析课程项目，分析用户消费数据并完成展示`;

const jdPlaceholder = `示例：
产品/运营实习生

岗位职责：
1. 协助完成用户调研、竞品分析和需求整理；
2. 跟进产品功能上线后的数据表现，输出复盘结论；
3. 与研发、设计、运营团队沟通协作，推动项目落地。

岗位要求：
熟悉互联网产品，具备数据分析意识，沟通清晰，有校园项目或实习经历优先。`;

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null);
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const resumeTextForSubmit = useMemo(() => {
    return [uploadedResume?.text, resumeText.trim()].filter(Boolean).join("\n\n补充说明：\n");
  }, [resumeText, uploadedResume]);

  const canSubmit = useMemo(
    () => resumeTextForSubmit.length > 0 && jdText.trim().length > 0 && !isLoading && !isExtracting,
    [resumeTextForSubmit, jdText, isLoading, isExtracting]
  );

  async function handleResumeFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");
    setUploadedResume(null);
    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-resume", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "文件解析失败，请换一个文件重试。");
      }

      setUploadedResume({
        fileName: data.fileName,
        text: data.text
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "文件解析失败，请换一个文件重试。");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: resumeTextForSubmit, jdText })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "请求失败，请稍后重试。");
      }

      setResult(data as OptimizationResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <p className="text-sm font-medium text-brand">JD 定向优化模式</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
                职简匹配助手
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                基于已有简历和目标岗位 JD，追问关键信息，优化经历表达，但不替你编造事实。
              </p>
            </div>
            <div className="rounded-md border border-line bg-paper px-4 py-3 text-sm text-muted">
              未配置 API Key 时自动使用 mock response
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-2">
        <ResumeInputPanel
          value={resumeText}
          uploadedResume={uploadedResume}
          isExtracting={isExtracting}
          onTextChange={setResumeText}
          onFileChange={handleResumeFileChange}
          onRemoveFile={() => setUploadedResume(null)}
        />
        <TextInputPanel
          label="目标岗位 JD"
          description="粘贴岗位职责和要求，系统会围绕 JD 做匹配和改写建议。"
          value={jdText}
          onChange={setJdText}
          placeholder={jdPlaceholder}
        />

        <div className="lg:col-span-2">
          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-white transition hover:bg-[#176453] disabled:cursor-not-allowed disabled:bg-[#9cb8b1]"
          >
            {isLoading ? "正在优化..." : "开始优化"}
          </button>
        </div>
      </form>

      <section className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
        {result ? <ResultView result={result} /> : <EmptyResult />}
      </section>
    </main>
  );
}

function ResumeInputPanel({
  value,
  uploadedResume,
  isExtracting,
  onTextChange,
  onFileChange,
  onRemoveFile
}: {
  value: string;
  uploadedResume: UploadedResume | null;
  isExtracting: boolean;
  onTextChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
}) {
  return (
    <section className="rounded-md border border-line bg-white p-4 shadow-soft">
      <h2 className="text-base font-semibold text-ink">原始简历</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        推荐直接上传 PDF 或 .docx；如果文件无法解析，也可以在下方手动粘贴文本。
      </p>

      <div className="mt-4 rounded-md border border-dashed border-line bg-paper px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-muted">
            支持 PDF、.docx，文件不超过 8MB。上传后作为简历来源使用，不会把全文展开到文本框。
          </p>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink transition hover:border-brand hover:text-brand">
            {isExtracting ? "正在解析..." : uploadedResume ? "重新上传" : "上传简历文件"}
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={isExtracting}
              onChange={onFileChange}
              className="sr-only"
            />
          </label>
        </div>

        {uploadedResume ? (
          <div className="mt-3 flex flex-col gap-3 rounded-md border border-[#b8d8cf] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{uploadedResume.fileName}</p>
              <p className="mt-1 text-xs text-muted">
                已读取约 {uploadedResume.text.length} 个字符，可直接用于优化。
              </p>
            </div>
            <button
              type="button"
              onClick={onRemoveFile}
              className="h-9 rounded-md border border-line px-3 text-sm text-muted transition hover:border-red-300 hover:text-red-700"
            >
              移除文件
            </button>
          </div>
        ) : null}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-ink">手动粘贴或补充简历文本</span>
        <textarea
          value={value}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={resumePlaceholder}
          className="mt-2 min-h-[260px] w-full resize-y rounded-md border border-line bg-paper p-4 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
        />
      </label>
    </section>
  );
}

function TextInputPanel({
  label,
  description,
  value,
  onChange,
  placeholder
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block rounded-md border border-line bg-white p-4 shadow-soft">
      <span className="block text-base font-semibold text-ink">{label}</span>
      <span className="mt-1 block text-sm leading-6 text-muted">{description}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-4 min-h-[320px] w-full resize-y rounded-md border border-line bg-paper p-4 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
      />
    </label>
  );
}

function EmptyResult() {
  return (
    <div className="rounded-md border border-dashed border-line bg-white px-5 py-8 text-center text-sm text-muted">
      上传或粘贴简历，并填写 JD 后点击开始优化，结果会显示在这里。
    </div>
  );
}

function ResultView({ result }: { result: OptimizationResult }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <InfoBlock title="JD 关键词分析" items={result.jd_keywords} />
        <InfoBlock title="简历与 JD 的匹配点" items={result.matched_points} />
        <InfoBlock title="缺失或表达不足" items={result.missing_points} />
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white shadow-soft">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-ink">经历 bullet 优化对比</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-paper text-muted">
              <tr>
                <th className="w-[26%] border-b border-line px-4 py-3 font-semibold">原始 bullet</th>
                <th className="w-[32%] border-b border-line px-4 py-3 font-semibold">优化后 bullet</th>
                <th className="w-[28%] border-b border-line px-4 py-3 font-semibold">修改原因</th>
                <th className="w-[14%] border-b border-line px-4 py-3 font-semibold">需确认</th>
              </tr>
            </thead>
            <tbody>
              {result.revised_bullets.map((bullet, index) => (
                <tr key={`${bullet.original}-${index}`} className="align-top">
                  <td className="border-b border-line px-4 py-4 leading-6 text-ink">{bullet.original}</td>
                  <td className="border-b border-line px-4 py-4 leading-6 text-ink">{bullet.revised}</td>
                  <td className="border-b border-line px-4 py-4 leading-6 text-muted">{bullet.reason}</td>
                  <td className="border-b border-line px-4 py-4">
                    <span className="rounded-full bg-[#e7f3ef] px-3 py-1 text-xs font-medium text-brand">
                      {bullet.needs_user_confirmation ? "是" : "否"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FollowUpChat
        key={result.revised_bullets.map((bullet) => bullet.original).join("|")}
        result={result}
      />
    </div>
  );
}

function FollowUpChat({ result }: { result: OptimizationResult }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      content:
        result.follow_up_questions[0] ??
        "我会围绕项目经历继续追问具体职责、行动过程和结果数据，避免写入未经确认的信息。"
    }
  ]);
  const [draft, setDraft] = useState("");
  const [nextQuestionIndex, setNextQuestionIndex] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();

    if (!content || isSending) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = [...messages, userMessage];
    const nextQuestion = result.follow_up_questions[nextQuestionIndex];

    setMessages(nextMessages);
    setDraft("");
    setChatError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/follow-up-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          result,
          nextQuestion
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "对话生成失败，请稍后重试。");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: data.message
        }
      ]);

      if (nextQuestion) {
        setNextQuestionIndex((index) => index + 1);
      }
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "对话生成失败，请稍后重试。");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="rounded-md border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">追问补充对话</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            围绕项目经历继续确认细节，回答会作为后续改写依据。
          </p>
        </div>
        <span className="text-xs text-muted">{messages.length ? `${messages.length} 条消息` : null}</span>
      </div>

      <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto rounded-md border border-line bg-paper p-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm leading-6 ${
                message.role === "user"
                  ? "bg-brand text-white"
                  : "border border-line bg-white text-ink"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isSending ? (
          <div className="flex justify-start">
            <div className="rounded-md border border-line bg-white px-3 py-2 text-sm text-muted">
              正在继续追问...
            </div>
          </div>
        ) : null}
      </div>

      {chatError ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {chatError}
        </div>
      ) : null}

      <form onSubmit={handleChatSubmit} className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="直接回答上面的问题，例如：我主要负责延迟初始化和工具函数封装..."
          className="h-11 flex-1 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending}
          className="h-11 rounded-md bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#176453] disabled:cursor-not-allowed disabled:bg-[#9cb8b1]"
        >
          发送
        </button>
      </form>
    </section>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-md border border-line bg-white p-4 shadow-soft">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-brand" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
