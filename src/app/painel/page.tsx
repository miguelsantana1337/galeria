import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: events } = await supabase.from("events").select("id,name,slug,status,photo_count,created_at").order("created_at", { ascending: false });
  return <main className="page"><header className="topbar" style={{ paddingInline: 0 }}><span className="brand">Fotos do Santana<span className="brand-dot">.</span></span><span>{user.email}</span></header><header className="page-header"><span className="eyebrow">Seus eventos</span><h1>Galerias prontas para encantar.</h1></header><section className="panel"><div className="stack"><Link className="button" href="/painel/eventos/novo" style={{ width: "fit-content", textDecoration: "none" }}>Criar novo evento</Link>{events?.length ? events.map((event) => <Link key={event.id} href={`/painel/eventos/${event.id}`} className="notice" style={{ textDecoration: "none" }}><strong>{event.name}</strong><br />{event.photo_count} fotos · {event.status}</Link>) : <p>Ainda não há eventos. Crie o primeiro para começar.</p>}</div></section></main>;
}
