import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventManager } from "@/components/event-manager";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/entrar");
  const { data: event } = await supabase.from("events").select("id,name,slug,status,photo_count,event_date,share_token,welcome_message,brand_color,whatsapp_url,instagram_url,expires_at,retention_days").eq("id", id).single();
  if (!event) notFound();
  const { data: photos } = await supabase.from("photos").select("id,original_name,face_count,status,storage_path").eq("event_id", id).order("created_at");
  const paths = (photos || []).map((photo) => photo.storage_path);
  const { data: signed } = paths.length ? await supabase.storage.from("event-photos").createSignedUrls(paths, 3600) : { data: [] };
  const previews = new Map((signed || []).map((item, index) => [paths[index], item.signedUrl]));
  const { data: activity } = await supabase.from("gallery_activity").select("kind,photo_count").eq("event_id", id);
  const { count: consents } = await supabase.from("gallery_consents").select("id", { count: "exact", head: true }).eq("event_id", id);
  const metrics = (activity || []).reduce((acc, item) => { acc[item.kind] = (acc[item.kind] || 0) + 1; if (item.kind === "download") acc.downloadedPhotos += item.photo_count || 0; return acc; }, { view: 0, selfie: 0, match: 0, no_match: 0, download: 0, downloadedPhotos: 0 } as Record<string, number>);
  return <main className="page"><EventManager event={event} metrics={{ view: metrics.view, selfie: metrics.selfie, match: metrics.match, no_match: metrics.no_match, download: metrics.download, downloadedPhotos: metrics.downloadedPhotos, consents: consents || 0 }} initialPhotos={(photos || []).map((photo) => ({ ...photo, preview_url: previews.get(photo.storage_path) || null }))} /></main>;
}
