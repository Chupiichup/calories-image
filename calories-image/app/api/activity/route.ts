import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(30, Math.max(1, parseInt(limitParam, 10) || 7)) : 7;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        activities: [],
        mode: "demo",
      });
    }

    // Authenticate user
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
        { error: "Unauthorized. Please log in to view activity." },
        { status: 401 }
      );
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    if (dateParam) {
      const { data, error } = await supabase
        .from("daily_activities")
        .select("*")
        .eq("user_id", userId)
        .eq("activity_date", dateParam)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        activity: data
          ? {
              id: data.id,
              userId: data.user_id,
              activityDate: data.activity_date,
              timezone: data.timezone,
              steps: Number(data.steps),
              activeCaloriesKcal: data.active_calories_kcal !== null ? Number(data.active_calories_kcal) : null,
              source: data.source,
              syncedAt: data.synced_at,
            }
          : null,
      });
    }

    // Recent list query
    const { data, error } = await supabase
      .from("daily_activities")
      .select("*")
      .eq("user_id", userId)
      .order("activity_date", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const activities = (data || []).map((d) => ({
      id: d.id,
      userId: d.user_id,
      activityDate: d.activity_date,
      timezone: d.timezone,
      steps: Number(d.steps),
      activeCaloriesKcal: d.active_calories_kcal !== null ? Number(d.active_calories_kcal) : null,
      source: d.source,
      syncedAt: d.synced_at,
    }));

    return NextResponse.json({ activities });
  } catch (err: any) {
    console.error("API /api/activity error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

