import type {
  ChatMessage,
  FollowUpChatResponse,
  OptimizationResult
} from "@/types/optimization";

type OptimizeInput = {
  resumeText: string;
  jdText: string;
};

type FollowUpInput = {
  messages: ChatMessage[];
  result: OptimizationResult;
  nextQuestion?: string;
};

type ExperienceCandidate = {
  section: string;
  title: string;
  bullet: string;
};

const systemPrompt = `你是面向中国大学生和实习求职者的中文简历优化助手。
任务：基于用户已有简历和目标岗位 JD，做 JD 定向优化。
硬性规则：
1. 只优化项目经历、实习经历、竞赛经历、校园经历中的经历 bullet。
2. 不要优化姓名、电话、邮箱、教育背景、GPA、课程、技能清单、个人简介。
3. 严禁编造用户没有提供的经历、数据、奖项、公司名、职位名。
4. 如果缺少量化结果，只能在 follow_up_questions 中追问，不要自行补数字。
5. 使用 STAR 法则优化表达，让经历更具体、更有结果导向。
6. 输出必须是 JSON，不要包含 Markdown。
7. 文案适合中文互联网、科技、实习求职场景，专业、清晰，不过度营销。`;

export async function optimizeResume(input: OptimizeInput): Promise<OptimizationResult> {
  if (!process.env.AI_API_KEY) {
    return mockOptimizeResume(input);
  }

  return callRealModel(input);
}

export async function answerFollowUp(input: FollowUpInput): Promise<FollowUpChatResponse> {
  if (!process.env.AI_API_KEY || !process.env.AI_API_ENDPOINT) {
    return mockAnswerFollowUp(input);
  }

  const response = await fetch(process.env.AI_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL_NAME ?? "replace-with-your-model",
      messages: [
        {
          role: "system",
          content:
            "你是中文简历优化助手。用户正在补充简历经历细节。你需要简短确认用户回答，并继续追问缺失信息。严禁编造未提供的事实。输出 JSON。"
        },
        {
          role: "user",
          content: JSON.stringify({
            conversation: input.messages,
            optimization_result: input.result,
            next_question: input.nextQuestion,
            required_schema: {
              message: "string",
              next_question: "string | undefined"
            }
          })
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("AI provider returned an unsupported response format.");
  }

  return JSON.parse(content) as FollowUpChatResponse;
}

async function callRealModel(input: OptimizeInput): Promise<OptimizationResult> {
  const endpoint = process.env.AI_API_ENDPOINT;
  const model = process.env.AI_MODEL_NAME ?? "replace-with-your-model";

  if (!endpoint) {
    return mockOptimizeResume(input);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            resume: input.resumeText,
            jd: input.jdText,
            required_schema: {
              jd_keywords: "string[]",
              matched_points: "string[]",
              missing_points: "string[]",
              revised_bullets: [
                {
                  original: "string",
                  revised: "string",
                  reason: "string",
                  needs_user_confirmation: "boolean"
                }
              ],
              follow_up_questions: "string[]"
            }
          })
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("AI provider returned an unsupported response format.");
  }

  return JSON.parse(content) as OptimizationResult;
}

function mockOptimizeResume(input: OptimizeInput): OptimizationResult {
  const jdKeywords = pickKeywords(input.jdText);
  const experiences = extractExperienceCandidates(input.resumeText).slice(0, 6);

  const revisedBullets = experiences.map((experience) => ({
    original: formatOriginalExperience(experience),
    revised: buildRevisedBullet(experience, jdKeywords),
    reason: buildReason(experience),
    needs_user_confirmation: !hasSpecificOutcome(experience.bullet)
  }));

  return {
    jd_keywords: jdKeywords,
    matched_points: buildMatchedPoints(experiences, jdKeywords),
    missing_points: [
      "部分项目描述仍偏任务罗列，可以补充项目背景、技术选型原因和你负责的边界。",
      "缺少更多可核验的结果数据，例如服务稳定性、功能覆盖范围、代码贡献、测试结果、用户反馈或交付周期。",
      "部分经历可以进一步对齐 JD 中的核心能力，例如工程实现、数据分析、协作沟通或问题定位。"
    ],
    revised_bullets: revisedBullets,
    follow_up_questions: buildFollowUpQuestions(experiences)
  };
}

function mockAnswerFollowUp(input: FollowUpInput): FollowUpChatResponse {
  const lastUserMessage = [...input.messages].reverse().find((message) => message.role === "user");
  const confirmation = lastUserMessage?.content
    ? "收到，这条补充会用于判断你的实际负责范围、行动细节和可写入简历的结果边界。"
    : "我会按项目经历继续追问，避免把没有确认的信息写进简历。";

  if (input.nextQuestion) {
    return {
      message: `${confirmation}\n\n接下来我想确认：${input.nextQuestion}`,
      next_question: input.nextQuestion
    };
  }

  return {
    message:
      `${confirmation}\n\n这一轮关键补充已经记录。后续接入真实模型后，可以把这些回答作为上下文，实时生成更准确的项目经历改写版本。`
  };
}

function extractExperienceCandidates(resumeText: string): ExperienceCandidate[] {
  const lines = normalizeResumeLines(resumeText);
  const candidates: ExperienceCandidate[] = [];
  let currentSection = "";
  let currentTitle = "";

  for (const line of lines) {
    const heading = getSectionHeading(line);

    if (heading) {
      currentSection = heading;
      currentTitle = "";
      continue;
    }

    if (!isTargetSection(currentSection)) {
      continue;
    }

    if (looksLikeExperienceTitle(line)) {
      currentTitle = cleanBulletMarker(line);
      continue;
    }

    if (looksLikeBullet(line)) {
      const bullet = cleanBulletMarker(line);

      if (isUsefulExperienceBullet(bullet)) {
        candidates.push({
          section: currentSection,
          title: currentTitle,
          bullet
        });
      }
    }
  }

  return candidates.length ? candidates : fallbackExperienceCandidates(lines);
}

function normalizeResumeLines(text: string): string[] {
  const rawLines = text
    .replace(/\t/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const lines: string[] = [];

  for (const rawLine of rawLines) {
    const line = rawLine.replace(/^\s*/, "• ").replace(/^\s*/, "• ");

    if (
      lines.length === 0 ||
      looksLikeBullet(line) ||
      looksLikeExperienceTitle(line) ||
      Boolean(getSectionHeading(line))
    ) {
      lines.push(line);
      continue;
    }

    lines[lines.length - 1] = `${lines[lines.length - 1]} ${line}`;
  }

  return lines;
}

function getSectionHeading(line: string): string {
  const normalized = cleanBulletMarker(line).replace(/[：:]/g, "").trim();
  const sectionNames = [
    "项目经历",
    "项目经验",
    "实习经历",
    "工作经历",
    "竞赛经历",
    "校园经历",
    "实践经历",
    "教育背景",
    "个人简介",
    "自我评价",
    "技能与能力",
    "专业技能",
    "联系方式"
  ];

  return sectionNames.find((section) => normalized === section || normalized.endsWith(section)) ?? "";
}

function isTargetSection(section: string): boolean {
  return ["项目经历", "项目经验", "实习经历", "工作经历", "竞赛经历", "校园经历", "实践经历"].includes(section);
}

function looksLikeExperienceTitle(line: string): boolean {
  return /^\d{4}[./-]\d{1,2}/.test(cleanBulletMarker(line));
}

function looksLikeBullet(line: string): boolean {
  if (looksLikeExperienceTitle(line)) {
    return false;
  }

  return /^[•\-*·]\s*/.test(line) || /^(\d+[.)、])\s*/.test(line);
}

function cleanBulletMarker(line: string): string {
  if (/^\d{4}[./-]\d{1,2}/.test(line.trim())) {
    return line.trim();
  }

  return line.replace(/^[•\-*·]\s*/, "").replace(/^(\d+[.)、])\s*/, "").trim();
}

function isUsefulExperienceBullet(line: string): boolean {
  if (line.length < 8) {
    return false;
  }

  return !/(邮箱|电话|姓名|cGPA|核心课程|雅思|英语能力|编程语言|排名|本科在读)/i.test(line);
}

function fallbackExperienceCandidates(lines: string[]): ExperienceCandidate[] {
  return lines
    .filter((line) => !getSectionHeading(line))
    .filter((line) => isUsefulExperienceBullet(line))
    .filter((line) => /(负责|参与|实现|开发|构建|完成|协助|调试|分析|设计|支持|提供)/.test(line))
    .slice(0, 4)
    .map((line) => ({
      section: "经历",
      title: "",
      bullet: cleanBulletMarker(line)
    }));
}

function formatOriginalExperience(experience: ExperienceCandidate): string {
  return experience.title ? `${experience.title}｜${experience.bullet}` : experience.bullet;
}

function buildRevisedBullet(experience: ExperienceCandidate, keywords: string[]): string {
  const focus = keywords.slice(0, 2).join("、") || "岗位核心能力";
  const context = experience.title ? `在「${experience.title}」中` : `在${experience.section}中`;
  const bullet = experience.bullet.replace(/[。；;]$/, "");

  if (hasSpecificOutcome(bullet)) {
    return `${context}，围绕${focus}要求，${bullet}，突出具体行动和可核验结果。`;
  }

  return `${context}，围绕${focus}要求，${bullet}；建议补充你负责的具体范围、使用的方法或工具，以及可核验的结果数据。`;
}

function buildReason(experience: ExperienceCandidate): string {
  if (hasSpecificOutcome(experience.bullet)) {
    return "保留原始项目事实和已有结果数据，将表达调整为“场景-行动-结果”的 STAR 结构，更贴近 JD 能力要求。";
  }

  return "保留原始项目事实，不补写未经确认的数据；当前版本先强化任务和行动表达，结果部分需要用户继续补充确认。";
}

function hasSpecificOutcome(text: string): boolean {
  return /(\d|%|秒|分钟|小时|天|周|月|个|项|次|人|case\d+|提升|降低|减少|支持|完成|解决|实现)/i.test(text);
}

function buildMatchedPoints(experiences: ExperienceCandidate[], jdKeywords: string[]): string[] {
  const titles = experiences
    .map((experience) => experience.title)
    .filter(Boolean)
    .slice(0, 3);

  return [
    titles.length
      ? `可重点优化 ${titles.join("、")} 等经历，避免分散到教育背景或个人信息。`
      : "可重点优化项目、竞赛或校园实践经历，避免分散到教育背景或个人信息。",
    jdKeywords.length
      ? `经历表达可围绕「${jdKeywords.slice(0, 3).join("、")}」展开，突出与 JD 相关的技术、协作和交付证据。`
      : "经历表达可围绕岗位核心能力展开，突出技术实现、问题解决和协作交付证据。"
  ];
}

function buildFollowUpQuestions(experiences: ExperienceCandidate[]): string[] {
  const firstProject = experiences.find((experience) => experience.title)?.title;

  return [
    firstProject
      ? `在「${firstProject}」中，你独立负责的模块和队友负责的模块分别是什么？`
      : "这些项目/实践经历中，你独立负责的部分和参与支持的部分分别是什么？",
    "每个项目有没有可确认的结果数据，例如性能指标、功能数量、测试覆盖、用户反馈、交付周期或排名？",
    "针对目标 JD，你希望优先突出工程实现能力、算法/数据分析能力、沟通协作能力，还是项目推进能力？"
  ];
}

function pickKeywords(text: string): string[] {
  const candidates = [
    "数据分析",
    "用户研究",
    "产品设计",
    "竞品分析",
    "SQL",
    "Python",
    "C++",
    "Qt",
    "A/B 测试",
    "增长",
    "运营",
    "项目管理",
    "沟通协作",
    "需求分析",
    "前端",
    "React",
    "Next.js",
    "机器学习",
    "推荐算法",
    "内容运营",
    "商业分析",
    "算法",
    "后端",
    "系统设计"
  ];

  const hits = candidates.filter((keyword) =>
    text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
  );

  return Array.from(new Set(hits)).slice(0, 8).concat(hits.length ? [] : ["岗位能力", "业务理解", "沟通协作"]);
}
