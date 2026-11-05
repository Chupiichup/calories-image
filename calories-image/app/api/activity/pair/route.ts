import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { generatePairingCode, verifyPairingCode } from "@/lib/activity/pairingStore";
import { isSupabaseConfigured } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "generate";

    if (action === "generate") {
      // 1. Generate code for Web client
      let userId = "demo-user-1";
      let email: string | undefined = undefined;

      // Check Bearer header
      const authHeader = req.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ") && isSupabaseConfigured()) {
        const token = authHeader.replace("Bearer ", "").trim();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
          email = user.email;
        }
      }

      // Check cookie session
      if (userId === "demo-user-1" && isSupabaseConfigured()) {
        const serverSupabase = await createServerSupabaseClient();
        if (serverSupabase) {
          const { data: { user } } = await serverSupabase.auth.getUser();
          if (user) {
            userId = user.id;
            email = user.email;
          }
        }
      }

      // If client sent a specific userId / demoId in body, use it as fallback
      if (body.clientUserId && userId === "demo-user-1") {
        userId = body.clientUserId;
      }

      const code = generatePairingCode(userId, email);
      return NextResponse.json({
        success: true,
        code,
        userId,
        email: email || "Tài khoản khách",
        expiresInSeconds: 900, // 15 mins
      });
    }

    if (action === "verify") {
      // 2. Verify code for Android companion app
      const { code } = body;
      if (!code || typeof code !== "string") {
        return NextResponse.json(
          { error: "Vui lòng nhập mã kết nối 6 chữ số." },
          { status: 400 }
        );
      }

      const pairResult = verifyPairingCode(code);
      if (!pairResult) {
        return NextResponse.json(
          { error: "Mã kết nối không hợp lệ hoặc đã hết hạn (15 phút). Vui lòng lấy mã mới trên web." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        token: pairResult.token,
        userId: pairResult.userId,
        email: pairResult.email || "Đã liên kết",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("API /api/activity/pair error:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
