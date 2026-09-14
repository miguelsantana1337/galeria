import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewEventForm } from "@/components/new-event-form";

export default async function NewEventPage() {
  const {
    data: { user },
  } = await (await createSupabaseServerClient()).auth.getUser();
  if (!user) redirect("/entrar");
  return (
    <main className="page">
      <header className="page-header">
        <span className="eyebrow">Novo evento</span>
        <h1>Prepare a próxima galeria.</h1>
      </header>
      <section className="panel" style={{ maxWidth: 680 }}>
        <NewEventForm />
      </section>
    </main>
  );
}
