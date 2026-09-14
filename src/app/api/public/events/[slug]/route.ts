import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const query = new URL(request.url).searchParams;
  const key = query.get("k");
  const includeFaces = query.get("faces") === "1";
  const admin = createSupabaseAdminClient();
  const { data: event } = await admin
    .from("events")
    .select(
      "id,name,event_date,match_threshold,welcome_message,brand_color,whatsapp_url,instagram_url,expires_at",
    )
    .eq("slug", slug)
    .eq("share_token", key || "")
    .eq("status", "published")
    .single();
  if (event?.expires_at && new Date(event.expires_at) <= new Date())
    return NextResponse.json(
      { error: "Esta galeria expirou." },
      { status: 410 },
    );
  if (!event)
    return NextResponse.json(
      { error: "Galeria indisponível." },
      { status: 404 },
    );
  const faces = includeFaces
    ? (
        await admin
          .from("face_descriptors")
          .select("photo_id,descriptor,detection_score")
          .eq("event_id", event.id)
      ).data || []
    : [];
  const { data: photos } = await admin
    .from("photos")
    .select("id,taken_at")
    .eq("event_id", event.id)
    .eq("status", "ready")
    .order("taken_at", { ascending: true, nullsFirst: false });
  return NextResponse.json(
    { event, faces, photos: photos || [] },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
