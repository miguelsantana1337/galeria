import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventManager } from "@/components/event-manager";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/entrar");
  const { data: event } = await supabase.from("events").select("id,name,slug,status,photo_count,event_date").eq("id", id).single();
  if (!event) notFound();
  const { data: photos } = await supabase.from("photos").select("id,original_name,face_count,status").eq("event_id", id).order("created_at");
  return <main className="page"><EventManager event={event} initialPhotos={photos || []} /></main>;
}
