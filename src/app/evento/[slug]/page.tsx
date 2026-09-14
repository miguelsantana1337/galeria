import type { Metadata } from "next";
import { GalleryFinder } from "@/components/gallery-finder";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PublicEventParams = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
};

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

function metaDescription(description: string | null, eventName: string) {
  const text =
    description?.replace(/\s+/g, " ").trim() ||
    `Veja, encontre e baixe as fotos de ${eventName}.`;
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
}

export async function generateMetadata({
  params,
  searchParams,
}: PublicEventParams): Promise<Metadata> {
  const [{ slug }, { k = "" }] = await Promise.all([params, searchParams]);
  const unavailable: Metadata = {
    title: "Galeria indisponível | Minha Galeria",
    description: "Este link de galeria não está disponível.",
    robots: { index: false, follow: false },
  };
  if (!k) return unavailable;

  const { data: event } = await createSupabaseAdminClient()
    .from("events")
    .select("name,description,banner_path,expires_at,updated_at")
    .eq("slug", slug)
    .eq("share_token", k)
    .eq("status", "published")
    .single();
  if (
    !event ||
    (event.expires_at && new Date(event.expires_at).getTime() <= Date.now())
  )
    return unavailable;

  const baseUrl = siteUrl();
  const title = event.name;
  const description = metaDescription(event.description, event.name);
  const eventUrl = `${baseUrl}/evento/${encodeURIComponent(slug)}?k=${encodeURIComponent(k)}`;
  const coverUrl = event.banner_path
    ? `${baseUrl}/api/public/events/${encodeURIComponent(slug)}/cover?k=${encodeURIComponent(k)}&v=${encodeURIComponent(event.updated_at)}`
    : null;
  const images = coverUrl
    ? [{ url: coverUrl, width: 1200, height: 630, alt: title }]
    : undefined;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Minha Galeria",
      url: eventUrl,
      title,
      description,
      images,
    },
    twitter: {
      card: coverUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: coverUrl ? [coverUrl] : undefined,
    },
  };
}

export default async function PublicEventPage({
  params,
  searchParams,
}: PublicEventParams) {
  return (
    <GalleryFinder
      slug={(await params).slug}
      accessKey={(await searchParams).k || ""}
    />
  );
}
