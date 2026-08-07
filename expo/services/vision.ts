import { TOOLKIT_SECRET, TOOLKIT_URL, VISION_MODEL } from "@/constants/config";
import type { VisionAssessment } from "@/types/card";
import { clamp } from "@/utils/format";

const PROMPT = `You are a strict trading-card condition inspector. Analyze the photo of a trading card and reply with ONLY a JSON object, no markdown fences, matching exactly:
{
  "is_card": boolean,            // is a single trading card clearly visible
  "blurry": boolean,             // is the photo too blurry to assess
  "glare": boolean,              // strong glare/reflections covering print
  "too_dark": boolean,           // underexposed / low light
  "centering": number,           // 1-10, border centering ratio quality
  "corners": number,             // 1-10, corner whitening/dings (10 = sharp)
  "edges": number,               // 1-10, edge chipping/wear
  "surface": number,             // 1-10, scratches/print lines/indents
  "print_sharpness": number,     // 1-10, rosette/print clarity vs genuine print
  "holo_variance_ok": boolean|null, // foil/holo pattern looks consistent with genuine print; null if not a foil card
  "authenticity_flags": string[],   // short phrases for suspicious traits (font weight off, color saturation off, dot pattern wrong, wrong texture, miscut). Empty if none.
  "summary": string              // one sentence, plain language
}
Score conservatively. If the image is not a trading card set is_card=false and other fields to safe defaults.`;

interface ChatChoice {
  message?: { content?: string };
}

interface ChatResponse {
  choices?: ChatChoice[];
}

function extractJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, 1, 10);
}

/**
 * AI vision pass over the card photo via the Rork Toolkit proxy
 * (google/gemini-2.5-flash). Returns null when unavailable so the
 * pipeline can fall back to a reduced signal set.
 */
export async function analyzeCardImage(
  base64Jpeg: string,
): Promise<VisionAssessment | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const res = await fetch(`${TOOLKIT_URL}/v2/vercel/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOOLKIT_SECRET}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Jpeg}` },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.log("[vision] http error", res.status);
      return null;
    }

    const json = (await res.json()) as ChatResponse;
    const content = json.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);
    if (!parsed) {
      console.log("[vision] could not parse JSON from model output");
      return null;
    }

    const flags = Array.isArray(parsed.authenticity_flags)
      ? (parsed.authenticity_flags as unknown[]).map((f) => String(f)).slice(0, 6)
      : [];

    return {
      isCard: parsed.is_card !== false,
      blurry: parsed.blurry === true,
      glare: parsed.glare === true,
      tooDark: parsed.too_dark === true,
      centering: num(parsed.centering, 8),
      corners: num(parsed.corners, 8),
      edges: num(parsed.edges, 8),
      surface: num(parsed.surface, 8),
      printSharpness: num(parsed.print_sharpness, 7),
      holoVarianceOk:
        parsed.holo_variance_ok === null || parsed.holo_variance_ok === undefined
          ? null
          : parsed.holo_variance_ok === true,
      authenticityFlags: flags,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch (e) {
    console.log("[vision] failed", e);
    return null;
  }
}
