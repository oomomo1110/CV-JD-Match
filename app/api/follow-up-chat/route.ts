import { NextResponse } from "next/server";
import { answerFollowUp } from "@/lib/ai";
import type { FollowUpChatRequest } from "@/types/optimization";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<FollowUpChatRequest>;

    if (!body.result || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "缺少对话上下文。" }, { status: 400 });
    }

    const response = await answerFollowUp({
      messages: body.messages,
      result: body.result,
      nextQuestion: body.nextQuestion
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "对话生成失败，请稍后重试。" },
      { status: 500 }
    );
  }
}
