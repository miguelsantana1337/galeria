import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { permanentlyDeleteEvent } from "@/lib/cleanup-event";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 401 },
    );
  const admin = createSupabaseAdminClient();
  const { data: events, error } = await admin
    .from("events")
    .select("id")
    .lt("expires_at", new Date().toISOString())
    .limit(25);
  if (error)
    return NextResponse.json(
      { error: "Falha ao consultar expirações." },
      { status: 500 },
    );
  const results = [];
  for (const event of events || []) {
    try {
      results.push({
        id: event.id,
        ...(await permanentlyDeleteEvent(event.id)),
      });
    } catch {
      results.push({ id: event.id, error: true });
    }
  }
  return NextResponse.json({ checked: events?.length || 0, results });
}
