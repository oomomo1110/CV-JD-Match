"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { FollowUpAnswer, OptimizationResult } from "@/types/optimization";

type UploadedResume = {
  fileName: string;
  text: string;
};

type UploadStatus = "idle" | "extracting" | "success" | "error";

type WorkspaceStep = "input" | "optimized" | "refined";

type WorkspaceDraft = {
  resumeText: string;
  jdText: string;
  uploadedFileName: string;
  optimizationResult: OptimizationResult | null;
  followUpAnswers: FollowUpAnswer[];
  secondOptimizationResult: OptimizationResult | null;
  currentStep: WorkspaceStep;
};

const workspaceDraftKey = "cv-jd-match-workspace-draft-v1";

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

export default function WorkspacePage() {
  const [resumeText, setResumeText] = useState("");
  const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null);
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [followUpAnswerMap, setFollowUpAnswerMap] = useState<Record<string, string>>({});
  const [secondOptimizationResult, setSecondOptimizationResult] = useState<OptimizationResult | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkspaceStep>("input");
  const [error, setError] = useState("");
  const [selectedResumeFileName, setSelectedResumeFileName] = useState("");
  const [resumeUploadStatus, setResumeUploadStatus] = useState<UploadStatus>("idle");
  const [resumeUploadError, setResumeUploadError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const activeFileKeyRef = useRef("");
  const isExtractingRef = useRef(false);
  const skipNextDraftSaveRef = useRef(false);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const rawDraft = window.localStorage.getItem(workspaceDraftKey);
        if (!rawDraft) {
          setHasRestoredDraft(true);
          return;
        }

        const draft = JSON.parse(rawDraft) as Partial<WorkspaceDraft>;
        const restoredResumeText = typeof draft.resumeText === "string" ? draft.resumeText : "";
        const restoredJdText = typeof draft.jdText === "string" ? draft.jdText : "";
        const restoredFileName = typeof draft.uploadedFileName === "string" ? draft.uploadedFileName : "";
        const restoredResult = draft.optimizationResult ?? null;
        const restoredSecondResult = draft.secondOptimizationResult ?? null;
        const restoredFollowUpAnswers = Array.isArray(draft.followUpAnswers) ? draft.followUpAnswers : [];

        setResumeText(restoredResumeText);
        setJdText(restoredJdText);
        setSelectedResumeFileName(restoredFileName);
        setUploadedResume(
          restoredFileName && restoredResumeText
            ? {
                fileName: restoredFileName,
                text: restoredResumeText
              }
            : null
        );
        setResumeUploadStatus(restoredFileName && restoredResumeText ? "success" : "idle");
        setResult(restoredResult);
        setSecondOptimizationResult(restoredSecondResult);
        setFollowUpAnswerMap(
          restoredFollowUpAnswers.reduce<Record<string, string>>((answers, item) => {
            if (item.question && item.answer) {
              answers[item.question] = item.answer;
            }
            return answers;
          }, {})
        );
        setCurrentStep(restoredSecondResult ? "refined" : restoredResult ? "optimized" : draft.currentStep ?? "input");
      } catch {
        window.localStorage.removeItem(workspaceDraftKey);
      } finally {
        setHasRestoredDraft(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!hasRestoredDraft) {
      return;
    }

    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      window.localStorage.removeItem(workspaceDraftKey);
      return;
    }

    const followUpAnswers = Object.entries(followUpAnswerMap)
      .map(([question, answer]) => ({
        question,
        answer: answer.trim()
      }))
      .filter((item) => item.answer);
    const uploadedFileName = selectedResumeFileName || uploadedResume?.fileName || "";
    const draft: WorkspaceDraft = {
      resumeText,
      jdText,
      uploadedFileName,
      optimizationResult: result,
      followUpAnswers,
      secondOptimizationResult,
      currentStep
    };

    window.localStorage.setItem(workspaceDraftKey, JSON.stringify(draft));
  }, [
    currentStep,
    followUpAnswerMap,
    hasRestoredDraft,
    jdText,
    result,
    resumeText,
    secondOptimizationResult,
    selectedResumeFileName,
    uploadedResume
  ]);

  const resumeTextForSubmit = useMemo(() => {
    return resumeText.trim();
  }, [resumeText]);

  const canSubmit = useMemo(
    () => resumeTextForSubmit.length > 0 && jdText.trim().length > 0 && !isLoading && !isExtracting,
    [resumeTextForSubmit, jdText, isLoading, isExtracting]
  );

  const submitHint = useMemo(() => {
    if (isExtracting) {
      return "简历文件正在解析，请等解析完成后再优化。";
    }

    if (!resumeTextForSubmit && !jdText.trim()) {
      return "请上传/粘贴简历，并填写目标岗位 JD。";
    }

    if (!resumeTextForSubmit) {
      return "请先上传并解析成功，或在左侧手动粘贴简历文本。";
    }

    if (!jdText.trim()) {
      return "请先填写目标岗位 JD。";
    }

    return "简历文本和 JD 已准备好，可以开始优化。";
  }, [isExtracting, resumeTextForSubmit, jdText]);

  async function handleResumeFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileName = file.name;
    const lowerFileName = fileName.toLowerCase();
    const fileKey = `${file.name}-${file.size}-${file.lastModified}`;

    if (isExtractingRef.current && activeFileKeyRef.current === fileKey) {
      return;
    }

    setError("");
    setUploadedResume(null);
    setSelectedResumeFileName(fileName);
    setResumeUploadStatus("extracting");
    setResumeUploadError("");

    if (lowerFileName.endsWith(".doc") && !lowerFileName.endsWith(".docx")) {
      const message = "暂不支持旧版 .doc 文件，请在 Word/WPS 中另存为 .docx 或导出为可复制文字的 PDF 后上传。";
      setResumeUploadStatus("error");
      setResumeUploadError(message);
      setError(message);
      event.target.value = "";
      return;
    }

    activeFileKeyRef.current = fileKey;
    isExtractingRef.current = true;
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

      const nextUploadedResume = {
        fileName: data.fileName,
        text: data.text
      };

      setUploadedResume(nextUploadedResume);
      setResumeText(nextUploadedResume.text);
      setResumeUploadStatus("success");
      setResult(null);
      setSecondOptimizationResult(null);
      setFollowUpAnswerMap({});
      setCurrentStep("input");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "文件解析失败，请换一个文件重试。";
      setResumeUploadStatus("error");
      setResumeUploadError(message);
      setError(message);
    } finally {
      isExtractingRef.current = false;
      setIsExtracting(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSecondOptimizationResult(null);
    setFollowUpAnswerMap({});
    setCurrentStep("input");

    const formData = new FormData(event.currentTarget);
    const formResumeText = formData.get("resumeText")?.toString().trim() ?? "";
    const formJdText = formData.get("jdText")?.toString().trim() ?? "";
    const nextResumeText = formResumeText || resumeTextForSubmit;
    const nextJdText = formJdText || jdText.trim();

    if (!nextResumeText || !nextJdText) {
      setError(!nextResumeText ? "请先上传/粘贴简历文本。" : "请先填写目标岗位 JD。");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: nextResumeText, jdText: nextJdText })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "请求失败，请稍后重试。");
      }

      setResult(data as OptimizationResult);
      setCurrentStep("optimized");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClearDraft() {
    skipNextDraftSaveRef.current = true;
    window.localStorage.removeItem(workspaceDraftKey);
    setResumeText("");
    setUploadedResume(null);
    setJdText("");
    setResult(null);
    setFollowUpAnswerMap({});
    setSecondOptimizationResult(null);
    setCurrentStep("input");
    setError("");
    setSelectedResumeFileName("");
    setResumeUploadStatus("idle");
    setResumeUploadError("");
    activeFileKeyRef.current = "";
    isExtractingRef.current = false;
    setIsExtracting(false);
    setIsLoading(false);
  }

  return (
    <main className="min-h-screen bg-app text-ink">
      <header className="border-b border-white/70 bg-white/85">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="text-sm font-bold text-sky transition hover:text-violet">
              返回封面
            </Link>
            <h1 className="mt-2 text-2xl font-black text-ink">简历优化工作台</h1>
            <p className="mt-1 text-sm leading-6 text-muted">
              上传简历、粘贴 JD，先验证完整产品闭环；真实改写质量等接入大模型后再评估。
            </p>
          </div>
          <span className="rounded-full bg-lemon px-3 py-1 text-xs font-bold text-[#775e00]">
            JD 定向优化模式
          </span>
        </div>
      </header>

      <form
        data-cv-form
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-6xl gap-5 px-5 py-6 sm:px-8 lg:grid-cols-2"
      >
        <ResumeInputPanel
          value={resumeText}
          uploadedResume={uploadedResume}
          selectedFileName={selectedResumeFileName}
          uploadStatus={resumeUploadStatus}
          uploadError={resumeUploadError}
          isExtracting={isExtracting}
          onTextChange={(value) => {
            setResumeText(value);
            setResult(null);
            setSecondOptimizationResult(null);
            setFollowUpAnswerMap({});
            setCurrentStep("input");
          }}
          onFileChange={handleResumeFileChange}
          onRemoveFile={() => {
            setUploadedResume(null);
            setSelectedResumeFileName("");
            setResumeUploadStatus("idle");
            setResumeUploadError("");
            setResult(null);
            setSecondOptimizationResult(null);
            setFollowUpAnswerMap({});
            setCurrentStep("input");
          }}
        />
        <TextInputPanel
          label="目标岗位 JD"
          description="粘贴岗位职责和要求。系统会围绕 JD 做匹配和结构化优化建议。"
          value={jdText}
          onChange={(value) => {
            setJdText(value);
            setResult(null);
            setSecondOptimizationResult(null);
            setFollowUpAnswerMap({});
            setCurrentStep("input");
          }}
          placeholder={jdPlaceholder}
        />

        <div className="flex flex-col gap-4 lg:col-span-2">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}
          <div
            data-error-box
            className="hidden rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          />

          <div className="flex flex-col gap-3 rounded-lg border border-white bg-white/80 p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm leading-6 ${canSubmit ? "text-[#086b5c]" : "text-muted"}`}>
              {submitHint}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                data-clear-draft
                type="button"
                onClick={handleClearDraft}
                className="h-12 rounded-lg border border-line bg-white px-4 text-sm font-bold text-muted transition hover:border-coral hover:text-coral"
              >
                清空草稿 / 重新开始
              </button>
              <button
                type="submit"
                disabled={isLoading || isExtracting}
                aria-disabled={!canSubmit}
                className={`h-12 rounded-lg px-6 text-sm font-bold text-white shadow-button transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 ${
                  canSubmit ? "bg-ink hover:bg-[#0f172a]" : "bg-slate-400 hover:bg-slate-500"
                }`}
              >
                {isLoading ? "正在优化..." : "开始优化"}
              </button>
            </div>
          </div>
        </div>
      </form>

      <section data-result-root className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
        {result ? (
          <ResultView
            result={result}
            resumeText={resumeTextForSubmit}
            jdText={jdText.trim()}
            followUpAnswerMap={followUpAnswerMap}
            onFollowUpAnswerChange={(question, answer) =>
              {
                setFollowUpAnswerMap((answers) => ({
                  ...answers,
                  [question]: answer
                }));
                setSecondOptimizationResult(null);
                setCurrentStep("optimized");
              }
            }
            secondOptimizationResult={secondOptimizationResult}
            onSecondOptimizationResult={(nextResult) => {
              setSecondOptimizationResult(nextResult);
              setCurrentStep(nextResult ? "refined" : "optimized");
            }}
          />
        ) : (
          <EmptyResult />
        )}
      </section>
    </main>
  );
}

function ResumeInputPanel({
  value,
  uploadedResume,
  selectedFileName,
  uploadStatus,
  uploadError,
  isExtracting,
  onTextChange,
  onFileChange,
  onRemoveFile
}: {
  value: string;
  uploadedResume: UploadedResume | null;
  selectedFileName: string;
  uploadStatus: UploadStatus;
  uploadError: string;
  isExtracting: boolean;
  onTextChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
}) {
  return (
    <section className="rounded-lg border border-white bg-white p-4 shadow-pop">
      <PanelHeader
        label="原始简历"
        description="推荐上传 PDF 或 .docx；解析失败时也可以直接粘贴文本。"
        accent="coral"
      />

      <div className="mt-4 rounded-lg border border-dashed border-coral/40 bg-[#fff6f2] p-4">
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-6 text-muted">
            支持 PDF、.docx，文件不超过 8MB。旧版 .doc 暂不支持，请另存为 .docx 后上传。
          </p>
          <input
            data-resume-file-input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={isExtracting}
            onChange={onFileChange}
            onInput={(event) => onFileChange(event as ChangeEvent<HTMLInputElement>)}
            className="block w-full cursor-pointer rounded-lg border border-coral/30 bg-white text-sm text-muted shadow-sm file:mr-4 file:h-10 file:cursor-pointer file:border-0 file:bg-coral file:px-4 file:text-sm file:font-bold file:text-white hover:border-coral disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <p data-selected-file className="text-sm text-muted">
            {selectedFileName ? `已选择：${selectedFileName}` : "选择 PDF 或 .docx 后会自动解析，并填入下方文本框。"}
          </p>
          <div data-upload-status className="hidden rounded-lg border px-3 py-2 text-sm leading-6" />

          {uploadStatus !== "idle" ? (
            <div
              className={`rounded-lg border px-3 py-2 text-sm leading-6 ${
                uploadStatus === "success"
                  ? "border-[#b8eadf] bg-[#f0fffb] text-[#086b5c]"
                  : uploadStatus === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-coral/30 bg-white text-coral"
              }`}
            >
              {uploadStatus === "extracting" ? <span>正在解析「{selectedFileName}」...</span> : null}
              {uploadStatus === "success" && uploadedResume ? (
                <span>解析成功：已读取约 {uploadedResume.text.length} 个字符，并已填入下方文本框。</span>
              ) : null}
              {uploadStatus === "error" ? <span>解析失败：{uploadError}</span> : null}
            </div>
          ) : null}
        </div>

        {uploadedResume ? (
          <div className="mt-3 flex flex-col gap-3 rounded-lg border border-coral/20 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-ink">{uploadedResume.fileName}</p>
              <p className="mt-1 text-xs text-muted">
                已读取约 {uploadedResume.text.length} 个字符，可直接用于优化。
              </p>
            </div>
            <button
              type="button"
              onClick={onRemoveFile}
              className="h-9 rounded-md border border-line px-3 text-sm font-semibold text-muted transition hover:border-red-300 hover:text-red-700"
            >
              移除文件
            </button>
          </div>
        ) : null}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-bold text-ink">手动粘贴或补充</span>
        <textarea
          data-resume-textarea
          name="resumeText"
          value={value}
          onChange={(event) => onTextChange(event.target.value)}
          onInput={(event) => onTextChange(event.currentTarget.value)}
          placeholder={resumePlaceholder}
          className="mt-2 min-h-[260px] w-full resize-y rounded-lg border border-line bg-white p-4 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-coral focus:ring-4 focus:ring-coral/15"
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
    <section className="rounded-lg border border-white bg-white p-4 shadow-pop">
      <PanelHeader label={label} description={description} accent="sky" />
      <textarea
        data-jd-textarea
        name="jdText"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onInput={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        className="mt-4 min-h-[370px] w-full resize-y rounded-lg border border-line bg-white p-4 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-sky focus:ring-4 focus:ring-sky/15"
      />
    </section>
  );
}

function PanelHeader({
  label,
  description,
  accent
}: {
  label: string;
  description: string;
  accent: "coral" | "sky" | "violet";
}) {
  const accentClass = {
    coral: "bg-coral",
    sky: "bg-sky",
    violet: "bg-violet"
  }[accent];

  return (
    <div className="flex gap-3">
      <span className={`mt-1 h-9 w-2 rounded-full ${accentClass}`} />
      <div>
        <h2 className="text-lg font-black text-ink">{label}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="rounded-lg border border-dashed border-sky/40 bg-white/80 px-5 py-10 text-center shadow-soft">
      <p className="text-base font-black text-ink">结果会出现在这里</p>
      <p className="mt-2 text-sm text-muted">上传或粘贴简历，并填写 JD 后点击开始优化。</p>
    </div>
  );
}

function ResultView({
  result,
  resumeText,
  jdText,
  followUpAnswerMap,
  onFollowUpAnswerChange,
  secondOptimizationResult,
  onSecondOptimizationResult
}: {
  result: OptimizationResult;
  resumeText: string;
  jdText: string;
  followUpAnswerMap: Record<string, string>;
  onFollowUpAnswerChange: (question: string, answer: string) => void;
  secondOptimizationResult: OptimizationResult | null;
  onSecondOptimizationResult: (result: OptimizationResult | null) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <InfoBlock title="JD 关键词" items={result.jd_keywords} accent="sky" />
        <InfoBlock title="匹配点" items={result.matched_points} accent="mint" />
        <InfoBlock title="待补强" items={result.missing_points} accent="lemon" />
      </div>

      <section className="overflow-hidden rounded-lg border border-white bg-white shadow-pop">
        <div className="flex flex-col gap-2 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-ink">项目经历优化对比</h2>
            <p className="mt-1 text-sm text-muted">只展示项目、竞赛、校园实践等经历 bullet，不处理个人信息和教育背景。</p>
          </div>
          <span className="rounded-full bg-violet/10 px-3 py-1 text-xs font-bold text-violet">
            {result.revised_bullets.length} 条建议
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fbff] text-muted">
              <tr>
                <th className="w-[26%] border-b border-line px-4 py-3 font-bold">原始 bullet</th>
                <th className="w-[32%] border-b border-line px-4 py-3 font-bold">优化后 bullet</th>
                <th className="w-[28%] border-b border-line px-4 py-3 font-bold">修改原因</th>
                <th className="w-[14%] border-b border-line px-4 py-3 font-bold">需确认</th>
              </tr>
            </thead>
            <tbody>
              {result.revised_bullets.map((bullet, index) => (
                <tr key={`${bullet.original}-${index}`} className="align-top transition hover:bg-[#fffaf0]">
                  <td className="border-b border-line px-4 py-4 leading-6 text-ink">{bullet.original}</td>
                  <td className="border-b border-line px-4 py-4 leading-6 text-ink">{bullet.revised}</td>
                  <td className="border-b border-line px-4 py-4 leading-6 text-muted">{bullet.reason}</td>
                  <td className="border-b border-line px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        bullet.needs_user_confirmation
                          ? "bg-lemon text-[#775e00]"
                          : "bg-mint text-[#086b5c]"
                      }`}
                    >
                      {bullet.needs_user_confirmation ? "需要" : "已足够"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <FollowUpRefinement
        key={result.revised_bullets.map((bullet) => bullet.original).join("|")}
        result={result}
        resumeText={resumeText}
        jdText={jdText}
        followUpAnswerMap={followUpAnswerMap}
        onFollowUpAnswerChange={onFollowUpAnswerChange}
        secondOptimizationResult={secondOptimizationResult}
        onSecondOptimizationResult={onSecondOptimizationResult}
      />
    </div>
  );
}

function FollowUpRefinement({
  result,
  resumeText,
  jdText,
  followUpAnswerMap,
  onFollowUpAnswerChange,
  secondOptimizationResult,
  onSecondOptimizationResult
}: {
  result: OptimizationResult;
  resumeText: string;
  jdText: string;
  followUpAnswerMap: Record<string, string>;
  onFollowUpAnswerChange: (question: string, answer: string) => void;
  secondOptimizationResult: OptimizationResult | null;
  onSecondOptimizationResult: (result: OptimizationResult | null) => void;
}) {
  const questions = result.follow_up_questions.length
    ? result.follow_up_questions
    : ["请补充你在这些经历中的具体负责范围、关键行动和可验证结果。"];
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState("");

  const followUpAnswers: FollowUpAnswer[] = questions
    .map((question) => ({
      question,
      answer: followUpAnswerMap[question]?.trim() ?? ""
    }))
    .filter((item) => item.answer);

  async function handleRefineSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!followUpAnswers.length || isRefining) {
      setRefineError("请先补充至少一个回答。");
      return;
    }

    setRefineError("");
    setIsRefining(true);

    try {
      const response = await fetch("/api/refine-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jdText,
          optimizationResult: result,
          followUpAnswers
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "根据补充信息继续优化失败，请稍后重试。");
      }

      onSecondOptimizationResult(data as OptimizationResult);
    } catch (error) {
      setRefineError(error instanceof Error ? error.message : "根据补充信息继续优化失败，请稍后重试。");
    } finally {
      setIsRefining(false);
    }
  }

  return (
    <section data-follow-up-section className="rounded-lg border border-white bg-white p-4 shadow-pop">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-ink">追问补充对话</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            逐条回答关键追问，系统会把你的补充信息传入后端生成二次优化版本。
          </p>
        </div>
        <span className="rounded-full bg-sky/10 px-3 py-1 text-xs font-bold text-sky">
          {followUpAnswers.length}/{questions.length} 已回答
        </span>
      </div>

      <form data-follow-up-form onSubmit={handleRefineSubmit} className="mt-4 space-y-4">
        {questions.map((question, index) => (
          <label key={`${question}-${index}`} className="block rounded-lg border border-line bg-[#f8fbff] p-3">
            <span className="block text-sm font-bold leading-6 text-ink">{question}</span>
            <textarea
              data-follow-up-answer
              data-question={question}
              value={followUpAnswerMap[question] ?? ""}
              onChange={(event) => onFollowUpAnswerChange(question, event.target.value)}
              placeholder="请补充你的具体经历，例如你负责的模块、使用的技术、遇到的问题、解决方法和最终结果"
              className="mt-3 min-h-[110px] w-full resize-y rounded-lg border border-line bg-white p-3 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-sky focus:ring-4 focus:ring-sky/15"
            />
          </label>
        ))}

        {refineError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {refineError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!followUpAnswers.length || isRefining}
          className="h-11 rounded-lg bg-sky px-5 text-sm font-bold text-white shadow-button transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isRefining ? "正在根据补充信息继续优化..." : "提交补充信息并继续优化"}
        </button>
      </form>

      {secondOptimizationResult ? (
        <section data-refined-result className="mt-5 overflow-hidden rounded-lg border border-sky/20 bg-white shadow-soft">
          <div className="border-b border-line px-4 py-4">
            <h3 className="text-base font-black text-ink">根据补充信息生成的优化版本</h3>
            <p className="mt-1 text-sm leading-6 text-muted">保留首次结果，并单独展示吸收补充回答后的二次优化建议。</p>
          </div>
          <BulletTable bullets={secondOptimizationResult.revised_bullets} />
        </section>
      ) : null}
    </section>
  );
}

function BulletTable({ bullets }: { bullets: OptimizationResult["revised_bullets"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fbff] text-muted">
          <tr>
            <th className="w-[26%] border-b border-line px-4 py-3 font-bold">原始 bullet</th>
            <th className="w-[32%] border-b border-line px-4 py-3 font-bold">优化后 bullet</th>
            <th className="w-[28%] border-b border-line px-4 py-3 font-bold">修改原因</th>
            <th className="w-[14%] border-b border-line px-4 py-3 font-bold">需确认</th>
          </tr>
        </thead>
        <tbody>
          {bullets.length ? (
            bullets.map((bullet, index) => (
              <tr key={`${bullet.original}-${index}`} className="align-top transition hover:bg-[#fffaf0]">
                <td className="border-b border-line px-4 py-4 leading-6 text-ink">{bullet.original}</td>
                <td className="border-b border-line px-4 py-4 leading-6 text-ink">{bullet.revised}</td>
                <td className="border-b border-line px-4 py-4 leading-6 text-muted">{bullet.reason}</td>
                <td className="border-b border-line px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      bullet.needs_user_confirmation ? "bg-lemon text-[#775e00]" : "bg-mint text-[#086b5c]"
                    }`}
                  >
                    {bullet.needs_user_confirmation ? "需要" : "已足够"}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="border-b border-line px-4 py-4 leading-6 text-muted">
                暂无可展示的二次优化 bullet。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function InfoBlock({
  title,
  items,
  accent
}: {
  title: string;
  items: string[];
  accent: "sky" | "mint" | "lemon";
}) {
  const bulletClass = {
    sky: "bg-sky",
    mint: "bg-[#13b99a]",
    lemon: "bg-[#f5c542]"
  }[accent];

  return (
    <section className="rounded-lg border border-white bg-white p-4 shadow-pop">
      <h2 className="text-base font-black text-ink">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className={`mt-2 h-2 w-2 flex-none rounded-full ${bulletClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
