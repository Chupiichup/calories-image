import type { IAiVisionProvider, MealAnalysisResult } from "./types";
import { MealAnalysisResponseSchema } from "./types";

export class OpenAiVisionProvider implements IAiVisionProvider {
  readonly providerName = "openai";
  readonly modelName: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(apiKey: string, modelName = "gpt-4o-mini", timeoutMs = 30000) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.timeoutMs = timeoutMs;
  }

  async analyzeFoodImage(params: {
    imageBase64: string;
    mimeType: string;
    userNote?: string;
  }): Promise<MealAnalysisResult> {
    const endpoint = "https://api.openai.com/v1/chat/completions";

    const promptText = `Bạn là chuyên gia dinh dưỡng và thị giác máy tính ẩm thực Việt Nam.
Hãy phân tích hình ảnh đĩa thức ăn này${
      params.userNote ? ` (Ghi chú: ${params.userNote})` : ""
    } và ước lượng các món, định lượng gram, calo, đạm, carbs, fat, fiber.
Trả về định dạng JSON thuần túy theo schema:
{
  "mealTypeInferred": "breakfast" | "lunch" | "dinner" | "snack",
  "confidenceOverall": number,
  "candidates": [
    {
      "name": string,
      "standardizedName": string,
      "portionG": number,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number,
      "confidence": number,
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.modelName,
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "Bạn là chuyên gia thị giác dinh dưỡng. Phân tích khẩu phần và các thành phần đa lượng một cách thận trọng, phân biệt rõ phần nhìn thấy và phần dầu mỡ ước tính.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${params.mimeType};base64,${params.imageBase64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Không nhận được nội dung từ OpenAI API.");
      }

      return MealAnalysisResponseSchema.parse(JSON.parse(content));
    } finally {
      clearTimeout(timeout);
    }
  }
}

