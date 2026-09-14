import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  key: z.string().uuid(),
  photoIds: z.array(z.string().uuid()).min(1).max(100),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Seleção inválida." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id,expires_at")
    .eq("slug", slug)
    .eq("share_token", parsed.data.key)
    .eq("status", "published")
    .single();
  if (!event || (event.expires_at && new Date(event.expires_at) <= new Date()))
    return NextResponse.json(
      { error: "Galeria indisponível." },
      { status: 404 },
    );
  const { data: photos } = await admin
    .from("photos")
    .select("id,storage_path,original_name,width,height")
    .eq("event_id", event.id)
    .in("id", parsed.data.photoIds)
    .eq("status", "ready");
  const signed = await Promise.all(
    (photos || []).map(async (photo) => {
      const [{ data: preview }, { data: original }] = await Promise.all([
        admin.storage
          .from("event-photos")
          .createSignedUrl(photo.storage_path, 3600, {
            transform: { width: 720, quality: 68, resize: "contain" },
          }),
        admin.storage
          .from("event-photos")
          .createSignedUrl(photo.storage_path, 3600, {
            download: photo.original_name,
          }),
      ]);
      return {
        id: photo.id,
        name: photo.original_name,
        width: photo.width,
        height: photo.height,
        previewUrl: preview?.signedUrl,
        downloadUrl: original?.signedUrl,
      };
    }),
  );
  return NextResponse.json(
    { photos: signed.filter((photo) => photo.previewUrl && photo.downloadUrl) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
