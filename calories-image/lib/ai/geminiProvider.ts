import type { IAiVisionProvider, MealAnalysisResult } from "./types";
import { MealAnalysisResponseSchema } from "./types";

const SYSTEM_INSTRUCTION = `Bạn là chuyên gia dinh dưỡng và thị giác máy tính cao cấp (AI Nutrition Vision Expert) chuyên về ẩm thực Việt Nam và dinh dưỡng thể thao giảm mỡ bảo toàn cơ bắp.
Nhiệm vụ của bạn là phân tích hình ảnh bữa ăn và trả về kết quả JSON có cấu trúc chính xác.

Quy tắc phân tích:
1. Nhận diện các món ăn, thành phần nhìn thấy được (Visible foods) và ước lượng trọng lượng (gram) dựa trên kích thước tương đối so với đĩa/bát/thìa thông thường.
2. Phân biệt rõ thành phần nhìn thấy được và thành phần ẩn/suy đoán (như dầu mỡ chiên xào, đường trong nước sốt).
3. Tính toán năng lượng (calories) và các chất đa lượng (protein, carbs, fat, fiber) dựa trên định lượng gram đã ước lượng theo bảng thành phần thực phẩm chuẩn (Viện Dinh dưỡng Quốc gia hoặc USDA).
4. Độ tin cậy (confidence) từ 0.0 đến 1.0 tùy thuộc vào độ rõ của hình ảnh và khả năng nhìn thấy bên trong món.
5. Cung cấp nhận xét dinh dưỡng thực tế, mang tính khuyến khích, tập trung vào mục tiêu đủ protein và chất xơ để giảm mỡ không mất cơ.
6. Luôn trả lời bằng định dạng JSON thuần túy (không kèm markdown ngoài khối JSON).`;

export class GeminiVisionProvider implements IAiVisionProvider {
  readonly providerName = "gemini";
  readonly modelName: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(apiKey: string, modelName = "gemini-1.5-flash", timeoutMs = 30000) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.timeoutMs = timeoutMs;
  }

  async analyzeFoodImage(params: {
    imageBase64: string;
    mimeType: string;
    userNote?: string;
  }): Promise<MealAnalysisResult> {
    const cleanBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, "").trim();
    // Gemini API only accepts 'image/jpeg', 'image/png', 'image/webp'
    const safeMime =
      params.mimeType === "image/png" || params.mimeType === "image/webp"
        ? params.mimeType
        : "image/jpeg";

    const promptText = `${SYSTEM_INSTRUCTION}

Hãy phân tích kỹ lưỡng hình ảnh bữa ăn này${params.userNote ? ` (Ghi chú: ${params.userNote})` : ""}.
Hãy trả về duy nhất định dạng JSON thuần túy (không kèm giải thích bên ngoài JSON) theo cấu trúc sau:
{
  "mealTypeInferred": "breakfast" | "lunch" | "dinner" | "snack",
  "confidenceOverall": number,
  "candidates": [
    {
      "name": string (tên món tiếng Việt chính xác theo ảnh),
      "standardizedName": string,
      "portionG": number (khối lượng gram ước tính),
      "calories": number (calo),
      "protein": number (đạm g),
      "carbs": number (tinh bột g),
      "fat": number (chất béo g),
      "fiber": number (chất xơ g),
      "confidence": number (0.0 - 1.0),
      "preparationMethod": string,
      "ingredients": string[],
      "notes": string,
      "uncertainties": string[]
    }
  ],
  "observations": string,
  "nutritionalInsight": string
}`;

    // Try both v1 and v1beta with multiple model aliases
    const attempts = [
      { version: "v1", model: this.modelName || "gemini-1.5-flash" },
      { version: "v1beta", model: this.modelName || "gemini-1.5-flash" },
      { version: "v1beta", model: "gemini-2.0-flash" },
      { version: "v1beta", model: "gemini-1.5-flash-latest" },
      { version: "v1", model: "gemini-1.5-flash" },
      { version: "v1beta", model: "gemini-1.5-pro" },
      { version: "v1", model: "gemini-1.5-pro" },
    ];

    let lastError: Error | null = null;

    for (const attempt of attempts) {
      const endpoint = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${this.apiKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      mimeType: safeMime,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API (${attempt.version}/${attempt.model}) error ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error("Không nhận được nội dung từ Gemini API.");
        }

        // Clean potential markdown fences (e.g. ```json ... ```)
        let cleanedText = rawText.trim();
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText.replace(/^```json\s*/i, "");
        } else if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText.replace(/^```\s*/i, "");
        }
        if (cleanedText.endsWith("```")) {
          cleanedText = cleanedText.replace(/```\s*$/i, "");
        }

        const parsedData = JSON.parse(cleanedText.trim());
        return MealAnalysisResponseSchema.parse(parsedData);
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt with ${attempt.version}/${attempt.model} failed: ${err.message}`);
        // If it was a 404 or model not found, try next candidate model/version
        if (err.message && (err.message.includes("404") || err.message.includes("not found"))) {
          continue;
        }
        // If it's a fatal error like 400 or 403 or abort, break out and throw
        break;
      } finally {
        clearTimeout(timeout);
      }
    }

    // Dynamic discovery fallback: query ListModels to find active model for this API key
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`, {
        headers: { "x-goog-api-key": this.apiKey },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const availableModels: Array<{ name: string; supportedGenerationMethods?: string[] }> = listData.models || [];
        const candidate = availableModels.find(
          (m) =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            (m.name.includes("flash") || m.name.includes("pro")),
        );
        if (candidate) {
          const modelClean = candidate.name.replace(/^models\//, "");
          const dynEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelClean}:generateContent?key=${this.apiKey}`;
          const dynRes = await fetch(dynEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": this.apiKey,
            },
            body: JSON.stringify({
              generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
              contents: [
                {
                  parts: [
                    { text: promptText },
                    { inlineData: { mimeType: safeMime, data: cleanBase64 } },
                  ],
                },
              ],
            }),
          });

          if (dynRes.ok) {
            const dynJson = await dynRes.json();
            const dynText = dynJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (dynText) {
              let cleaned = dynText.trim();
              if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\s*/i, "");
              if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\s*/i, "");
              if (cleaned.endsWith("```")) cleaned = cleaned.replace(/```\s*$/i, "");
              return MealAnalysisResponseSchema.parse(JSON.parse(cleaned.trim()));
            }
          }
        }
      }
    } catch (listErr) {
      console.warn("Dynamic ListModels discovery failed:", listErr);
    }

    throw lastError || new Error("Không thể phân tích ảnh bằng Gemini Vision.");
  }
}

