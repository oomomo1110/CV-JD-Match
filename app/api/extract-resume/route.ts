import { NextResponse } from "next/server";
import { extractResumeText, hasMeaningfulResumeText } from "@/lib/documentParser";

export const runtime = "nodejs";

const maxFileSize = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传一个简历文件。" }, { status: 400 });
    }

    if (file.size > maxFileSize) {
      return NextResponse.json({ error: "文件不能超过 8MB。" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractResumeText({
      name: file.name,
      type: file.type,
      buffer
    });

    if (!hasMeaningfulResumeText(text)) {
      return NextResponse.json(
        {
          error:
            "这个文件没有读取到可用于优化的简历文字。如果它是扫描版或图片型 PDF，当前 MVP 还不能做 OCR；请上传 .docx、导出为可复制文字的 PDF，或直接粘贴简历文本。"
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      fileName: file.name,
      text
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "简历文件解析失败，请换一个文件重试。";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
