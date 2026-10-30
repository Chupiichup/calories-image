import { getEnv } from "@/lib/env";
import type { IAiVisionProvider, MealAnalysisResult } from "./types";
import { MockVisionProvider } from "./mockProvider";
import { GeminiVisionProvider } from "./geminiProvider";
import { OpenAiVisionProvider } from "./openaiProvider";

export function getAiVisionProvider(): IAiVisionProvider {
  const env = getEnv();

  // If no API key is set, safely return the mock provider
  if (!env.AI_PROVIDER_API_KEY) {
    return new MockVisionProvider();
  }

  if (env.AI_PROVIDER === "gemini") {
    return new GeminiVisionProvider(
      env.AI_PROVIDER_API_KEY,
      env.AI_PROVIDER_MODEL || "gemini-1.5-flash",
      env.AI_PROVIDER_TIMEOUT_MS,
    );
  }

  if (env.AI_PROVIDER === "openai") {
    return new OpenAiVisionProvider(
      env.AI_PROVIDER_API_KEY,
      env.AI_PROVIDER_MODEL || "gpt-4o-mini",
      env.AI_PROVIDER_TIMEOUT_MS,
    );
  }

  return new MockVisionProvider();
}

export async function analyzeMealImageWithProvider(params: {
  imageBase64: string;
  mimeType: string;
  userNote?: string;
  userId?: string;
}): Promise<{ result: MealAnalysisResult; provider: string; model: string; latencyMs: number }> {
  const provider = getAiVisionProvider();
  const startTime = Date.now();

  try {
    const result = await provider.analyzeFoodImage({
      imageBase64: params.imageBase64,
      mimeType: params.mimeType,
      userNote: params.userNote,
    });

    const latencyMs = Date.now() - startTime;

    return {
      result,
      provider: provider.providerName,
      model: provider.modelName,
      latencyMs,
    };
  } catch (error: any) {
    // If the primary provider failed (e.g. quota exhausted or network error), fallback to mock in development
    if (provider.providerName !== "mock") {
      console.warn(`AI Provider '${provider.providerName}' failed: ${error.message}. Falling back to mock vision.`);
      const mockProvider = new MockVisionProvider();
      const result = await mockProvider.analyzeFoodImage(params);
      return {
        result,
        provider: "mock-fallback",
        model: mockProvider.modelName,
        latencyMs: Date.now() - startTime,
      };
    }
    throw error;
  }
}

