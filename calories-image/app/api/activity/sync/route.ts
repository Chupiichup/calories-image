import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { resolveSyncToken } from "@/lib/activity/pairingStore";

const syncPayloadSchema = z.object({
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (must be YYYY-MM-DD)"),
  steps: z.number().int().min(0, "Steps must be a non-negative integer"),
  activeCaloriesKcal: z.number().min(0, "Active calories must be non-negative").nullable().optional(),
  source: z.string().min(1).default("samsung_health"),
  timezone: z.string().min(1).default("Asia/Ho_Chi_Minh"),
  syncedAt: z.string().datetime().optional(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = syncPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Dữ liệu không hợp lệ",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { activityDate, steps, activeCaloriesKcal, source, timezone, syncedAt } = parseResult.data;
    const nowIso = syncedAt || new Date().toISOString();

    // Determine authenticated user: check Bearer header first, then cookies
    let userId: string | null = null;
    let isSignedToken = false;
    let bearerToken = "";
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      bearerToken = authHeader.replace("Bearer ", "").trim();

      // 1. Check if token is a pairing sync token (stateless signed or memory)
      const resolved = resolveSyncToken(bearerToken);
      if (resolved) {
        userId = resolved.userId;
        isSignedToken = true;
      } else if (isSupabaseConfigured() && supabaseUrl && supabaseAnonKey) {
        // 2. Try validating as official Supabase JWT
        const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: tokenErr } = await supabase.auth.getUser(bearerToken);
        if (user && !tokenErr) {
          userId = user.id;
        }
      }
    }

    // 3. Fallback to cookie-based session (web browser)
    if (!userId && isSupabaseConfigured()) {
      const serverSupabase = await createServerSupabaseClient();
      if (serverSupabase) {
        const { data: { user } } = await serverSupabase.auth.getUser();
        if (user) {
          userId = user.id;
        }
      }
    }

    // If still no user, check demo/offline mode
    if (!userId) {
      if (!isSupabaseConfigured()) {
        userId = "demo-user-1";
      } else {
        return NextResponse.json(
          { error: "Unauthorized. Vui lòng liên kết ứng dụng với tài khoản của bạn bằng mã kết nối 6 số hoặc đăng nhập." },
          { status: 401 }
        );
      }
    }

    // If not configured or user is demo/non-UUID, return success directly
    if (!isSupabaseConfigured() || !UUID_REGEX.test(userId)) {
      return NextResponse.json({
        success: true,
        mode: "demo",
        activity: {
          id: `demo-${activityDate}`,
          userId,
          activityDate,
          timezone,
          steps,
          activeCaloriesKcal: activeCaloriesKcal ?? null,
          source,
          syncedAt: nowIso,
        },
      });
    }

    // Upsert into Supabase public.daily_activities table
    // Prefer service role key if available to bypass RLS for paired tokens,
    // otherwise pass user's Bearer JWT.
    const clientKey = serviceRoleKey || supabaseAnonKey!;
    const clientOptions = (!serviceRoleKey && !isSignedToken && bearerToken)
      ? { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
      : undefined;

    const supabase = createSupabaseClient(supabaseUrl!, clientKey, clientOptions);

    const { data, error } = await supabase
      .from("daily_activities")
      .upsert(
        {
          user_id: userId,
          activity_date: activityDate,
          timezone,
          steps,
          active_calories_kcal: activeCaloriesKcal ?? null,
          source,
          synced_at: nowIso,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,activity_date" }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Supabase daily_activities upsert notice:", error.message);
      // Graceful fallback so user's phone app receives a successful acknowledgment
      return NextResponse.json({
        success: true,
        warning: error.message,
        activity: {
          id: `fallback-${activityDate}`,
          userId,
          activityDate,
          timezone,
          steps,
          activeCaloriesKcal: activeCaloriesKcal ?? null,
          source,
          syncedAt: nowIso,
        },
      });
    }

    return NextResponse.json({
      success: true,
      activity: {
        id: data?.id || `act-${activityDate}`,
        userId: data?.user_id || userId,
        activityDate: data?.activity_date || activityDate,
        timezone: data?.timezone || timezone,
        steps: Number(data?.steps ?? steps),
        activeCaloriesKcal: data?.active_calories_kcal !== null ? Number(data?.active_calories_kcal ?? activeCaloriesKcal) : null,
        source: data?.source || source,
        syncedAt: data?.synced_at || nowIso,
      },
    });
  } catch (err: any) {
    console.error("API /api/activity/sync error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
