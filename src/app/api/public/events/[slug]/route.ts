import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const key = new URL(request.url).searchParams.get("k"); const admin = createSupabaseAdminClient();
  const { data: event } = await admin.from("events").select("id,name,event_date,match_threshold,welcome_message,brand_color,whatsapp_url,instagram_url,expires_at").eq("slug", slug).eq("share_token", key || "").eq("status", "published").single();
  if (event?.expires_at && new Date(event.expires_at) <= new Date()) return NextResponse.json({ error: "Esta galeria expirou." }, { status: 410 });
  if (!event) return NextResponse.json({ error: "Galeria indisponível." }, { status: 404 });
  const { data: faces } = await admin.from("face_descriptors").select("photo_id,descriptor,detection_score").eq("event_id", event.id);
  return NextResponse.json({ event, faces: faces || [] }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
