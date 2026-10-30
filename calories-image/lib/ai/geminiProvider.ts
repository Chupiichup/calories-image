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

  constructor(apiKey: string, modelName = "gemini-2.0-flash", timeoutMs = 25000) {
    this.apiKey = (apiKey || "").trim().replace(/^["']|["']$/g, "");
    let cleanModel = (modelName || "gemini-2.0-flash")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^models\//, "");
    if (cleanModel.includes("2.5")) {
      cleanModel = cleanModel.replace("2.5", "2.0");
    }
    this.modelName = cleanModel;
    this.timeoutMs = timeoutMs;
  }

  async analyzeFoodImage(params: {
    imageBase64: string;
    mimeType: string;
    userNote?: string;
  }): Promise<MealAnalysisResult> {
    const cleanKey = this.apiKey;
    const cleanBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const listRes = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${cleanKey}`, {
          headers: { "x-goog-api-key": cleanKey },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const listData = await listRes.json();

        if (!listRes.ok) {
          if (listData?.error?.message) {
            listErrorMessage = `[${ver}] ${listData.error.message}`;
            if (
              listRes.status === 400 ||
              listRes.status === 403 ||
              listData.error?.status === "PERMISSION_DENIED"
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
          throw listErr;
        }
        console.warn(`ListModels error on ${ver}:`, listErr);
      }
    }

    // Step 2: Filter and sort candidates to prioritize fast, low-latency vision models
    if (candidateModels.length > 0) {
      // Exclude preview-image, audio, tts, robotics, tool-only models
      const isUnsuitableModel = (name: string) =>
        /tts|transcribe|audio|speech|robotics|computer-use|banana|clip|argon|preview-image|-image\b|embedding|aqa/i.test(name);

      candidateModels = candidateModels.filter((c) => !isUnsuitableModel(c.shortName));

      candidateModels.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        if (a.shortName === this.modelName || a.shortName.includes(this.modelName)) scoreA += 100;
        if (b.shortName === this.modelName || b.shortName.includes(this.modelName)) scoreB += 100;

        // Prioritize Gemini 2.0 Flash first (fastest, latest multimodal architecture)
        if (a.shortName === "gemini-2.0-flash") scoreA += 90;
        if (b.shortName === "gemini-2.0-flash") scoreB += 90;

        if (a.shortName.includes("2.0-flash")) scoreA += 85;
        if (b.shortName.includes("2.0-flash")) scoreB += 85;

        // Gemini 1.5 Flash
        if (a.shortName === "gemini-1.5-flash") scoreA += 75;
        if (b.shortName === "gemini-1.5-flash") scoreB += 75;

        // Gemini 1.5 Flash-8b
        if (a.shortName === "gemini-1.5-flash-8b") scoreA += 70;
        if (b.shortName === "gemini-1.5-flash-8b") scoreB += 70;

        if (a.shortName.includes("flash")) scoreA += 50;
        if (b.shortName.includes("flash")) scoreB += 50;

        if (a.shortName === "gemini-1.5-pro" || a.shortName.includes("pro")) scoreA += 20;
        if (b.shortName === "gemini-1.5-pro" || b.shortName.includes("pro")) scoreB += 20;

        return scoreB - scoreA;
      });
    } else {
      // High-reliability static fallback list of real, officially supported Google models
      candidateModels = [
        { version: "v1beta", fullName: "models/gemini-2.0-flash", shortName: "gemini-2.0-flash" },
        { version: "v1beta", fullName: "models/gemini-1.5-flash", shortName: "gemini-1.5-flash" },
        { version: "v1beta", fullName: "models/gemini-1.5-flash-8b", shortName: "gemini-1.5-flash-8b" },
        { version: "v1beta", fullName: "models/gemini-2.0-flash-lite-preview-02-05", shortName: "gemini-2.0-flash-lite-preview-02-05" },
        { version: "v1beta", fullName: "models/gemini-1.5-pro", shortName: "gemini-1.5-pro" },
      ];
    }

    let lastError: Error | null = null;
    const perAttemptTimeoutMs = Math.min(this.timeoutMs, 18000); // Max 18s per attempt to allow fallback before Vercel timeout

    // Step 3: Call generateContent with discovered models
    for (const attempt of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/${attempt.version}/${attempt.fullName}:generateContent?key=${cleanKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), perAttemptTimeoutMs);

      const genConfig: Record<string, any> = {
        responseMimeType: "application/json",
        temperature: 0.2,
      };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            generationConfig: genConfig,
            contents: [
              {
                role: "user",
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

        // Pre-normalize parsedData so minor format deviations from Gemini don't throw Zod validation errors
        if (parsedData && typeof parsedData === "object") {
          const mType = String(parsedData.mealTypeInferred || "").toLowerCase();
          if (mType.includes("break") || mType.includes("sáng")) parsedData.mealTypeInferred = "breakfast";
          else if (mType.includes("lunch") || mType.includes("trưa")) parsedData.mealTypeInferred = "lunch";
          else if (mType.includes("din") || mType.includes("tối")) parsedData.mealTypeInferred = "dinner";
          else if (mType.includes("snack") || mType.includes("phụ")) parsedData.mealTypeInferred = "snack";
          else parsedData.mealTypeInferred = "lunch";

          let cOverall = Number(parsedData.confidenceOverall ?? 0.85);
          if (cOverall > 1) cOverall = cOverall / 100;
          parsedData.confidenceOverall = Math.max(0, Math.min(1, cOverall || 0.85));

          if (Array.isArray(parsedData.candidates)) {
            parsedData.candidates = parsedData.candidates.map((c: any) => {
              const portion = Number(c.portionG || c.portion_g || c.portion || 150);
              let conf = Number(c.confidence ?? 0.85);
              if (conf > 1) conf = conf / 100;

              return {
                name: String(c.name || "Món ăn").trim(),
                standardizedName: c.standardizedName ? String(c.standardizedName) : undefined,
                portionG: Math.max(10, isNaN(portion) ? 100 : portion),
                calories: Math.max(0, Number(c.calories ?? 0)),
                protein: Math.max(0, Number(c.protein ?? 0)),
                carbs: Math.max(0, Number(c.carbs ?? 0)),
                fat: Math.max(0, Number(c.fat ?? 0)),
                fiber: Math.max(0, Number(c.fiber ?? 0)),
                confidence: Math.max(0, Math.min(1, conf || 0.85)),
                preparationMethod: c.preparationMethod ? String(c.preparationMethod) : undefined,
                ingredients: Array.isArray(c.ingredients) ? c.ingredients.map(String) : [],
                notes: c.notes ? String(c.notes) : undefined,
                uncertainties: Array.isArray(c.uncertainties) ? c.uncertainties.map(String) : [],
              };
            });
          }
        }

        return MealAnalysisResponseSchema.parse(parsedData);
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt with ${attempt.version}/${attempt.shortName} failed: ${err.message}`);

        // If 404, 429 quota limit, 400 invalid argument, 503 high demand, 500/502/504 server error, or timeout/abort, continue to next candidate!
        if (
          err.message &&
          (err.message.includes("404") ||
            err.message.includes("not found") ||
            err.message.includes("429") ||
            err.message.includes("quota") ||
            err.message.includes("RESOURCE_EXHAUSTED") ||
            err.message.includes("400") ||
            err.message.includes("INVALID_ARGUMENT") ||
            err.message.includes("503") ||
            err.message.includes("500") ||
            err.message.includes("502") ||
            err.message.includes("504") ||
            err.message.includes("UNAVAILABLE") ||
            err.message.includes("high demand") ||
            err.message.includes("aborted") ||
            err.message.includes("abort") ||
            err.message.includes("timeout"))
        ) {
          // If 503 high demand or 500, pause briefly (400ms) before trying the next model
          if (
            err.message.includes("503") ||
            err.message.includes("UNAVAILABLE") ||
            err.message.includes("high demand")
          ) {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
          continue;
        }
        // If it's another fatal error like 403 API key invalid, break out and throw
        break;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (
      lastError?.message &&
      (lastError.message.includes("503") ||
        lastError.message.includes("UNAVAILABLE") ||
        lastError.message.includes("high demand"))
    ) {
      throw new Error(
        "Máy chủ Google Gemini hiện đang quá tải lượt truy cập tạm thời (mã 503: High demand). Vui lòng bấm 'Phân tích bằng AI' lại sau 5-10 giây hoặc chọn '+ Nhập thủ công'."
      );
    }

    if (lastError?.message && (lastError.message.includes("429") || lastError.message.includes("RESOURCE_EXHAUSTED"))) {
      throw new Error(
        "Tài khoản Google Gemini đã tạm thời hết lượt yêu cầu miễn phí trong ngày (mã 429: Quota exceeded). Bạn có thể bấm '+ Nhập thủ công' ở góc trên để lưu bữa ăn ngay bây giờ, hoặc thử lại sau khi Google làm mới lượt."
      );
    }

    if (lastError?.message && (lastError.message.includes("aborted") || lastError.message.includes("timeout"))) {
      throw new Error(
        "Thời gian kết nối đến máy chủ AI vượt quá giới hạn. Vui lòng bấm 'Phân tích bằng AI' lại hoặc dùng '+ Nhập thủ công'."
      );
    }

    if (listErrorMessage && lastError?.message && lastError.message.includes("404")) {
      throw new Error(
        `Không tìm thấy model phù hợp cho API key này. Chi tiết: ${listErrorMessage}. Gợi ý: Hãy tạo API key mới trực tiếp tại https://aistudio.google.com/app/apikey hoặc kích hoạt Generative Language API trong Google Cloud Console.`
      );
    }

    throw lastError || new Error("Không thể phân tích ảnh bằng Gemini Vision.");
  }
}
