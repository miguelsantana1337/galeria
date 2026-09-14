import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugifyEventName } from "@/lib/slug";

const schema = z.object({
  name: z.string().trim().min(3).max(100),
  eventDate: z.string().optional(),
});
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 401 },
    );
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revise os dados do evento." },
      { status: 400 },
    );
  const baseSlug = slugifyEventName(parsed.data.name);
  const { data: collisions } = await supabase
    .from("events")
    .select("slug")
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);
  const used = new Set((collisions || []).map((event) => event.slug));
  let slug = baseSlug;
  let suffix = 2;
  while (used.has(slug)) slug = `${baseSlug}-${suffix++}`;
  const { data, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      slug,
      event_date: parsed.data.eventDate || null,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      { error: "Não foi possível criar o evento." },
      { status: 400 },
    );
  return NextResponse.json(data, { status: 201 });
}
