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
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Images,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { extractFaces, getFaceEngine } from "@/lib/face-engine";

type FaceRecord = { photo_id: string; descriptor: number[] };
type PhotoMeta = { id: string; taken_at: string | null };
type EventData = {
  event: {
    name: string;
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
  downloadUrl: string;
};
type Mode = "gallery" | "selfie" | "matches";

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
    [mode, setMode] = useState<Mode>("gallery"),
    [hour, setHour] = useState("all"),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Abrindo a galeria…"),
    [error, setError] = useState(
      accessKey
        ? ""
        : "Este link está incompleto. Peça o link privado ao fotógrafo.",
    ),
    [consent, setConsent] = useState(false);
  const announced = useRef(false);
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

  const loadPhotos = useCallback(
    async (ids: string[]) => {
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
        setPhotos((await response.json()).photos || []);
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
        void loadPhotos(eventData.photos.map((photo) => photo.id));
        if (!announced.current) {
          announced.current = true;
          void activity(slug, accessKey, "view");
        }
      })
      .catch((e) => setError(e.message));
  }, [accessKey, slug, loadPhotos]);

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
    await loadPhotos(ids);
  }
  async function find(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !data || !consent) return;
    setBusy(true);
    setError("");
    void activity(slug, accessKey, "selfie", undefined, true);
    try {
      setStatus("Lendo seu rosto…");
      const analysis = await extractFaces(file, 1);
      if (analysis.faces.length !== 1)
        throw new Error(
          "Não encontrei um rosto nítido. Use uma selfie frontal, com boa luz e sem outras pessoas.",
        );
      setStatus("Procurando você nas fotos…");
      const faceRecords = data.faces.length
        ? data.faces
        : (((
            await fetch(
              `/api/public/events/${slug}?k=${encodeURIComponent(accessKey)}&faces=1`,
              { cache: "no-store" },
            ).then((response) => response.json())
          ).faces || []) as FaceRecord[]);
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
      await loadPhotos(ids);
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
  function download(photo: ResultPhoto) {
    void activity(slug, accessKey, "download", 1);
    window.open(photo.downloadUrl, "_blank", "noopener,noreferrer");
  }
  if (error && !data)
    return (
      <main className="finder-shell">
        <div className="finder-card">
          <span className="brand">
            Fotos do Santana<span className="brand-dot">.</span>
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
          Fotos do Santana<span className="brand-dot">.</span>
        </Link>
        <span className="privacy">
          <LockKeyhole size={14} /> Link privado
        </span>
      </header>
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
                fotos neste evento.
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
                capture="user"
                disabled={busy || !data || !consent}
                onChange={find}
              />
            </label>
            {!consent && (
              <p className="privacy-note">
                Marque a autorização acima para liberar a selfie.
              </p>
            )}
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
            </div>
            {hours.length === 0 && data && (
              <p className="timeline-note">
                As fotos deste evento não possuem horário da câmera. Elas
                continuam disponíveis abaixo.
              </p>
            )}
            {busy && (
              <div className="gallery-loading">
                <LoaderCircle className="spin" />
                <span>{status || "Carregando prévias…"}</span>
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
                <article key={photo.id} className="photo-card">
                  <Image
                    src={photo.previewUrl}
                    alt={`Foto ${photo.name}`}
                    width={720}
                    height={540}
                    loading="lazy"
                    sizes="(max-width: 600px) 100vw, (max-width: 820px) 50vw, 33vw"
                    unoptimized
                  />
                  <button className="download" onClick={() => download(photo)}>
                    <Download size={17} /> Baixar original
                  </button>
                </article>
              ))}
            </div>
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
    </main>
  );
}
