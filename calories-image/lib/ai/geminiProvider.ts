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
    this.apiKey = (apiKey || "").trim().replace(/^["']|["']$/g, "");
    this.modelName = (modelName || "gemini-1.5-flash")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^models\//, "");
    this.timeoutMs = timeoutMs;
  }

  async analyzeFoodImage(params: {
    imageBase64: string;
    mimeType: string;
    userNote?: string;
  }): Promise<MealAnalysisResult> {
    const cleanKey = this.apiKey;
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

    // Step 1: Query ListModels to find which models are actually supported for this key
    let candidateModels: Array<{ version: string; fullName: string; shortName: string }> = [];
    let listErrorMessage = "";

    for (const ver of ["v1beta", "v1"]) {
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${cleanKey}`, {
          headers: { "x-goog-api-key": cleanKey },
        });
        const listData = await listRes.json();

        if (!listRes.ok) {
          if (listData?.error?.message) {
            listErrorMessage = `[${ver}] ${listData.error.message}`;
            // If the error is fatal (invalid key, project disabled, permission denied, location not supported)
            if (
              listRes.status === 400 ||
              listRes.status === 403 ||
              listData.error?.status === "PERMISSION_DENIED" ||
              listData.error?.status === "INVALID_ARGUMENT"
            ) {
              throw new Error(
                `Google Gemini API (${listRes.status} ${listData.error.status || ""}): ${listData.error.message}`
              );
            }
          }
          continue;
        }

        const modelsList: any[] = listData.models || [];
        const supported = modelsList.filter(
          (m: any) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes("generateContent"),
        );

        for (const m of supported) {
          const fullName = m.name.startsWith("models/") ? m.name : `models/${m.name}`;
          const shortName = m.name.replace(/^models\//, "");
          if (!candidateModels.some((c) => c.shortName === shortName)) {
            candidateModels.push({ version: ver, fullName, shortName });
          }
        }

        if (candidateModels.length > 0) {
          break; // Prioritize the first working endpoint version (usually v1beta)
        }
      } catch (listErr: any) {
        if (listErr.message && listErr.message.includes("Google Gemini API")) {
          throw listErr; // Bubble up clear fatal errors from Google
        }
        console.warn(`ListModels error on ${ver}:`, listErr);
      }
    }

    // Step 2: Sort candidates to prioritize best vision model
    if (candidateModels.length > 0) {
      candidateModels.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (a.shortName === this.modelName || a.shortName.includes(this.modelName)) scoreA += 50;
        if (b.shortName === this.modelName || b.shortName.includes(this.modelName)) scoreB += 50;
        if (a.shortName.includes("flash")) scoreA += 20;
        if (b.shortName.includes("flash")) scoreB += 20;
        if (a.shortName.includes("2.0")) scoreA += 10;
        if (b.shortName.includes("2.0")) scoreB += 10;
        if (a.shortName.includes("1.5")) scoreA += 5;
        if (b.shortName.includes("1.5")) scoreB += 5;
        return scoreB - scoreA;
      });
    } else {
      // Fallback static list if ListModels didn't return (e.g. strict corporate proxy)
      candidateModels = [
        { version: "v1beta", fullName: "models/gemini-2.0-flash", shortName: "gemini-2.0-flash" },
        { version: "v1beta", fullName: "models/gemini-1.5-flash", shortName: "gemini-1.5-flash" },
        { version: "v1", fullName: "models/gemini-1.5-flash", shortName: "gemini-1.5-flash" },
        { version: "v1beta", fullName: "models/gemini-2.5-flash", shortName: "gemini-2.5-flash" },
        { version: "v1beta", fullName: "models/gemini-1.5-flash-latest", shortName: "gemini-1.5-flash-latest" },
        { version: "v1", fullName: "models/gemini-1.5-pro", shortName: "gemini-1.5-pro" },
        { version: "v1beta", fullName: "models/gemini-1.5-pro", shortName: "gemini-1.5-pro" },
      ];
    }

    let lastError: Error | null = null;

    // Step 3: Call generateContent with discovered models
    for (const attempt of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/${attempt.version}/${attempt.fullName}:generateContent?key=${cleanKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
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
          throw new Error(`Gemini API (${attempt.version}/${attempt.shortName}) error ${response.status}: ${errorText}`);
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
        console.warn(`Attempt with ${attempt.version}/${attempt.shortName} failed: ${err.message}`);
        // If it was a 404, try next candidate model/version
        if (err.message && (err.message.includes("404") || err.message.includes("not found"))) {
          continue;
        }
        // If it's a fatal error like 400 or 403 or abort, break out and throw
        break;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (listErrorMessage && lastError?.message && lastError.message.includes("404")) {
      throw new Error(
        `Không tìm thấy model phù hợp cho API key này. Chi tiết: ${listErrorMessage}. Gợi ý: Hãy tạo API key mới trực tiếp tại https://aistudio.google.com/app/apikey hoặc kích hoạt Generative Language API trong Google Cloud Console.`
      );
    }

    throw lastError || new Error("Không thể phân tích ảnh bằng Gemini Vision.");
  }
}
