import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export async function GET() {
  const env = getEnv();
  const rawKey = env.AI_PROVIDER_API_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");

  if (!apiKey) {
    return NextResponse.json({
      status: "no_key",
      configured: false,
      message: "Chưa cấu hình biến môi trường AI_PROVIDER_API_KEY trên Vercel.",
      recommendation:
        "Hãy vào Vercel Settings -> Environment Variables, thêm AI_PROVIDER_API_KEY với khóa từ Google AI Studio (https://aistudio.google.com/app/apikey).",
    });
  }

  const results: Record<string, any> = {
    configured: true,
    apiKeyPrefix: apiKey.substring(0, 6) + "...",
    apiKeyLength: apiKey.length,
    isOpenAiKey: apiKey.startsWith("sk-"),
    isGeminiKey: apiKey.startsWith("AIzaSy"),
  };

  if (apiKey.startsWith("sk-")) {
    results.providerType = "openai";
    results.message = "Đã nhận diện OpenAI API Key.";
    return NextResponse.json(results);
  }

  // Test Gemini endpoints: ListModels on v1beta and v1
  for (const ver of ["v1beta", "v1"]) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`,
        {
          headers: { "x-goog-api-key": apiKey },
          cache: "no-store",
        }
      );
      const data = await res.json();

      const supportedModels = (data.models || [])
        .filter(
          (m: any) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes("generateContent")
        )
        .map((m: any) => m.name.replace(/^models\//, ""));

      results[`listModels_${ver}`] = {
        httpStatus: res.status,
        ok: res.ok,
        totalModels: data.models?.length || 0,
        generateContentModels: supportedModels,
        error: data.error || null,
      };
    } catch (e: any) {
      results[`listModels_${ver}`] = { error: e.message };
    }
  }

  const v1beta = results.listModels_v1beta;
  if (v1beta && v1beta.ok && v1beta.generateContentModels?.length > 0) {
    results.status = "healthy";
    results.message = `Gemini API hoạt động tốt! Đã tìm thấy ${v1beta.generateContentModels.length} models hỗ trợ phân tích hình ảnh.`;
    results.recommendedModel =
      v1beta.generateContentModels.find((m: string) => m.includes("flash")) ||
      v1beta.generateContentModels[0];
  } else {
    results.status = "error";
    const googleError = v1beta?.error?.message || results.listModels_v1?.error?.message;
    results.message = `Google từ chối yêu cầu ListModels: ${googleError || "Không có model nào khả dụng"}`;
    results.recommendation =
      "Hãy kiểm tra xem API key này đã được bật 'Generative Language API' chưa, hoặc truy cập https://aistudio.google.com/app/apikey để tạo một API key mới hoàn toàn miễn phí.";
  }

  return NextResponse.json(results);
}
