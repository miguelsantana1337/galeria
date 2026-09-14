import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const key = new URL(request.url).searchParams.get("k") || "";
  if (!key)
    return NextResponse.json(
      { error: "Imagem indisponível." },
      { status: 404 },
    );

  const admin = createSupabaseAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("banner_path,expires_at")
    .eq("slug", slug)
    .eq("share_token", key)
    .eq("status", "published")
    .single();
  if (
    !event?.banner_path ||
    (event.expires_at && new Date(event.expires_at).getTime() <= Date.now())
  )
    return NextResponse.json(
      { error: "Imagem indisponível." },
      { status: 404 },
    );

  const { data } = await admin.storage
    .from("event-photos")
    .createSignedUrl(event.banner_path, 60, {
      transform: {
        width: 1200,
        height: 630,
        quality: 78,
        resize: "cover",
      },
    });
  if (!data?.signedUrl)
    return NextResponse.json(
      { error: "Imagem indisponível." },
      { status: 404 },
    );

  const image = await fetch(data.signedUrl, { cache: "no-store" });
  if (!image.ok || !image.body)
    return NextResponse.json(
      { error: "Imagem indisponível." },
      { status: 404 },
    );

  return new Response(image.body, {
    headers: {
      "Content-Type": image.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
