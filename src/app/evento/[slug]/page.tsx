import { GalleryFinder } from "@/components/gallery-finder";

export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  return (
    <GalleryFinder
      slug={(await params).slug}
      accessKey={(await searchParams).k || ""}
    />
  );
}
