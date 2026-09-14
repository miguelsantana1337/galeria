"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function EventCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (normalized) router.push(`/evento/${normalized}`);
  }
  return (
    <form className="event-form" onSubmit={submit}>
      <input aria-label="Código do evento" placeholder="Código do evento" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="none" />
      <button className="button" type="submit">Encontrar minhas fotos</button>
    </form>
  );
}
