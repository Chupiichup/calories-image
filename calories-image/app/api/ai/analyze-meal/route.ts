import { NextRequest, NextResponse } from "next/server";
import { analyzeMealImageWithProvider } from "@/lib/ai/service";
import { getEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 60; // 60 seconds max runtime

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let imageBase64 = "";
    let mimeType = "image/jpeg";
    let userNote = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      userNote = (formData.get("note") as string) || "";

      if (!file) {
        return NextResponse.json(
          { error: "Vui lòng đính kèm tệp hình ảnh để phân tích." },
          { status: 400 },
        );
      }

      // Check max size
      const env = getEnv();
      const maxBytes = env.MAX_ANALYSIS_FILE_SIZE_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json(
          { error: `Kích thước ảnh vượt quá giới hạn cho phép (${env.MAX_ANALYSIS_FILE_SIZE_MB}MB).` },
          { status: 413 },
        );
      }

      mimeType = file.type || "image/jpeg";
      const validMimes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!validMimes.includes(mimeType) && !mimeType.startsWith("image/")) {
        return NextResponse.json(
          { error: "Định dạng tệp không được hỗ trợ. Vui lòng tải lên ảnh JPEG, PNG hoặc WebP." },
          { status: 415 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageBase64 = buffer.toString("base64");
    } else {
      const json = await req.json();
      imageBase64 = json.imageBase64;
      mimeType = json.mimeType || "image/jpeg";
      userNote = json.note || "";

      if (!imageBase64) {
        return NextResponse.json(
          { error: "Thiếu dữ liệu hình ảnh (imageBase64)." },
          { status: 400 },
        );
      }
    }

    // Authenticate user if Supabase is active
    let userId: string | undefined;
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    // Run AI analysis
    const { result, provider, model, latencyMs } = await analyzeMealImageWithProvider({
      imageBase64,
      mimeType,
      userNote,
      userId,
    });

    // Audit log if Supabase is connected and user is logged in
    if (supabase && userId) {
      try {
        await supabase.from("ai_analysis_logs").insert({
          user_id: userId,
          provider,
          model,
          analysis_type: "meal_vision",
          status: "success",
          latency_ms: latencyMs,
          usage_metadata: {
            itemCount: result.candidates.length,
            inferredMeal: result.mealTypeInferred,
          },
        });
      } catch (logErr) {
        console.warn("Could not write ai_analysis_logs:", logErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        provider,
        model,
        latencyMs,
      },
    });
  } catch (error: any) {
    console.error("Meal analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Đã xảy ra lỗi trong quá trình phân tích ảnh bữa ăn.",
      },
      { status: 500 },
    );
  }
}

