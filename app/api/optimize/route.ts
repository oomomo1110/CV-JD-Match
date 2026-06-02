import { NextResponse } from "next/server";
import { optimizeResume } from "@/lib/ai";
import type { OptimizeResumeRequest } from "@/types/optimization";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<OptimizeResumeRequest>;
    const resumeText = body.resumeText?.trim();
    const jdText = body.jdText?.trim();

    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: "请同时提供原始简历文本和目标岗位 JD。" },
        { status: 400 }
      );
    }

    const result = await optimizeResume({ resumeText, jdText });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "简历优化失败，请稍后重试。" },
      { status: 500 }
    );
  }
}
