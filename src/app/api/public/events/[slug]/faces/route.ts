import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
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

  const faces: { photo_id: string; descriptor: number[] }[] = [];
  const batchSize = 50;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await admin
      .from("face_descriptors")
      .select("photo_id,descriptor")
      .eq("event_id", event.id)
      .range(offset, offset + batchSize - 1);
    if (error)
      return NextResponse.json(
        { error: "Não foi possível carregar a busca facial." },
        { status: 500 },
      );
    faces.push(...(data || []));
    if (!data || data.length < batchSize) break;
  }

  const packedFaces = faces.map((face) => ({
    photo_id: face.photo_id,
    descriptor: Buffer.from(new Float32Array(face.descriptor).buffer).toString(
      "base64",
    ),
  }));

  return NextResponse.json(
    { faces: packedFaces },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
