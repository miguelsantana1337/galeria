"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Check, Copy, Images, LoaderCircle, UploadCloud } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { extractFaces, getFaceEngine } from "@/lib/face-engine";

type EventInfo = { id: string; name: string; slug: string; status: string; photo_count: number; event_date: string | null };
type Photo = { id: string; original_name: string; face_count: number; status: string };
type QueueItem = { name: string; status: "waiting" | "processing" | "done" | "error"; message?: string };

export function EventManager({ event, initialPhotos }: { event: EventInfo; initialPhotos: Photo[] }) {
  const [photos, setPhotos] = useState(initialPhotos); const [queue, setQueue] = useState<QueueItem[]>([]); const [busy, setBusy] = useState(false); const [published, setPublished] = useState(event.status === "published");
  const publicUrl = useMemo(() => typeof window === "undefined" ? `/evento/${event.slug}` : `${location.origin}/evento/${event.slug}`, [event.slug]);
  async function upload(selected: File[]) {
    setBusy(true); setQueue(selected.map((file) => ({ name: file.name, status: "waiting" })));
    await getFaceEngine(); const supabase = createSupabaseBrowserClient();
    for (let index = 0; index < selected.length; index++) {
      const file = selected[index]; setQueue((old) => old.map((item, i) => i === index ? { ...item, status: "processing", message: "Identificando rostos…" } : item));
      try {
        const analysis = await extractFaces(file); const safeName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`; const path = `${event.id}/${safeName}`;
        setQueue((old) => old.map((item, i) => i === index ? { ...item, message: `${analysis.faces.length} rosto(s) · enviando…` } : item));
        const { error: uploadError } = await supabase.storage.from("event-photos").upload(path, file, { contentType: file.type, upsert: false }); if (uploadError) throw uploadError;
        const response = await fetch(`/api/events/${event.id}/photos`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ storagePath: path, originalName: file.name, width: analysis.width, height: analysis.height, faces: analysis.faces }) });
        if (!response.ok) { await supabase.storage.from("event-photos").remove([path]); throw new Error((await response.json()).error); }
        const result = await response.json(); setPhotos((old) => [...old, { id: result.id, original_name: file.name, face_count: analysis.faces.length, status: "ready" }]);
        setQueue((old) => old.map((item, i) => i === index ? { ...item, status: "done", message: `${analysis.faces.length} rosto(s) indexado(s)` } : item));
      } catch (error) { setQueue((old) => old.map((item, i) => i === index ? { ...item, status: "error", message: error instanceof Error ? error.message : "Falha no processamento" } : item)); }
    }
    setBusy(false);
  }
  async function chooseFiles(e: ChangeEvent<HTMLInputElement>) { const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith("image/")); if (files.length) await upload(files); e.target.value = ""; }
  async function togglePublish() { const response = await fetch(`/api/events/${event.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publish: !published }) }); if (response.ok) setPublished(!published); }
  return <><header className="topbar" style={{ paddingInline: 0 }}><a className="brand" href="/painel">Fotos do Santana<span className="brand-dot">.</span></a><span className={`status ${published ? "live" : ""}`}>{published ? "Publicado" : "Rascunho"}</span></header><header className="page-header"><span className="eyebrow">{event.event_date ? new Date(`${event.event_date}T12:00:00`).toLocaleDateString("pt-BR") : "Evento"}</span><h1>{event.name}</h1><p className="lead" style={{ margin: 0 }}>{photos.length} fotos · {photos.reduce((sum, p) => sum + p.face_count, 0)} rostos encontrados</p></header><div className="dashboard-grid"><section className="panel stack"><div><h2>Fotos do evento</h2><p className="muted">As imagens são analisadas no seu navegador antes do envio.</p></div><label className={`dropzone ${busy ? "disabled" : ""}`}><UploadCloud size={30} /><strong>{busy ? "Processando fotos…" : "Selecionar fotos"}</strong><span>JPEG, PNG ou WebP · até 15 MB cada</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={chooseFiles} disabled={busy} hidden /></label>{queue.length > 0 && <div className="queue">{queue.map((item, i) => <div className="queue-row" key={`${item.name}-${i}`}>{item.status === "processing" ? <LoaderCircle className="spin" size={18} /> : item.status === "done" ? <Check size={18} /> : <Images size={18} />}<div><strong>{item.name}</strong><small>{item.message || "Na fila"}</small></div></div>)}</div>}</section><aside className="panel stack"><div><h2>Compartilhamento</h2><p className="muted">Publique quando as fotos terminarem de processar.</p></div><button className="button" onClick={togglePublish}>{published ? "Pausar galeria" : "Publicar galeria"}</button><button className="button secondary" onClick={() => navigator.clipboard.writeText(publicUrl)}><Copy size={16} /> Copiar link</button><code className="event-link">{publicUrl}</code></aside></div></>;
}
