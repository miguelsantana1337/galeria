import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> },
) {
  const { slug, photoId } = await params;
  const key = new URL(request.url).searchParams.get("k");
  const admin = createSupabaseAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id,expires_at")
    .eq("slug", slug)
    .eq("share_token", key || "")
    .eq("status", "published")
    .single();
  if (!event || (event.expires_at && new Date(event.expires_at) <= new Date()))
    return NextResponse.json(
      { error: "Galeria indisponível." },
      { status: 404 },
    );
  const { data: photo } = await admin
    .from("photos")
    .select("storage_path,original_name")
    .eq("id", photoId)
    .eq("event_id", event.id)
    .eq("status", "ready")
    .single();
  if (!photo)
    return NextResponse.json(
      { error: "Foto não encontrada." },
      { status: 404 },
    );
  const { data } = await admin.storage
    .from("event-photos")
    .createSignedUrl(photo.storage_path, 300, {
      download: photo.original_name,
    });
  return data?.signedUrl
    ? NextResponse.json(
        { url: data.signedUrl, name: photo.original_name },
        { headers: { "Cache-Control": "private, no-store" } },
      )
    : NextResponse.json({ error: "Download indisponível." }, { status: 500 });
}
