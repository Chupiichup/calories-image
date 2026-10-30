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
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const promptText = `Hãy phân tích bữa ăn trong hình ảnh này. ${
      params.userNote ? `Ghi chú từ người dùng: "${params.userNote}".` : ""
    }
Hãy trả về JSON theo schema:
{
  "mealTypeInferred": "breakfast" | "lunch" | "dinner" | "snack",
  "confidenceOverall": number,
  "candidates": [
    {
      "name": string (tên món tiếng Việt),
      "standardizedName": string (slug tiếng Anh nếu có),
      "portionG": number (khối lượng gram),
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
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
                    mimeType: params.mimeType,
                    data: params.imageBase64,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Không nhận được nội dung phân tích từ Gemini API.");
      }

      const parsedData = JSON.parse(rawText);
      return MealAnalysisResponseSchema.parse(parsedData);
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Quá thời gian chờ phản hồi từ Gemini API (Timeout).");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

