import { OCR_SPACE_API_KEY } from "@/constants/config";
import type { OcrOutcome } from "@/types/card";

interface OcrSpaceParsedResult {
  ParsedText?: string;
  FileParseExitCode?: number;
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
}

/**
 * Free local-tier pre-check: reads card text via OCR.space (engine 2).
 * Used as the zero-credit gatekeeper before any review capacity is spent.
 */
export async function runOcr(base64Jpeg: string): Promise<OcrOutcome> {
  try {
    const form = new FormData();
    form.append("base64Image", `data:image/jpeg;base64,${base64Jpeg}`);
    form.append("OCREngine", "2");
    form.append("scale", "true");
    form.append("detectOrientation", "true");
    form.append("language", "eng");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: OCR_SPACE_API_KEY },
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.log("[ocr] http error", res.status);
      return { text: "", lines: [], ok: false };
    }

    const json = (await res.json()) as OcrSpaceResponse;
    if (json.IsErroredOnProcessing) {
      console.log("[ocr] processing error", json.ErrorMessage);
      return { text: "", lines: [], ok: false };
    }

    const text = (json.ParsedResults ?? [])
      .map((r) => r.ParsedText ?? "")
      .join("\n")
      .trim();

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return { text, lines, ok: text.length > 0 };
  } catch (e) {
    console.log("[ocr] failed", e);
    return { text: "", lines: [], ok: false };
  }
}
