import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventManager } from "@/components/event-manager";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: event } = await supabase
    .from("events")
    .select(
      "id,name,slug,status,photo_count,event_date,share_token,description,welcome_message,brand_color,whatsapp_url,instagram_url,expires_at,retention_days,banner_path,organizer_logos,updated_at",
    )
    .eq("id", id)
    .single();
  if (!event) notFound();
  const logoPaths = Array.isArray(event.organizer_logos)
    ? event.organizer_logos.filter(
        (path): path is string => typeof path === "string",
      )
    : [];
  const brandingPaths = [event.banner_path, ...logoPaths].filter(
    (path): path is string => Boolean(path),
  );
  const brandingSigned = await Promise.all(
    brandingPaths.map(async (path) => ({
      path,
      url:
        (
          await supabase.storage
            .from("event-photos")
            .createSignedUrl(path, 3600, {
              transform:
                path === event.banner_path
                  ? { width: 1200, quality: 70, resize: "cover" }
                  : { width: 240, height: 160, quality: 80, resize: "contain" },
            })
        ).data?.signedUrl || null,
    })),
  );
  const brandingUrls = new Map(
    brandingSigned.map((item) => [item.path, item.url]),
  );
  const { data: photos } = await supabase
    .from("photos")
    .select("id,original_name,face_count,status,storage_path")
    .eq("event_id", id)
    .order("created_at");
  const paths = (photos || []).map((photo) => photo.storage_path);
  const signed = await Promise.all(
    paths.map(async (path) => ({
      path,
      data: (
        await supabase.storage
          .from("event-photos")
          .createSignedUrl(path, 3600, {
            transform: {
              width: 360,
              height: 240,
              quality: 55,
              resize: "cover",
            },
          })
      ).data,
    })),
  );
  const previews = new Map(
    signed.map((item) => [item.path, item.data?.signedUrl]),
  );
  const { data: activity } = await supabase
    .from("gallery_activity")
    .select("kind,photo_count")
    .eq("event_id", id);
  const { count: consents } = await supabase
    .from("gallery_consents")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id);
  const metrics = (activity || []).reduce(
    (acc, item) => {
      acc[item.kind] = (acc[item.kind] || 0) + 1;
      if (item.kind === "download")
        acc.downloadedPhotos += item.photo_count || 0;
      return acc;
    },
    {
      view: 0,
      selfie: 0,
      match: 0,
      no_match: 0,
      download: 0,
      downloadedPhotos: 0,
    } as Record<string, number>,
  );
  return (
    <main className="page">
      <EventManager
        event={{
          ...event,
          organizer_logos: logoPaths,
          banner_preview_url: event.banner_path
            ? brandingUrls.get(event.banner_path) || null
            : null,
          logo_preview_urls: logoPaths.map(
            (path) => brandingUrls.get(path) || null,
          ),
        }}
        metrics={{
          view: metrics.view,
          selfie: metrics.selfie,
          match: metrics.match,
          no_match: metrics.no_match,
          download: metrics.download,
          downloadedPhotos: metrics.downloadedPhotos,
          consents: consents || 0,
        }}
        initialPhotos={(photos || []).map((photo) => ({
          ...photo,
          preview_url: previews.get(photo.storage_path) || null,
        }))}
      />
    </main>
  );
}
