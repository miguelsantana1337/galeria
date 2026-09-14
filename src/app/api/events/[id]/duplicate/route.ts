import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugifyEventName } from "@/lib/slug";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 401 },
    );

  const { data: source } = await supabase
    .from("events")
    .select(
      "name,description,welcome_message,brand_color,whatsapp_url,instagram_url,retention_days,match_threshold,banner_path,organizer_logos",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!source)
    return NextResponse.json(
      { error: "Evento não encontrado." },
      { status: 404 },
    );

  const admin = createSupabaseAdminClient();
  const name = `Cópia de ${source.name}`.slice(0, 100);
  const baseSlug = slugifyEventName(name);
  const { data: collisions } = await admin
    .from("events")
    .select("slug")
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);
  const used = new Set((collisions || []).map((event) => event.slug));
  let slug = baseSlug;
  let suffix = 2;
  while (used.has(slug)) slug = `${baseSlug}-${suffix++}`;

  const { data: duplicated, error: createError } = await admin
    .from("events")
    .insert({
      owner_id: user.id,
      name,
      slug,
      event_date: null,
      status: "draft",
      description: source.description,
      welcome_message: source.welcome_message,
      brand_color: source.brand_color,
      whatsapp_url: source.whatsapp_url,
      instagram_url: source.instagram_url,
      retention_days: source.retention_days,
      match_threshold: source.match_threshold,
      expires_at: new Date(
        Date.now() + source.retention_days * 86400000,
      ).toISOString(),
    })
    .select("id")
    .single();
  if (createError || !duplicated)
    return NextResponse.json(
      { error: "Não foi possível duplicar o evento." },
      { status: 400 },
    );

  const sourceLogos = Array.isArray(source.organizer_logos)
    ? source.organizer_logos.filter(
        (path): path is string => typeof path === "string",
      )
    : [];
  const assets = [source.banner_path, ...sourceLogos].filter(
    (path): path is string => Boolean(path),
  );
  const copied: string[] = [];
  try {
    for (const [index, sourcePath] of assets.entries()) {
      const extension = sourcePath.split(".").pop()?.slice(0, 8) || "jpg";
      const kind =
        sourcePath === source.banner_path ? "banner" : `logo-${index}`;
      const destination = `${duplicated.id}/branding/${kind}-${crypto.randomUUID()}.${extension}`;
      const { error } = await admin.storage
        .from("event-photos")
        .copy(sourcePath, destination);
      if (error) throw error;
      copied.push(destination);
    }
    const bannerPath = source.banner_path ? copied[0] : null;
    const logoPaths = source.banner_path ? copied.slice(1) : copied;
    const { error } = await admin
      .from("events")
      .update({ banner_path: bannerPath, organizer_logos: logoPaths })
      .eq("id", duplicated.id);
    if (error) throw error;
  } catch {
    if (copied.length) await admin.storage.from("event-photos").remove(copied);
    await admin.from("events").delete().eq("id", duplicated.id);
    return NextResponse.json(
      { error: "Não foi possível copiar a identidade visual." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: duplicated.id }, { status: 201 });
}
