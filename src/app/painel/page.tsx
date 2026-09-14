import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventsDashboard } from "@/components/events-dashboard";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: events } = await supabase
    .from("events")
    .select(
      "id,name,status,photo_count,event_date,expires_at,updated_at,banner_path",
    )
    .order("updated_at", { ascending: false });
  const eventsWithBanners = await Promise.all(
    (events || []).map(async (event) => ({
      ...event,
      banner_url: event.banner_path
        ? (
            await supabase.storage
              .from("event-photos")
              .createSignedUrl(event.banner_path, 3600, {
                transform: {
                  width: 720,
                  height: 360,
                  quality: 62,
                  resize: "cover",
                },
              })
          ).data?.signedUrl || null
        : null,
    })),
  );
  return (
    <main className="page">
      <header className="topbar" style={{ paddingInline: 0 }}>
        <span className="brand">
          Minha Galeria<span className="brand-dot">.</span>
        </span>
        <span>{user.email}</span>
      </header>
      <header className="page-header">
        <span className="eyebrow">Seus eventos</span>
        <h1>Seu arquivo de momentos.</h1>
        <p className="lead align-left">
          Encontre, acompanhe e reutilize a identidade dos seus eventos.
        </p>
      </header>
      <EventsDashboard events={eventsWithBanners} />
    </main>
  );
}
