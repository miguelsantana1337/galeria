"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Camera, Download, LoaderCircle, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { extractFaces, getFaceEngine } from "@/lib/face-engine";

type FaceRecord = { photo_id: string; descriptor: number[] };
type EventData = { event: { name: string; event_date: string | null; match_threshold: number }; faces: FaceRecord[] };
type ResultPhoto = { id: string; name: string; width: number; height: number; url: string };

export function GalleryFinder({ slug }: { slug: string }) {
  const [data, setData] = useState<EventData | null>(null); const [status, setStatus] = useState("Preparando a galeria…"); const [error, setError] = useState(""); const [photos, setPhotos] = useState<ResultPhoto[]>([]); const [busy, setBusy] = useState(false); const [weak, setWeak] = useState(false);
  useEffect(() => { Promise.all([fetch(`/api/public/events/${slug}`).then(async (r) => { if (!r.ok) throw new Error("Esta galeria ainda não está disponível."); return r.json(); }), getFaceEngine(setStatus)]).then(([eventData]) => { setData(eventData); setStatus(""); }).catch((e) => setError(e.message)); }, [slug]);
  async function find(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !data) return; setBusy(true); setError(""); setPhotos([]); setWeak(false);
    try {
      setStatus("Lendo seu rosto…"); const analysis = await extractFaces(file, 1); if (analysis.faces.length !== 1) throw new Error("Não encontrei um rosto nítido. Use uma foto frontal, bem iluminada e sem outras pessoas.");
      setStatus("Procurando você nas fotos…"); const human = await getFaceEngine(); const query = analysis.faces[0].descriptor;
      const ranked = data.faces.map((face) => ({ photoId: face.photo_id, similarity: human.match.similarity(query, face.descriptor) })).sort((a, b) => b.similarity - a.similarity);
      const strongIds = [...new Set(ranked.filter((item) => item.similarity >= data.event.match_threshold).map((item) => item.photoId))];
      const photoIds = strongIds.length ? strongIds : [...new Set(ranked.slice(0, 6).map((item) => item.photoId))]; setWeak(strongIds.length === 0);
      if (!photoIds.length) throw new Error("Este evento ainda não possui rostos indexados.");
      const response = await fetch(`/api/public/events/${slug}/photos`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ photoIds }) }); if (!response.ok) throw new Error("Não foi possível carregar as fotos encontradas.");
      setPhotos((await response.json()).photos); setStatus("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível analisar a selfie."); setStatus(""); } finally { setBusy(false); e.target.value = ""; }
  }
  if (error && !data) return <main className="finder-shell"><div className="finder-card"><span className="brand">Fotos do Santana<span className="brand-dot">.</span></span><h1>Galeria indisponível.</h1><p className="lead">{error}</p><Link className="button" href="/">Voltar ao início</Link></div></main>;
  return <main className="finder-shell"><header className="finder-top"><Link className="brand" href="/">Fotos do Santana<span className="brand-dot">.</span></Link><span className="privacy"><LockKeyhole size={14} /> Selfie não armazenada</span></header><section className="finder-card">{!photos.length ? <><span className="eyebrow"><Sparkles size={14} /> {data?.event.name || "Seu evento"}</span><h1>Você está em quais momentos?</h1><p className="lead">Escolha uma selfie frontal. A análise acontece aqui no seu aparelho.</p><label className={`selfie-button ${busy || !data ? "disabled" : ""}`}><Camera size={22} />{busy ? status : status || "Escolher ou tirar selfie"}<input hidden type="file" accept="image/*" capture="user" disabled={busy || !data} onChange={find} /></label>{busy && <LoaderCircle className="spin finder-loader" />}{error && <p className="error">{error}</p>}</> : <><span className="eyebrow">Suas fotos</span><h1>{weak ? "Talvez seja você." : `Encontramos ${photos.length}.`}</h1><p className="lead">{weak ? "Não houve uma correspondência forte. Mostramos as imagens mais parecidas para você conferir." : "Toque em uma foto para abrir ou use o botão para baixar."}</p><div className="photo-grid">{photos.map((photo) => <article key={photo.id} className="photo-card"><Image src={photo.url} alt={`Foto ${photo.name}`} width={photo.width || 1200} height={photo.height || 900} unoptimized /><a className="download" href={photo.url} download={photo.name} target="_blank" rel="noreferrer"><Download size={17} /> Baixar foto</a></article>)}</div><button className="button secondary retry" onClick={() => { setPhotos([]); setError(""); }}><RefreshCw size={16} /> Tentar outra selfie</button></>}</section></main>;
}
