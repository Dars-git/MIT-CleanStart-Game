import { NextRequest, NextResponse } from "next/server";
import { initialGameState, quarterToYearQuarter } from "@/lib/sim/model";
import { getSupabaseAdmin } from "@/lib/supabase/server";

async function getUserIdFromBearer(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromBearer(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: gameErr } = await supabase
      .from("game_states")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (gameErr) {
      return NextResponse.json({ error: gameErr.message }, { status: 500 });
    }

    let gameState = existing;
    if (!existing) {
      gameState = initialGameState(userId);
      const { error: insertErr } = await supabase.from("game_states").insert(gameState);
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      const { year, quarterInYear } = quarterToYearQuarter(1);
      await supabase.from("quarter_history").insert({
        user_id: userId,
        quarter: 1,
        year,
        quarter_in_year: quarterInYear,
        cash: gameState.cash,
        revenue: 0,
        net_income: 0,
        engineers: gameState.engineers,
        sales_staff: gameState.sales_staff,
        quality: gameState.quality
      });
    }

    const { data: history, error: historyErr } = await supabase
      .from("quarter_history")
      .select("*")
      .eq("user_id", userId)
      .order("quarter", { ascending: false })
      .limit(4);

    if (historyErr) {
      return NextResponse.json({ error: historyErr.message }, { status: 500 });
    }

    return NextResponse.json({
      gameState,
      history: (history ?? []).reverse()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
