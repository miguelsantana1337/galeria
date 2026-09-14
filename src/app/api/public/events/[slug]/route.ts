import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const admin = createSupabaseAdminClient();
  const { data: event } = await admin.from("events").select("id,name,event_date,match_threshold").eq("slug", slug).eq("status", "published").single();
  if (!event) return NextResponse.json({ error: "Galeria indisponível." }, { status: 404 });
  const { data: faces } = await admin.from("face_descriptors").select("photo_id,descriptor,detection_score").eq("event_id", event.id);
  return NextResponse.json({ event, faces: faces || [] }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
