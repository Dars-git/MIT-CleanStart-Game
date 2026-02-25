import { NextRequest, NextResponse } from "next/server";
import { advanceQuarter } from "@/lib/sim/model";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { DecisionInput } from "@/lib/types";

async function getUserIdFromBearer(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromBearer(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decision = (await req.json()) as DecisionInput;
    const supabase = getSupabaseAdmin();

    const { data: current, error: currentErr } = await supabase
      .from("game_states")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (currentErr || !current) {
      return NextResponse.json(
        { error: currentErr?.message ?? "Game state not found" },
        { status: 404 }
      );
    }

    const { next, snapshot } = advanceQuarter(current, decision);

    const { error: updateErr } = await supabase
      .from("game_states")
      .update({
        quarter: next.quarter,
        cash: next.cash,
        engineers: next.engineers,
        sales_staff: next.sales_staff,
        quality: next.quality,
        last_revenue: next.last_revenue,
        last_net_income: next.last_net_income,
        total_revenue: next.total_revenue,
        total_net_income: next.total_net_income,
        is_over: next.is_over,
        is_won: next.is_won
      })
      .eq("user_id", userId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const { error: historyErr } = await supabase.from("quarter_history").insert({
      user_id: userId,
      quarter: snapshot.quarter,
      year: snapshot.year,
      quarter_in_year: snapshot.quarter_in_year,
      cash: snapshot.cash,
      revenue: snapshot.revenue,
      net_income: snapshot.net_income,
      engineers: snapshot.engineers,
      sales_staff: snapshot.sales_staff,
      quality: snapshot.quality
    });

    if (historyErr) {
      return NextResponse.json({ error: historyErr.message }, { status: 500 });
    }

    const { data: history, error: latestHistoryErr } = await supabase
      .from("quarter_history")
      .select("*")
      .eq("user_id", userId)
      .order("quarter", { ascending: false })
      .limit(4);

    if (latestHistoryErr) {
      return NextResponse.json({ error: latestHistoryErr.message }, { status: 500 });
    }

    return NextResponse.json({
      gameState: next,
      history: (history ?? []).reverse()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
