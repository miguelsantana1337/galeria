"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CopyPlus,
  ExternalLink,
  Images,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";

type DashboardEvent = {
  id: string;
  name: string;
  status: string;
  photo_count: number;
  event_date: string | null;
  expires_at: string | null;
  updated_at: string;
  banner_url: string | null;
};

const labels: Record<string, string> = {
  draft: "Rascunho",
  processing: "Processando",
  published: "Publicado",
  archived: "Arquivado",
  expired: "Expirado",
};

function eventState(event: DashboardEvent) {
  if (event.expires_at && new Date(event.expires_at) <= new Date())
    return "expired";
  return event.status;
}

function formatDate(value: string | null) {
  if (!value) return "Data a definir";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export function EventsDashboard({ events }: { events: DashboardEvent[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [order, setOrder] = useState("recent");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return events
      .filter(
        (event) =>
          (!normalized ||
            event.name.toLocaleLowerCase("pt-BR").includes(normalized)) &&
          (filter === "all" || eventState(event) === filter),
      )
      .sort((a, b) => {
        if (order === "name") return a.name.localeCompare(b.name, "pt-BR");
        if (order === "event")
          return (b.event_date || "").localeCompare(a.event_date || "");
        return b.updated_at.localeCompare(a.updated_at);
      });
  }, [events, filter, order, query]);
  const totals = {
    all: events.length,
    published: events.filter((event) => eventState(event) === "published")
      .length,
    draft: events.filter((event) => eventState(event) === "draft").length,
    photos: events.reduce((sum, event) => sum + event.photo_count, 0),
  };

  async function duplicate(event: DashboardEvent) {
    setDuplicating(event.id);
    setError("");
    const response = await fetch(`/api/events/${event.id}/duplicate`, {
      method: "POST",
    });
    const body = await response.json();
    if (response.ok) router.push(`/painel/eventos/${body.id}`);
    else {
      setDuplicating(null);
      setError(body.error || "Não foi possível duplicar o evento.");
    }
  }

  return (
    <>
      <section className="event-overview" aria-label="Resumo dos eventos">
        <div>
          <strong>{totals.all}</strong>
          <span>eventos</span>
        </div>
        <div>
          <strong>{totals.published}</strong>
          <span>publicados</span>
        </div>
        <div>
          <strong>{totals.draft}</strong>
          <span>rascunhos</span>
        </div>
        <div>
          <strong>{totals.photos}</strong>
          <span>fotos</span>
        </div>
      </section>
      <section className="event-browser">
        <div className="event-toolbar">
          <label className="event-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar evento"
              aria-label="Buscar evento"
            />
          </label>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filtrar eventos"
          >
            <option value="all">Todos</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
            <option value="processing">Processando</option>
            <option value="expired">Expirados</option>
            <option value="archived">Arquivados</option>
          </select>
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value)}
            aria-label="Ordenar eventos"
          >
            <option value="recent">Atualizados recentemente</option>
            <option value="event">Data do evento</option>
            <option value="name">Nome</option>
          </select>
          <Link className="button event-create" href="/painel/eventos/novo">
            <Plus size={18} /> Novo evento
          </Link>
        </div>
        {error && <p className="error">{error}</p>}
        {filtered.length ? (
          <div className="event-card-grid">
            {filtered.map((event) => {
              const state = eventState(event);
              return (
                <article className="event-card" key={event.id}>
                  <Link
                    href={`/painel/eventos/${event.id}`}
                    className="event-card-cover"
                    aria-label={`Editar ${event.name}`}
                  >
                    {event.banner_url ? (
                      <Image
                        src={event.banner_url}
                        alt=""
                        fill
                        sizes="(max-width: 700px) 100vw, 50vw"
                        unoptimized
                      />
                    ) : (
                      <span>
                        <Images size={30} />
                        Minha Galeria
                      </span>
                    )}
                    <span className={`event-state ${state}`}>
                      {labels[state] || state}
                    </span>
                  </Link>
                  <div className="event-card-body">
                    <div>
                      <span className="event-date">
                        <CalendarDays size={15} />{" "}
                        {formatDate(event.event_date)}
                      </span>
                      <h2>{event.name}</h2>
                      <p>{event.photo_count} fotos</p>
                    </div>
                    <div className="event-card-actions">
                      <Link
                        className="button secondary"
                        href={`/painel/eventos/${event.id}`}
                      >
                        Editar <ExternalLink size={15} />
                      </Link>
                      <button
                        className="event-duplicate"
                        disabled={duplicating === event.id}
                        onClick={() => void duplicate(event)}
                      >
                        {duplicating === event.id ? (
                          <LoaderCircle className="spin" size={17} />
                        ) : (
                          <CopyPlus size={17} />
                        )}
                        {duplicating === event.id
                          ? "Duplicando…"
                          : "Duplicar configurações"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="events-empty">
            <Search />
            <strong>Nenhum evento encontrado.</strong>
            <span>Altere a busca ou escolha outro filtro.</span>
          </div>
        )}
      </section>
    </>
  );
}
