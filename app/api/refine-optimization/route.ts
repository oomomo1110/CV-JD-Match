import { NextResponse } from "next/server";
import { refineOptimizationWithFollowUp } from "@/lib/ai";
import type { RefineOptimizationRequest } from "@/types/optimization";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RefineOptimizationRequest>;
    const resumeText = body.resumeText?.trim();
    const jdText = body.jdText?.trim();
    const followUpAnswers = body.followUpAnswers?.filter((item) => item.answer.trim()) ?? [];

    if (!resumeText || !jdText || !body.optimizationResult) {
      return NextResponse.json(
        { error: "请提供简历文本、目标岗位 JD 和首次优化结果。" },
        { status: 400 }
      );
    }

    if (!followUpAnswers.length) {
      return NextResponse.json(
        { error: "请先补充至少一个追问回答。" },
        { status: 400 }
      );
    }

    const result = await refineOptimizationWithFollowUp({
      resumeText,
      jdText,
      optimizationResult: body.optimizationResult,
      followUpAnswers
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "根据补充信息继续优化失败，请稍后重试。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
