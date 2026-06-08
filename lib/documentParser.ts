import path from "node:path";
import { pathToFileURL } from "node:url";
import mammoth from "mammoth";
import PDFParser from "pdf2json";

export type SupportedResumeFile = {
  name: string;
  type: string;
  buffer: Buffer;
};

export async function extractResumeText(file: SupportedResumeFile): Promise<string> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
    const textFromPdfParse = await extractPdfTextWithPdfParse(file.buffer);

    if (hasMeaningfulResumeText(textFromPdfParse)) {
      return textFromPdfParse;
    }

    return extractPdfTextWithPdf2Json(file.buffer);
  }

  if (
    fileName.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return normalizeExtractedText(parsed.value);
  }

  if (fileName.endsWith(".doc") || file.type === "application/msword") {
    throw new Error("暂不支持旧版 .doc 文件，请另存为 .docx 或 PDF 后上传。");
  }

  throw new Error("仅支持上传 PDF 或 .docx 格式的 Word 简历。");
}

async function extractPdfTextWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");

    PDFParse.setWorker(
      pathToFileURL(
        path.join(process.cwd(), "node_modules", "pdf-parse", "dist", "pdf-parse", "esm", "pdf.worker.mjs")
      ).toString()
    );

    const parser = new PDFParse({ data: buffer });

    try {
      const parsed = await parser.getText();
      return normalizeExtractedText(parsed.text);
    } finally {
      await parser.destroy();
    }
  } catch {
    return "";
  }
}

function extractPdfTextWithPdf2Json(buffer: Buffer): Promise<string> {
  process.env.PDF2JSON_DISABLE_LOGS = "1";

  return new Promise((resolve) => {
    const parser = new PDFParser(null, true);
    const timer = setTimeout(() => {
      parser.destroy();
      resolve("");
    }, 12000);

    parser.on("pdfParser_dataError", () => {
      clearTimeout(timer);
      parser.destroy();
      resolve("");
    });

    parser.on("pdfParser_dataReady", () => {
      clearTimeout(timer);
      const rawText = parser.getRawTextContent();
      parser.destroy();
      resolve(normalizeExtractedText(rawText));
    });

    parser.parseBuffer(buffer, 0);
  });
}

export function hasMeaningfulResumeText(text: string): boolean {
  const compactText = text.replace(/\s/g, "");
  const noiseOnlyText = compactText
    .replace(/[-–—_]/g, "")
    .replace(/page/gi, "")
    .replace(/break/gi, "")
    .replace(/\d+/g, "");

  if (!noiseOnlyText) {
    return false;
  }

  const lettersOrNumbers = compactText.match(/[\p{L}\p{N}]/gu) ?? [];

  return lettersOrNumbers.length >= 12;
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
