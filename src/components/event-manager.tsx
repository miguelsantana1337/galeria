"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Images,
  LoaderCircle,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  UploadCloud,
  ImagePlus,
  X,
  QrCode,
  MessageCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  extractCaptureTime,
  extractFaces,
  getFaceEngine,
} from "@/lib/face-engine";

type EventInfo = {
  id: string;
  name: string;
  slug: string;
  status: string;
  photo_count: number;
  event_date: string | null;
  share_token: string;
  description: string | null;
  welcome_message: string | null;
  brand_color: string;
  whatsapp_url: string | null;
  instagram_url: string | null;
  expires_at: string | null;
  retention_days: number;
  banner_path: string | null;
  organizer_logos: string[];
  banner_preview_url: string | null;
  logo_preview_urls: (string | null)[];
};
type Photo = {
  id: string;
  original_name: string;
  face_count: number;
  status: string;
  storage_path: string;
  preview_url: string | null;
};
type Metrics = {
  view: number;
  selfie: number;
  match: number;
  no_match: number;
  download: number;
  downloadedPhotos: number;
  consents: number;
};
type QueueItem = {
  file: File;
  status: "waiting" | "processing" | "done" | "error";
  message?: string;
};

export function EventManager({
  event,
  initialPhotos,
  metrics,
}: {
  event: EventInfo;
  initialPhotos: Photo[];
  metrics: Metrics;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos),
    [queue, setQueue] = useState<QueueItem[]>([]),
    [busy, setBusy] = useState(false),
    [published, setPublished] = useState(event.status === "published"),
    [token, setToken] = useState(event.share_token),
    [notice, setNotice] = useState("");
  const [settings, setSettings] = useState({
      name: event.name,
      event_date: event.event_date || "",
      description: event.description || "",
      welcome_message: event.welcome_message || "",
      brand_color: event.brand_color || "#235c3a",
      whatsapp_url: event.whatsapp_url || "",
      instagram_url: event.instagram_url || "",
      retention_days: event.retention_days || 30,
      banner_path: event.banner_path,
      organizer_logos: event.organizer_logos,
    }),
    [saving, setSaving] = useState(false),
    [expiresAt, setExpiresAt] = useState(event.expires_at),
    [bannerPreview, setBannerPreview] = useState(event.banner_preview_url),
    [logoPreviews, setLogoPreviews] = useState<(string | null)[]>(
      event.logo_preview_urls,
    ),
    [qrDataUrl, setQrDataUrl] = useState<string | null>(null),
    [origin, setOrigin] = useState("");
  const publicUrl = useMemo(
    () => `${origin}/evento/${event.slug}?k=${token}`,
    [event.slug, origin, token],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => setOrigin(window.location.origin), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (busy) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  async function upload(selected: File[]) {
    setBusy(true);
    setQueue(selected.map((file) => ({ file, status: "waiting" })));
    try {
      await getFaceEngine();
      const supabase = createSupabaseBrowserClient();
      for (let index = 0; index < selected.length; index++) {
        const file = selected[index];
        setQueue((old) =>
          old.map((item, i) =>
            i === index
              ? {
                  ...item,
                  status: "processing",
                  message: "Identificando rostos…",
                }
              : item,
          ),
        );
        try {
          const [analysis, captureTime] = await Promise.all([
              extractFaces(file),
              extractCaptureTime(file),
            ]),
            safeName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
            path = `${event.id}/${safeName}`;
          setQueue((old) =>
            old.map((item, i) =>
              i === index
                ? {
                    ...item,
                    message: `${analysis.faces.length} rosto(s) · enviando…`,
                  }
                : item,
            ),
          );
          const { error: uploadError } = await supabase.storage
            .from("event-photos")
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          const response = await fetch(`/api/events/${event.id}/photos`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              storagePath: path,
              originalName: file.name,
              width: analysis.width,
              height: analysis.height,
              takenAt: captureTime.takenAt,
              takenAtSource: captureTime.source,
              faces: analysis.faces,
            }),
          });
          if (!response.ok) {
            await supabase.storage.from("event-photos").remove([path]);
            throw new Error((await response.json()).error);
          }
          const result = await response.json();
          setPhotos((old) => [
            ...old,
            {
              id: result.id,
              original_name: file.name,
              face_count: analysis.faces.length,
              status: "ready",
              storage_path: path,
              preview_url: URL.createObjectURL(file),
            },
          ]);
          setQueue((old) =>
            old.map((item, i) =>
              i === index
                ? {
                    ...item,
                    status: "done",
                    message: `${analysis.faces.length} rosto(s) indexado(s)`,
                  }
                : item,
            ),
          );
        } catch (error) {
          setQueue((old) =>
            old.map((item, i) =>
              i === index
                ? {
                    ...item,
                    status: "error",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Falha no processamento",
                  }
                : item,
            ),
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }
  async function chooseFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter(
      (file) => file.type.startsWith("image/") && file.size <= 15 * 1024 * 1024,
    );
    if (files.length) await upload(files);
    e.target.value = "";
  }
  async function togglePublish() {
    const response = await fetch(`/api/events/${event.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publish: !published }),
    });
    if (response.ok) {
      setPublished(!published);
      setNotice(!published ? "Galeria publicada." : "Galeria pausada.");
    }
  }
  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setNotice("Link privado copiado.");
  }
  async function share() {
    if (navigator.share)
      await navigator.share({
        title: event.name,
        text: `Suas fotos de ${event.name}`,
        url: publicUrl,
      });
    else await copyLink();
  }
  async function showQrCode() {
    const QRCode = (await import("qrcode")).default;
    setQrDataUrl(
      await QRCode.toDataURL(publicUrl, {
        width: 720,
        margin: 2,
        color: { dark: "#17211A", light: "#FFFFFF" },
      }),
    );
  }
  async function deleteEvent() {
    if (
      !confirm(
        `Excluir definitivamente ${event.name}, todas as fotos e métricas? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setSaving(true);
    const response = await fetch(`/api/events/${event.id}`, {
      method: "DELETE",
    });
    if (response.ok) router.push("/painel");
    else {
      setSaving(false);
      setNotice((await response.json()).error);
    }
  }
  async function rotateLink() {
    if (!confirm("O link anterior deixará de funcionar. Deseja continuar?"))
      return;
    const response = await fetch(`/api/events/${event.id}/rotate-link`, {
        method: "POST",
      }),
      body = await response.json();
    if (response.ok) {
      setToken(body.token);
      setNotice("Novo link privado criado.");
    } else setNotice(body.error);
  }
  async function saveSettings(
    nextSettings = settings,
    successMessage = "Configurações salvas.",
  ) {
    setSaving(true);
    const response = await fetch(`/api/events/${event.id}/settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nextSettings),
      }),
      body = await response.json();
    setSaving(false);
    if (response.ok) {
      setExpiresAt(body.event.expires_at);
      setNotice(successMessage);
      return true;
    }
    setNotice(body.error);
    return false;
  }
  async function uploadBrandAsset(file: File, kind: "banner" | "logo") {
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setNotice("Use uma imagem de até 8 MB.");
      return;
    }
    if (kind === "logo" && settings.organizer_logos.length >= 5) {
      setNotice("O limite é de cinco logos por evento.");
      return;
    }
    setSaving(true);
    const path = `${event.id}/branding/${kind}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error } = await createSupabaseBrowserClient()
      .storage.from("event-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    setSaving(false);
    if (error) {
      setNotice("Não foi possível enviar esta imagem.");
      return;
    }
    const preview = URL.createObjectURL(file);
    if (kind === "banner") {
      const previousPreview = bannerPreview;
      const next = { ...settings, banner_path: path };
      setSettings(next);
      setBannerPreview(preview);
      if (!(await saveSettings(next, "Banner enviado e salvo."))) {
        setSettings(settings);
        setBannerPreview(previousPreview);
        URL.revokeObjectURL(preview);
        await createSupabaseBrowserClient()
          .storage.from("event-photos")
          .remove([path]);
      }
    } else {
      const next = {
        ...settings,
        organizer_logos: [...settings.organizer_logos, path],
      };
      setSettings(next);
      setLogoPreviews((old) => [...old, preview]);
      if (!(await saveSettings(next, "Logo enviado e salvo."))) {
        setSettings(settings);
        setLogoPreviews((old) => old.slice(0, -1));
        URL.revokeObjectURL(preview);
        await createSupabaseBrowserClient()
          .storage.from("event-photos")
          .remove([path]);
      }
    }
  }
  function removeLogo(index: number) {
    setSettings((old) => ({
      ...old,
      organizer_logos: old.organizer_logos.filter((_, i) => i !== index),
    }));
    setLogoPreviews((old) => old.filter((_, i) => i !== index));
  }
  async function removePhoto(photo: Photo) {
    if (!confirm(`Excluir ${photo.original_name}?`)) return;
    const response = await fetch(`/api/events/${event.id}/photos`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photoId: photo.id }),
    });
    if (response.ok)
      setPhotos((old) => old.filter((item) => item.id !== photo.id));
    else setNotice((await response.json()).error);
  }
  const failed = queue
      .filter((item) => item.status === "error")
      .map((item) => item.file),
    faces = photos.reduce((sum, p) => sum + p.face_count, 0),
    conversion = metrics.selfie
      ? Math.round((metrics.match / metrics.selfie) * 100)
      : 0;
  const checklist = [
    {
      label: "Nome e data definidos",
      done: Boolean(settings.name && settings.event_date),
    },
    {
      label: "Descrição preenchida",
      done: Boolean(settings.description.trim()),
    },
    { label: "Banner configurado", done: Boolean(settings.banner_path) },
    { label: "Pelo menos uma foto", done: photos.length > 0 },
    {
      label: "Identidade dos organizadores",
      done: settings.organizer_logos.length > 0,
    },
  ];
  return (
    <>
      <header className="topbar compact">
        <a className="brand" href="/painel">
          Minha Galeria<span className="brand-dot">.</span>
        </a>
        <span className={`status ${published ? "live" : ""}`}>
          {published ? "Publicado" : "Rascunho"}
        </span>
      </header>
      <header className="page-header">
        <span className="eyebrow">
          {event.event_date
            ? new Date(`${event.event_date}T12:00:00`).toLocaleDateString(
                "pt-BR",
              )
            : "Evento"}
        </span>
        <h1>{event.name}</h1>
        <p className="lead align-left">
          {photos.length} fotos · {faces} rostos encontrados
        </p>
      </header>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <section className="metric-grid">
        <div>
          <strong>{metrics.view}</strong>
          <span>visitas</span>
        </div>
        <div>
          <strong>{metrics.selfie}</strong>
          <span>selfies</span>
        </div>
        <div>
          <strong>{metrics.match}</strong>
          <span>resultados</span>
        </div>
        <div>
          <strong>{conversion}%</strong>
          <span>conversão</span>
        </div>
        <div>
          <strong>{metrics.downloadedPhotos}</strong>
          <span>downloads</span>
        </div>
      </section>
      <div className="dashboard-grid">
        <div className="stack">
          <section className="panel stack">
            <div>
              <h2>Fotos do evento</h2>
              <p className="muted">
                Análise facial local, envio seguro e fila com nova tentativa.
              </p>
            </div>
            <label className={`dropzone ${busy ? "disabled" : ""}`}>
              <UploadCloud size={30} />
              <strong>
                {busy ? "Processando fotos…" : "Selecionar fotos"}
              </strong>
              <span>JPEG, PNG ou WebP · até 15 MB cada</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={chooseFiles}
                disabled={busy}
                hidden
              />
            </label>
            {queue.length > 0 && (
              <div className="queue" aria-live="polite">
                {queue.map((item, i) => (
                  <div
                    className={`queue-row ${item.status}`}
                    key={`${item.file.name}-${i}`}
                  >
                    {item.status === "processing" ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : item.status === "done" ? (
                      <Check size={18} />
                    ) : (
                      <Images size={18} />
                    )}
                    <div>
                      <strong>{item.file.name}</strong>
                      <small>{item.message || "Na fila"}</small>
                    </div>
                  </div>
                ))}
                {failed.length > 0 && !busy && (
                  <button
                    className="button secondary"
                    onClick={() => upload(failed)}
                  >
                    <RefreshCw size={16} /> Tentar falhas novamente
                  </button>
                )}
              </div>
            )}
          </section>
          {photos.length > 0 && (
            <section className="panel stack">
              <div>
                <h2>Revisão das fotos</h2>
                <p className="muted">
                  Confira miniaturas e remova arquivos incorretos antes de
                  publicar.
                </p>
              </div>
              <div className="admin-photo-grid">
                {photos.map((photo) => (
                  <article key={photo.id}>
                    {photo.preview_url ? (
                      <Image
                        src={photo.preview_url}
                        alt={photo.original_name}
                        width={260}
                        height={180}
                        loading="lazy"
                        sizes="(max-width: 600px) 50vw, 260px"
                        unoptimized
                      />
                    ) : (
                      <div className="preview-placeholder">
                        <Images />
                      </div>
                    )}
                    <div>
                      <span>
                        <strong>{photo.original_name}</strong>
                        <small>{photo.face_count} rosto(s)</small>
                      </span>
                      <button
                        aria-label={`Excluir ${photo.original_name}`}
                        onClick={() => removePhoto(photo)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="stack">
          <section className="panel stack publish-checklist">
            <div>
              <h2>Pronto para publicar?</h2>
              <p className="muted">
                Revise os itens essenciais da experiência.
              </p>
            </div>
            {checklist.map((item) => (
              <div key={item.label} className={item.done ? "done" : ""}>
                {item.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                <span>{item.label}</span>
              </div>
            ))}
            <small>
              {checklist.filter((item) => item.done).length} de{" "}
              {checklist.length} concluídos
            </small>
          </section>
          <section className="panel stack">
            <div>
              <h2>Compartilhamento</h2>
              <p className="muted">
                Somente quem recebe o link privado consegue abrir a galeria.
              </p>
            </div>
            <button
              className="button"
              disabled={!photos.length}
              onClick={togglePublish}
            >
              {published ? "Pausar galeria" : "Publicar galeria"}
            </button>
            <button className="button secondary" onClick={share}>
              <Share2 size={16} /> Compartilhar
            </button>
            <a
              className="button secondary"
              href={`https://wa.me/?text=${encodeURIComponent(`${event.name}: ${publicUrl}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={16} /> Enviar pelo WhatsApp
            </a>
            <button className="button secondary" onClick={showQrCode}>
              <QrCode size={16} /> Gerar QR Code
            </button>
            {qrDataUrl && (
              <div className="qr-card">
                <Image
                  src={qrDataUrl}
                  alt={`QR Code de ${event.name}`}
                  width={260}
                  height={260}
                  unoptimized
                />
                <a
                  className="text-button"
                  href={qrDataUrl}
                  download={`qr-${event.slug}.png`}
                >
                  Baixar QR Code
                </a>
              </div>
            )}
            <button className="button secondary" onClick={copyLink}>
              <Copy size={16} /> Copiar link
            </button>
            <a
              className="button secondary"
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} /> Abrir galeria
            </a>
            <code className="event-link">{publicUrl}</code>
            <button className="text-button" onClick={rotateLink}>
              Gerar um novo link privado
            </button>
          </section>
          <section className="panel stack">
            <div>
              <h2>Personalização</h2>
              <p className="muted">
                Use os dados reais do evento. Campos sociais são opcionais.
              </p>
            </div>
            <label className="field">
              <span>Nome do evento</span>
              <input
                value={settings.name}
                maxLength={100}
                onChange={(e) =>
                  setSettings({ ...settings, name: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Data do evento</span>
              <input
                type="date"
                value={settings.event_date}
                onChange={(e) =>
                  setSettings({ ...settings, event_date: e.target.value })
                }
              />
            </label>
            <div className="branding-editor">
              <div className="brand-upload-block">
                <span className="field-label">Banner do evento</span>
                {bannerPreview ? (
                  <div className="banner-editor-preview">
                    <Image
                      src={bannerPreview}
                      alt="Prévia do banner"
                      width={560}
                      height={260}
                      unoptimized
                    />
                    <button
                      type="button"
                      aria-label="Remover banner"
                      onClick={() => {
                        setBannerPreview(null);
                        setSettings({ ...settings, banner_path: null });
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="brand-empty">
                    <ImagePlus />
                    <span>Imagem horizontal, recomendação 1600 × 900</span>
                  </div>
                )}
                <label className="button secondary upload-brand-button">
                  <ImagePlus size={16} />
                  {bannerPreview ? "Trocar banner" : "Adicionar banner"}
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadBrandAsset(file, "banner");
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="brand-upload-block">
                <span className="field-label">
                  Logos dos organizadores{" "}
                  <small>{settings.organizer_logos.length}/5</small>
                </span>
                <div className="logo-editor-grid">
                  {logoPreviews.map((url, index) => (
                    <div key={`${settings.organizer_logos[index]}-${index}`}>
                      {url ? (
                        <Image
                          src={url}
                          alt={`Logo ${index + 1}`}
                          width={120}
                          height={72}
                          unoptimized
                        />
                      ) : (
                        <ImagePlus />
                      )}
                      <button
                        type="button"
                        aria-label={`Remover logo ${index + 1}`}
                        onClick={() => removeLogo(index)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {settings.organizer_logos.length < 5 && (
                  <label className="button secondary upload-brand-button">
                    <ImagePlus size={16} /> Adicionar logo
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadBrandAsset(file, "logo");
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
            <label className="field">
              <span>Descrição do evento</span>
              <textarea
                value={settings.description}
                maxLength={800}
                placeholder="Conte brevemente o que tornou este evento especial."
                onChange={(e) =>
                  setSettings({ ...settings, description: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Mensagem de boas-vindas</span>
              <textarea
                value={settings.welcome_message}
                maxLength={500}
                onChange={(e) =>
                  setSettings({ ...settings, welcome_message: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Cor do evento</span>
              <input
                type="color"
                value={settings.brand_color}
                onChange={(e) =>
                  setSettings({ ...settings, brand_color: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>WhatsApp (URL completa)</span>
              <input
                type="url"
                placeholder="https://wa.me/55…"
                value={settings.whatsapp_url}
                onChange={(e) =>
                  setSettings({ ...settings, whatsapp_url: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Instagram (URL completa)</span>
              <input
                type="url"
                placeholder="https://instagram.com/…"
                value={settings.instagram_url}
                onChange={(e) =>
                  setSettings({ ...settings, instagram_url: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Galeria disponível por</span>
              <select
                value={settings.retention_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    retention_days: Number(e.target.value),
                  })
                }
              >
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
                <option value={180}>180 dias</option>
                <option value={365}>1 ano</option>
              </select>
            </label>
            <button
              className="button"
              onClick={() => void saveSettings()}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Salvando…" : "Salvar configurações"}
            </button>
            {expiresAt && (
              <small className="muted">
                Expira em{" "}
                {new Date(expiresAt).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </small>
            )}
          </section>
          <section className="panel stack compact-panel">
            <h2>
              <BarChart3 size={20} /> Privacidade
            </h2>
            <p className="muted">
              {metrics.consents} consentimentos registrados · {metrics.no_match}{" "}
              buscas sem resultado. Selfies nunca são armazenadas.
            </p>
          </section>
          <section className="panel stack danger-zone">
            <div>
              <h2>Excluir evento</h2>
              <p className="muted">
                Remove permanentemente fotos, descritores, métricas, banner e
                logos.
              </p>
            </div>
            <button
              className="button danger-button"
              disabled={saving}
              onClick={deleteEvent}
            >
              <Trash2 size={16} /> Excluir permanentemente
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}
