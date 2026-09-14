"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewEventForm() {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Não foi possível criar o evento."); setLoading(false); return; }
    router.push(`/painel/eventos/${result.id}`);
  }
  return <form className="stack" onSubmit={submit}><div className="field"><label htmlFor="name">Nome do evento</label><input id="name" name="name" required placeholder="Workshop Flores & Café" /><small>O link da galeria será criado automaticamente a partir deste nome.</small></div><div className="field"><label htmlFor="eventDate">Data do evento</label><input id="eventDate" name="eventDate" type="date" /></div>{error && <p className="error">{error}</p>}<button className="button" disabled={loading}>{loading ? "Criando…" : "Criar evento"}</button></form>;
}
