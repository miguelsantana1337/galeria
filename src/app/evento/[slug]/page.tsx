import { GalleryFinder } from "@/components/gallery-finder";

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) { return <GalleryFinder slug={(await params).slug} />; }
