"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { slugifyEventName } from "@/lib/slug";

export function EventCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = slugifyEventName(code);
    if (normalized) router.push(`/evento/${normalized}`);
  }
  return (
    <form className="event-form" onSubmit={submit}>
      <input aria-label="Nome do evento" placeholder="Nome do evento" value={code} onChange={(e) => setCode(e.target.value)} />
      <button className="button" type="submit">Encontrar minhas fotos</button>
    </form>
  );
}
