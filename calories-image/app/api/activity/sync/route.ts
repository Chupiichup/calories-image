import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

const syncPayloadSchema = z.object({
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (must be YYYY-MM-DD)"),
  steps: z.number().int().min(0, "Steps must be a non-negative integer"),
  activeCaloriesKcal: z.number().min(0, "Active calories must be non-negative").nullable().optional(),
  source: z.string().min(1).default("samsung_health"),
  timezone: z.string().min(1).default("Asia/Ho_Chi_Minh"),
  syncedAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = syncPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { activityDate, steps, activeCaloriesKcal, source, timezone, syncedAt } = parseResult.data;
    const nowIso = syncedAt || new Date().toISOString();

    if (!isSupabaseConfigured()) {
      // Local/offline demo fallback
      return NextResponse.json({
        success: true,
        mode: "demo",
        activity: {
          id: "demo-activity-1",
          userId: "demo-user-1",
          activityDate,
          timezone,
          steps,
          activeCaloriesKcal: activeCaloriesKcal ?? null,
          source,
          syncedAt: nowIso,
        },
      });
    }

    // Determine authenticated user: check Bearer header first, then cookies
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: tokenErr } = await supabase.auth.getUser(token);
      if (user && !tokenErr) {
        userId = user.id;
      }
    }

    if (!userId) {
      // Fallback to cookie-based session
      const serverSupabase = await createServerSupabaseClient();
      if (serverSupabase) {
        const { data: { user } } = await serverSupabase.auth.getUser();
        if (user) {
          userId = user.id;
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please provide a valid Bearer token or authenticate your session." },
        { status: 401 }
      );
    }

    // Upsert into public.daily_activities table
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
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
      .single();

    if (error) {
      console.error("API /api/activity/sync upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      activity: {
        id: data.id,
        userId: data.user_id,
        activityDate: data.activity_date,
        timezone: data.timezone,
        steps: Number(data.steps),
        activeCaloriesKcal: data.active_calories_kcal !== null ? Number(data.active_calories_kcal) : null,
        source: data.source,
        syncedAt: data.synced_at,
      },
    });
  } catch (err: any) {
    console.error("API /api/activity/sync error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

