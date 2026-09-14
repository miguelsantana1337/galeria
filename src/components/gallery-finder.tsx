"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChangeEvent,
  CSSProperties,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Check,
  Download,
  ExternalLink,
  Images,
  Heart,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Share2,
  Sparkles,
  Package,
  X,
} from "lucide-react";
import { extractFaces, getFaceEngine } from "@/lib/face-engine";

type FaceRecord = { photo_id: string; descriptor: number[] };
type PhotoMeta = { id: string; taken_at: string | null };
type EventData = {
  event: {
    name: string;
    description: string | null;
    bannerUrl: string | null;
    logoUrls: string[];
    match_threshold: number;
    welcome_message: string | null;
    brand_color: string;
    whatsapp_url: string | null;
    instagram_url: string | null;
    expires_at: string | null;
  };
  faces: FaceRecord[];
  photos: PhotoMeta[];
};
type ResultPhoto = {
  id: string;
  name: string;
  width: number;
  height: number;
  previewUrl: string;
};
type Mode = "gallery" | "selfie" | "matches";
const PAGE_SIZE = 24;

function activity(
  slug: string,
  key: string,
  kind: string,
  photoCount?: number,
  consent?: boolean,
) {
  return fetch(`/api/public/events/${slug}/activity`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, kind, photoCount, consent }),
    keepalive: true,
  }).catch(() => undefined);
}

export function GalleryFinder({
  slug,
  accessKey,
}: {
  slug: string;
  accessKey: string;
}) {
  const [data, setData] = useState<EventData | null>(null),
    [photos, setPhotos] = useState<ResultPhoto[]>([]),
    [currentIds, setCurrentIds] = useState<string[]>([]),
    [loadedCount, setLoadedCount] = useState(0),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [favorites, setFavorites] = useState<Set<string>>(new Set()),
    [favoritesOnly, setFavoritesOnly] = useState(false),
    [mode, setMode] = useState<Mode>("gallery"),
    [hour, setHour] = useState("all"),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Abrindo a galeria…"),
    [error, setError] = useState(
      accessKey
        ? ""
        : "Este link está incompleto. Peça o link privado ao fotógrafo.",
    ),
    [consent, setConsent] = useState(false),
    [previewId, setPreviewId] = useState<string | null>(null),
    [savingPhotoId, setSavingPhotoId] = useState<string | null>(null);
  const announced = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const cachedFaces = useRef<FaceRecord[] | null>(null);
  const hours = useMemo(
    () =>
      [
        ...new Set(
          (data?.photos || []).flatMap((photo) =>
            photo.taken_at ? [new Date(photo.taken_at).getHours()] : [],
          ),
        ),
      ].sort((a, b) => a - b),
    [data],
  );
  const previewIndex = photos.findIndex((photo) => photo.id === previewId);
  const previewPhoto = previewIndex >= 0 ? photos[previewIndex] : null;

  useEffect(() => {
    if (!previewPhoto) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewId(null);
      if (event.key === "ArrowLeft" && previewIndex > 0)
        setPreviewId(photos[previewIndex - 1].id);
      if (event.key === "ArrowRight" && previewIndex < photos.length - 1)
        setPreviewId(photos[previewIndex + 1].id);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [photos, previewIndex, previewPhoto]);
  useEffect(() => {
    const next = photos[previewIndex + 1];
    if (!previewPhoto || !next) return;
    const preload = new window.Image();
    preload.src = next.previewUrl;
  }, [photos, previewIndex, previewPhoto]);

  const loadPhotos = useCallback(
    async (ids: string[], append = false) => {
      if (!ids.length) {
        setPhotos([]);
        return;
      }
      setBusy(true);
      setError("");
      try {
        const response = await fetch(`/api/public/events/${slug}/photos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: accessKey, photoIds: ids }),
        });
        if (!response.ok)
          throw new Error("Não foi possível carregar as fotos.");
        const incoming = (await response.json()).photos || [];
        setPhotos((old) =>
          append
            ? [
                ...old,
                ...incoming.filter(
                  (photo: ResultPhoto) =>
                    !old.some((item) => item.id === photo.id),
                ),
              ]
            : incoming,
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar as fotos.",
        );
      } finally {
        setBusy(false);
        setStatus("");
      }
    },
    [accessKey, slug],
  );

  const showIds = useCallback(
    async (ids: string[]) => {
      setCurrentIds(ids);
      setLoadedCount(Math.min(PAGE_SIZE, ids.length));
      setPhotos([]);
      await loadPhotos(ids.slice(0, PAGE_SIZE));
    },
    [loadPhotos],
  );

  useEffect(() => {
    if (!accessKey) return;
    fetch(`/api/public/events/${slug}?k=${encodeURIComponent(accessKey)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 410
              ? "Esta galeria expirou. Fale com o fotógrafo."
              : "Esta galeria não está disponível ou o link está incompleto.",
          );
        return response.json();
      })
      .then((eventData: EventData) => {
        setData(eventData);
        setStatus("");
        void showIds(eventData.photos.map((photo) => photo.id));
        if (!announced.current) {
          announced.current = true;
          void activity(slug, accessKey, "view");
        }
      })
      .catch((e) => setError(e.message));
  }, [accessKey, slug, showIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setFavorites(
          new Set(
            JSON.parse(
              localStorage.getItem(`minha-galeria:favoritos:${slug}`) || "[]",
            ),
          ),
        );
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || busy || loadedCount >= currentIds.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const next = currentIds.slice(loadedCount, loadedCount + PAGE_SIZE);
          setLoadedCount((count) =>
            Math.min(count + PAGE_SIZE, currentIds.length),
          );
          void loadPhotos(next, true);
        }
      },
      { rootMargin: "500px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [busy, currentIds, loadedCount, loadPhotos]);

  async function filterByHour(value: string) {
    setHour(value);
    setMode("gallery");
    if (!data) return;
    const ids =
      value === "all"
        ? data.photos.map((photo) => photo.id)
        : data.photos
            .filter(
              (photo) =>
                photo.taken_at &&
                new Date(photo.taken_at).getHours() === Number(value),
            )
            .map((photo) => photo.id);
    setFavoritesOnly(false);
    await showIds(ids);
  }
  async function find(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !data || !consent) return;
    setBusy(true);
    setError("");
    void activity(slug, accessKey, "selfie", undefined, true);
    try {
      setStatus("Preparando reconhecimento facial…");
      await getFaceEngine((message) => setStatus(message));
      setStatus("Lendo seu rosto…");
      const analysis = await extractFaces(file, 1);
      if (analysis.faces.length !== 1)
        throw new Error(
          "Não encontrei um rosto nítido. Use uma selfie frontal, com boa luz e sem outras pessoas.",
        );
      setStatus("Procurando você nas fotos…");
      if (!cachedFaces.current) {
        const response = await fetch(
          `/api/public/events/${slug}/faces?k=${encodeURIComponent(accessKey)}`,
          { cache: "no-store" },
        );
        if (!response.ok)
          throw new Error(
            "Não foi possível carregar a busca facial. Verifique sua internet e tente novamente.",
          );
        const payload = await response.json();
        cachedFaces.current = ((payload.faces || []) as FaceRecord[]).filter(
          (face) =>
            typeof face.photo_id === "string" &&
            Array.isArray(face.descriptor) &&
            face.descriptor.length === 1024 &&
            face.descriptor.every(Number.isFinite),
        );
      }
      const faceRecords = cachedFaces.current;
      if (!faceRecords.length)
        throw new Error(
          "Este evento ainda não possui rostos indexados. Fale com o fotógrafo.",
        );
      const human = await getFaceEngine(),
        query = analysis.faces[0].descriptor;
      const ids = [
        ...new Set(
          faceRecords
            .filter(
              (face) =>
                human.match.similarity(query, face.descriptor) >=
                data.event.match_threshold,
            )
            .map((face) => face.photo_id),
        ),
      ];
      if (!ids.length) {
        void activity(slug, accessKey, "no_match");
        throw new Error(
          "Não encontramos você com segurança. Tente outra selfie ou explore todas as fotos.",
        );
      }
      await showIds(ids);
      setMode("matches");
      void activity(slug, accessKey, "match", ids.length);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível analisar a selfie.",
      );
      setStatus("");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  async function getDownload(photoId: string) {
    const response = await fetch(
      `/api/public/events/${slug}/download/${photoId}?k=${encodeURIComponent(accessKey)}`,
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error("Download indisponível.");
    return response.json() as Promise<{ url: string; name: string }>;
  }
  async function download(photo: ResultPhoto) {
    setSavingPhotoId(photo.id);
    setError("");
    try {
      const file = await getDownload(photo.id);
      const response = await fetch(file.url);
      if (!response.ok) throw new Error("Não foi possível abrir esta foto.");
      const blob = await response.blob();
      const sharedFile = new File([blob], file.name, {
        type: blob.type || "image/jpeg",
      });

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [sharedFile] })
      ) {
        await navigator.share({
          files: [sharedFile],
          title: data?.event.name || "Minha Galeria",
        });
        void activity(slug, accessKey, "download", 1);
        return;
      }

      void activity(slug, accessKey, "download", 1);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Download indisponível.");
    } finally {
      setSavingPhotoId(null);
    }
  }
  function toggleFavorite(id: string) {
    setFavorites((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(
        `minha-galeria:favoritos:${slug}`,
        JSON.stringify([...next]),
      );
      return next;
    });
  }
  function toggleSelected(id: string) {
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function toggleFavoritesView() {
    if (!data) return;
    const next = !favoritesOnly;
    setFavoritesOnly(next);
    setHour("all");
    setMode("gallery");
    await showIds(
      next
        ? data.photos.map((p) => p.id).filter((id) => favorites.has(id))
        : data.photos.map((p) => p.id),
    );
  }
  async function downloadZip() {
    const ids = [...selected];
    if (!ids.length) return;
    if (ids.length > 50) {
      setError("Selecione no máximo 50 fotos por arquivo ZIP.");
      return;
    }
    setBusy(true);
    setStatus(`Preparando 0 de ${ids.length}…`);
    try {
      const JSZip = (await import("jszip")).default,
        zip = new JSZip();
      for (let i = 0; i < ids.length; i++) {
        setStatus(`Preparando ${i + 1} de ${ids.length}…`);
        const item = await getDownload(ids[i]),
          blob = await fetch(item.url).then((r) => r.blob());
        zip.file(item.name, blob);
      }
      const blob = await zip.generateAsync({
          type: "blob",
          compression: "STORE",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `${data?.event.name || "minha-galeria"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      void activity(slug, accessKey, "download", ids.length);
      setSelected(new Set());
    } catch {
      setError("Não foi possível montar o ZIP. Tente selecionar menos fotos.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }
  async function shareSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    if (ids.length > 20) {
      setError(
        "Para o celular não ficar pesado, compartilhe até 20 fotos por vez.",
      );
      return;
    }
    if (
      typeof navigator.share !== "function" ||
      typeof navigator.canShare !== "function"
    ) {
      setError(
        "Este navegador não permite compartilhar várias fotos. Abra cada foto e toque em Salvar foto.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setStatus(`Preparando 0 de ${ids.length}…`);
    try {
      const files: File[] = [];
      for (let index = 0; index < ids.length; index++) {
        setStatus(`Preparando ${index + 1} de ${ids.length}…`);
        const item = await getDownload(ids[index]);
        const response = await fetch(item.url);
        if (!response.ok) throw new Error("Não foi possível abrir uma foto.");
        const blob = await response.blob();
        files.push(
          new File([blob], item.name, {
            type: blob.type || "image/jpeg",
          }),
        );
      }
      if (!navigator.canShare({ files }))
        throw new Error(
          "Este aparelho não permite compartilhar tantas fotos juntas. Selecione menos fotos.",
        );
      await navigator.share({
        files,
        title: data?.event.name || "Minha Galeria",
      });
      void activity(slug, accessKey, "download", ids.length);
      setSelected(new Set());
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível compartilhar as fotos.",
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }
  function handleSelectedPhotos() {
    if (window.matchMedia("(pointer: coarse)").matches) void shareSelected();
    else void downloadZip();
  }
  if (error && !data)
    return (
      <main className="finder-shell">
        <div className="finder-card">
          <span className="brand">
            Minha Galeria<span className="brand-dot">.</span>
          </span>
          <h1>Galeria indisponível.</h1>
          <p className="lead">{error}</p>
          <Link className="button inline-button" href="/">
            Voltar ao início
          </Link>
        </div>
      </main>
    );

  return (
    <main
      className="finder-shell"
      style={
        {
          "--event-color": data?.event.brand_color || "#235c3a",
        } as CSSProperties
      }
    >
      <header className="finder-top">
        <Link className="brand" href="/">
          Minha Galeria<span className="brand-dot">.</span>
        </Link>
        <span className="privacy">
          <LockKeyhole size={14} /> Link privado
        </span>
      </header>
      {data && (
        <section
          className={`event-cover ${data.event.bannerUrl ? "has-banner" : ""}`}
          style={{ "--event-color": data.event.brand_color } as CSSProperties}
        >
          {data.event.bannerUrl && (
            <Image
              src={data.event.bannerUrl}
              alt={`Banner de ${data.event.name}`}
              width={1600}
              height={900}
              priority
              unoptimized
            />
          )}
          <div className="event-cover-shade" />
          <div className="event-cover-content">
            <span className="cover-kicker">Sua galeria do evento</span>
            <h1>{data.event.name}</h1>
            {data.event.description && <p>{data.event.description}</p>}
          </div>
          {data.event.logoUrls.length > 0 && (
            <div className="organizer-strip">
              <span>Realização</span>
              <div>
                {data.event.logoUrls.map((url, index) => (
                  <Image
                    key={url}
                    src={url}
                    alt={`Logo do organizador ${index + 1}`}
                    width={140}
                    height={72}
                    unoptimized
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      <section className="finder-card gallery-view">
        <span className="eyebrow">
          <Sparkles size={14} /> {data?.event.name || "Seu evento"}
        </span>
        {mode === "selfie" ? (
          <>
            <h1>Encontre suas fotos.</h1>
            <p className="lead">
              A selfie é um atalho opcional. Ela é analisada neste aparelho e
              nunca é armazenada.
            </p>
            <div className="selfie-guide">
              <span>
                <CheckCircle2 size={16} /> Olhe para a câmera
              </span>
              <span>
                <CheckCircle2 size={16} /> Use boa iluminação
              </span>
              <span>
                <CheckCircle2 size={16} /> Apareça sozinho
              </span>
            </div>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Autorizo o reconhecimento facial apenas para localizar minhas
                fotos neste evento. Li a política de privacidade.
              </span>
            </label>
            <label
              className={`selfie-button ${busy || !data || !consent ? "disabled" : ""}`}
            >
              <Camera size={22} />
              {busy ? status : "Escolher ou tirar selfie"}
              <input
                hidden
                type="file"
                accept="image/*"
                disabled={busy || !data || !consent}
                onChange={find}
              />
            </label>
            {consent && !busy && (
              <p className="privacy-note">
                Escolha uma foto existente, um arquivo ou abra a câmera.
              </p>
            )}
            {!consent && (
              <p className="privacy-note">
                Marque a autorização acima para liberar a selfie.
              </p>
            )}
            <Link className="privacy-link" href="/privacidade" target="_blank">
              Como protegemos seus dados
            </Link>
            <button
              className="text-button gallery-back"
              onClick={() => {
                setMode("gallery");
                setError("");
                void filterByHour(hour);
              }}
            >
              <Images size={16} /> Prefiro explorar a galeria
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </>
        ) : (
          <>
            <h1>
              {mode === "matches"
                ? `Encontramos ${photos.length}.`
                : "Reviva cada momento."}
            </h1>
            <p className="lead">
              {mode === "matches"
                ? "Estas são as fotos localizadas pela selfie. Você também pode explorar toda a galeria."
                : data?.event.welcome_message ||
                  "Veja todas as fotos ou filtre pelo horário em que o seu momento aconteceu."}
            </p>
            <div className="gallery-tools">
              <label className="time-filter">
                <Clock3 size={18} />
                <span>Horário</span>
                <select
                  value={hour}
                  onChange={(e) => void filterByHour(e.target.value)}
                >
                  <option value="all">Todas as fotos</option>
                  {hours.map((value) => (
                    <option key={value} value={value}>
                      {String(value).padStart(2, "0")}:00–
                      {String(value).padStart(2, "0")}:59
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button secondary"
                onClick={() => {
                  setMode("selfie");
                  setError("");
                }}
              >
                <Camera size={18} /> Encontrar pela selfie
              </button>
              <button
                className={`button secondary ${favoritesOnly ? "active-filter" : ""}`}
                onClick={() => void toggleFavoritesView()}
              >
                <Heart
                  size={18}
                  fill={favoritesOnly ? "currentColor" : "none"}
                />{" "}
                Favoritas {favorites.size ? `(${favorites.size})` : ""}
              </button>
              {favorites.size > 0 && (
                <button
                  className="button secondary"
                  onClick={() => setSelected(new Set(favorites))}
                >
                  <Check size={18} /> Selecionar favoritas
                </button>
              )}
            </div>
            {hours.length === 0 && data && (
              <p className="timeline-note">
                As fotos deste evento não possuem horário da câmera. Elas
                continuam disponíveis abaixo.
              </p>
            )}
            {busy && (
              <div className="gallery-skeletons" aria-label="Carregando fotos">
                {Array.from({ length: 6 }, (_, index) => (
                  <span key={index} />
                ))}
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}{" "}
            {!busy && photos.length === 0 && (
              <div className="empty-gallery">
                <Clock3 />
                <strong>Nenhuma foto neste horário.</strong>
                <button
                  className="text-button"
                  onClick={() => void filterByHour("all")}
                >
                  Ver todas as fotos
                </button>
              </div>
            )}
            <div className="photo-grid">
              {photos.map((photo) => (
                <article
                  key={photo.id}
                  className={`photo-card ${selected.has(photo.id) ? "selected" : ""}`}
                >
                  <div className="photo-card-actions">
                    <button
                      aria-label={
                        selected.has(photo.id)
                          ? "Remover da seleção"
                          : "Selecionar foto"
                      }
                      onClick={() => toggleSelected(photo.id)}
                    >
                      {selected.has(photo.id) ? <Check size={18} /> : <span />}
                    </button>
                    <button
                      aria-label={
                        favorites.has(photo.id)
                          ? "Remover dos favoritos"
                          : "Favoritar foto"
                      }
                      onClick={() => toggleFavorite(photo.id)}
                    >
                      <Heart
                        size={18}
                        fill={favorites.has(photo.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                  <button
                    className="photo-preview-trigger"
                    onClick={() => setPreviewId(photo.id)}
                    aria-label={`Ampliar ${photo.name}`}
                  >
                    <Image
                      src={photo.previewUrl}
                      alt={`Foto ${photo.name}`}
                      width={720}
                      height={540}
                      loading="lazy"
                      sizes="(max-width: 600px) 100vw, (max-width: 820px) 50vw, 33vw"
                      unoptimized
                    />
                  </button>
                  <button
                    className="download"
                    disabled={savingPhotoId === photo.id}
                    onClick={() => download(photo)}
                  >
                    <span className="mobile-save-icon">
                      <Share2 size={17} />
                    </span>
                    <span className="desktop-save-icon">
                      <Download size={17} />
                    </span>
                    <span className="mobile-save-label">
                      {savingPhotoId === photo.id
                        ? "Preparando foto…"
                        : "Salvar foto"}
                    </span>
                    <span className="desktop-save-label">
                      {savingPhotoId === photo.id
                        ? "Preparando original…"
                        : "Baixar original"}
                    </span>
                  </button>
                </article>
              ))}
            </div>
            <p className="ios-save-note">
              No celular, toque em <strong>Salvar foto</strong> e escolha
              <strong> Fotos ou Salvar imagem</strong>.
            </p>
            <div ref={sentinel} className="load-sentinel" aria-hidden="true" />
            {!busy && loadedCount < currentIds.length && (
              <button
                className="button secondary load-more"
                onClick={() => {
                  const next = currentIds.slice(
                    loadedCount,
                    loadedCount + PAGE_SIZE,
                  );
                  setLoadedCount((count) =>
                    Math.min(count + PAGE_SIZE, currentIds.length),
                  );
                  void loadPhotos(next, true);
                }}
              >
                Carregar mais fotos
              </button>
            )}
            <div className="result-actions">
              {mode === "matches" && (
                <button
                  className="button secondary"
                  onClick={() => void filterByHour("all")}
                >
                  <RefreshCw size={16} /> Ver todas as fotos
                </button>
              )}
              {data?.event.whatsapp_url && (
                <a
                  className="button secondary inline-button"
                  href={data.event.whatsapp_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar com o fotógrafo <ExternalLink size={15} />
                </a>
              )}
            </div>
          </>
        )}
      </section>
      {selected.size > 0 && (
        <aside className="selection-bar">
          <span>
            <strong>{selected.size}</strong>{" "}
            {selected.size === 1 ? "foto selecionada" : "fotos selecionadas"}
          </span>
          <button
            className="text-button"
            onClick={() => setSelected(new Set())}
          >
            Limpar
          </button>
          <button
            className="button"
            disabled={busy}
            onClick={handleSelectedPhotos}
          >
            <span className="desktop-save-icon">
              <Package size={18} />
            </span>
            <span className="mobile-save-icon">
              <Share2 size={18} />
            </span>
            <span className="desktop-save-label">
              {busy ? status : "Baixar ZIP"}
            </span>
            <span className="mobile-save-label">
              {busy ? status : "Compartilhar fotos"}
            </span>
          </button>
        </aside>
      )}
      {previewPhoto && (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização de ${previewPhoto.name}`}
          onClick={() => setPreviewId(null)}
        >
          <button
            className="lightbox-close"
            onClick={() => setPreviewId(null)}
            aria-label="Fechar visualização"
          >
            <X size={24} />
          </button>
          {previewIndex > 0 && (
            <button
              className="lightbox-arrow previous"
              onClick={(event) => {
                event.stopPropagation();
                setPreviewId(photos[previewIndex - 1].id);
              }}
              aria-label="Foto anterior"
            >
              <ChevronLeft size={28} />
            </button>
          )}
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={previewPhoto.previewUrl}
              alt={`Foto ampliada ${previewPhoto.name}`}
              width={previewPhoto.width || 1280}
              height={previewPhoto.height || 960}
              sizes="100vw"
              priority
              unoptimized
            />
            <div className="lightbox-footer">
              <span>{previewPhoto.name}</span>
              <button
                className="button"
                disabled={savingPhotoId === previewPhoto.id}
                onClick={() => download(previewPhoto)}
              >
                {savingPhotoId === previewPhoto.id ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Share2 size={18} />
                )}
                {savingPhotoId === previewPhoto.id
                  ? "Preparando foto original…"
                  : "Salvar foto"}
              </button>
            </div>
          </div>
          {previewIndex < photos.length - 1 && (
            <button
              className="lightbox-arrow next"
              onClick={(event) => {
                event.stopPropagation();
                setPreviewId(photos[previewIndex + 1].id);
              }}
              aria-label="Próxima foto"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
      {data && (
        <footer className="gallery-footer">
          <span>
            Galeria disponível até{" "}
            {data.event.expires_at
              ? new Date(data.event.expires_at).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })
              : "a data definida pelo organizador"}
            .
          </span>
          <Link href="/privacidade">Privacidade e LGPD</Link>
        </footer>
      )}
    </main>
  );
}
