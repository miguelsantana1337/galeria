import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(3).max(100),
  event_date: z.union([z.string().date(), z.literal("")]).nullable(),
  description: z.string().max(800).nullable(),
  welcome_message: z.string().max(500).nullable(),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  whatsapp_url: z.union([z.string().url(), z.literal("")]).nullable(),
  instagram_url: z.union([z.string().url(), z.literal("")]).nullable(),
  retention_days: z.number().int().min(1).max(365),
  banner_path: z.string().max(500).nullable(),
  organizer_logos: z.array(z.string().max(500)).max(5),
});

export async function PATCH(
  request: Request,
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
  const { data: ownedEvent } = await supabase
    .from("events")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!ownedEvent)
    return NextResponse.json(
      { error: "Evento não encontrado para esta conta." },
      { status: 404 },
    );
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revise os dados informados." },
      { status: 400 },
    );
  if (
    (parsed.data.banner_path &&
      !parsed.data.banner_path.startsWith(`${id}/branding/`)) ||
    parsed.data.organizer_logos.some(
      (path) => !path.startsWith(`${id}/branding/`),
    )
  )
    return NextResponse.json(
      { error: "Arquivos de identidade inválidos." },
      { status: 400 },
    );
  const values = {
    ...parsed.data,
    event_date: parsed.data.event_date || null,
    description: parsed.data.description || null,
    whatsapp_url: parsed.data.whatsapp_url || null,
    instagram_url: parsed.data.instagram_url || null,
    expires_at: new Date(
      Date.now() + parsed.data.retention_days * 86400000,
    ).toISOString(),
  };
  const { data: saved, error } = await createSupabaseAdminClient()
    .from("events")
    .update(values)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("description,banner_path,organizer_logos,expires_at,updated_at")
    .single();
  return error || !saved
    ? NextResponse.json(
        { error: "Não foi possível confirmar o salvamento." },
        { status: 400 },
      )
    : NextResponse.json({ ok: true, event: saved });
}
